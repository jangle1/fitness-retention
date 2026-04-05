import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendBookingConfirmation } from "@/lib/email";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: Request) {
  const { bookingId } = await request.json();
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId required" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, starts_at, trainer_id, client_id, clients(email, full_name), trainers(full_name, slug)")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const clientRaw = booking.clients;
  const trainerRaw = booking.trainers;
  const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { email: string; full_name: string } | null;
  const trainer = (Array.isArray(trainerRaw) ? trainerRaw[0] : trainerRaw) as { full_name: string; slug: string } | null;

  if (!client?.email || !trainer?.full_name) {
    return NextResponse.json({ error: "Missing client or trainer data" }, { status: 400 });
  }

  const startsAt = new Date(booking.starts_at);

  try {
    await sendBookingConfirmation({
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
      slug: trainer.slug,
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("Failed to send confirmation email:", err);
    return NextResponse.json({ error: "Email send failed" }, { status: 500 });
  }
}
