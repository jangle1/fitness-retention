import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  const supabase = getServiceClient();

  const { data: client } = await supabase
    .from("clients")
    .select("full_name, email, trainer_id")
    .eq("id", clientId)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const c = client as { full_name: string; email: string; trainer_id: string };

  const { data: trainer } = await supabase
    .from("trainers")
    .select("full_name, tier")
    .eq("id", c.trainer_id)
    .single();

  if (!trainer || (trainer as { tier: string }).tier !== "paid") {
    return NextResponse.json({ error: "Reports require a paid plan" }, { status: 403 });
  }

  // Get all bookings for this client
  const { data: bookings } = await supabase
    .from("bookings")
    .select("starts_at, ends_at, status, session_notes")
    .eq("client_id", clientId)
    .eq("trainer_id", c.trainer_id)
    .order("starts_at", { ascending: true });

  const b = (bookings || []) as { starts_at: string; ends_at: string; status: string; session_notes: string | null }[];

  const attended = b.filter((x) => x.status === "attended");
  const cancelled = b.filter((x) => x.status === "cancelled");
  const noShows = b.filter((x) => x.status === "no_show");

  // Calculate consistency (sessions per week over last 8 weeks)
  const eightWeeksAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);
  const recentAttended = attended.filter((x) => new Date(x.starts_at) >= eightWeeksAgo);
  const consistencyScore = Math.min(100, Math.round((recentAttended.length / 8) * 100));

  // Get packages
  const { data: packages } = await supabase
    .from("packages")
    .select("name, total_sessions, used_sessions, status")
    .eq("client_id", clientId);

  // Collect session notes
  const notesHistory = attended
    .filter((x) => x.session_notes)
    .slice(-5)
    .map((x) => ({
      date: new Date(x.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      notes: x.session_notes,
    }));

  return NextResponse.json({
    clientName: c.full_name,
    trainerName: (trainer as { full_name: string }).full_name,
    summary: {
      totalSessions: b.length,
      attended: attended.length,
      cancelled: cancelled.length,
      noShows: noShows.length,
      attendanceRate: b.length > 0 ? Math.round((attended.length / b.length) * 100) : 0,
      consistencyScore,
      firstSession: attended.length > 0 ? attended[0].starts_at : null,
      lastSession: attended.length > 0 ? attended[attended.length - 1].starts_at : null,
    },
    packages: packages || [],
    recentNotes: notesHistory,
  });
}
