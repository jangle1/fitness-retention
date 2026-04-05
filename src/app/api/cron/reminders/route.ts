import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendBookingReminder } from "@/lib/email";

// Use service role client to bypass RLS
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  // Verify cron secret in production
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();

  // Find bookings starting in the next 24-25 hours that haven't had reminders sent
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, trainer_id, client_id, clients(email, full_name), trainers(full_name)")
    .eq("status", "booked")
    .eq("reminder_sent", false)
    .gte("starts_at", in24h.toISOString())
    .lt("starts_at", in25h.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;

  for (const booking of bookings || []) {
    const clientRaw = booking.clients;
    const trainerRaw = booking.trainers;
    const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { email: string; full_name: string } | null;
    const trainer = (Array.isArray(trainerRaw) ? trainerRaw[0] : trainerRaw) as { full_name: string } | null;

    if (!client?.email || !trainer?.full_name) continue;

    const startsAt = new Date(booking.starts_at);

    try {
      await sendBookingReminder({
        to: client.email,
        trainerName: trainer.full_name,
        date: startsAt.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
        time: startsAt.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });

      // Mark reminder as sent
      await supabase
        .from("bookings")
        .update({ reminder_sent: true })
        .eq("id", booking.id);

      // Log to event ledger
      await supabase.from("booking_events").insert({
        booking_id: booking.id,
        trainer_id: booking.trainer_id,
        client_id: booking.client_id,
        event_type: "reminder_sent",
      });

      sent++;
    } catch (err) {
      console.error(`Failed to send reminder for booking ${booking.id}:`, err);
    }
  }

  return NextResponse.json({ sent, total: bookings?.length || 0 });
}
