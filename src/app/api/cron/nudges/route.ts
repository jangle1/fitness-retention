import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  // Get all paid-tier trainers (nudges are a paid feature)
  const { data: trainers } = await supabase
    .from("trainers")
    .select("id")
    .eq("tier", "paid");

  if (!trainers || trainers.length === 0) {
    return NextResponse.json({ nudges_created: 0 });
  }

  let created = 0;
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  for (const trainer of trainers) {
    // Find clients who haven't booked in 14+ days
    const { data: clients } = await supabase
      .from("clients")
      .select("id")
      .eq("trainer_id", trainer.id);

    if (!clients) continue;

    for (const client of clients) {
      // Check last booking
      const { data: lastBooking } = await supabase
        .from("bookings")
        .select("starts_at")
        .eq("client_id", client.id)
        .eq("trainer_id", trainer.id)
        .in("status", ["booked", "attended"])
        .order("starts_at", { ascending: false })
        .limit(1)
        .single();

      if (!lastBooking) continue;

      const lastDate = (lastBooking as { starts_at: string }).starts_at;
      if (lastDate > fourteenDaysAgo) continue;

      // Check no future bookings
      const { data: futureBooking } = await supabase
        .from("bookings")
        .select("id")
        .eq("client_id", client.id)
        .eq("trainer_id", trainer.id)
        .eq("status", "booked")
        .gte("starts_at", new Date().toISOString())
        .limit(1)
        .single();

      if (futureBooking) continue;

      // Check if nudge already exists and not dismissed
      const { data: existingNudge } = await supabase
        .from("nudges")
        .select("id")
        .eq("trainer_id", trainer.id)
        .eq("client_id", client.id)
        .eq("type", "inactive_client")
        .eq("dismissed", false)
        .single();

      if (existingNudge) continue;

      // Create nudge
      await supabase.from("nudges").insert({
        trainer_id: trainer.id,
        client_id: client.id,
        type: "inactive_client",
      });
      created++;
    }
  }

  return NextResponse.json({ nudges_created: created });
}
