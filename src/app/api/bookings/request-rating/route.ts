import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendRatingRequest } from "@/lib/email/rating";

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

  // Check if rating already exists for this booking
  const { data: existing } = await supabase
    .from("ratings")
    .select("id")
    .eq("booking_id", bookingId)
    .single();

  if (existing) {
    return NextResponse.json({ already_exists: true });
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, trainer_id, client_id, clients(email, full_name), trainers(full_name)")
    .eq("id", bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const clientRaw = booking.clients;
  const trainerRaw = booking.trainers;
  const client = (Array.isArray(clientRaw) ? clientRaw[0] : clientRaw) as { email: string; full_name: string } | null;
  const trainer = (Array.isArray(trainerRaw) ? trainerRaw[0] : trainerRaw) as { full_name: string } | null;

  if (!client?.email || !trainer?.full_name) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  // Create rating entry with score 0 (pending)
  const { data: rating } = await supabase
    .from("ratings")
    .insert({
      booking_id: bookingId,
      trainer_id: booking.trainer_id,
      client_id: booking.client_id,
      score: 0,
    })
    .select("token")
    .single();

  if (!rating) {
    return NextResponse.json({ error: "Failed to create rating" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    await sendRatingRequest({
      to: client.email,
      trainerName: trainer.full_name,
      ratingToken: (rating as { token: string }).token,
      appUrl,
    });
    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("Failed to send rating email:", err);
    return NextResponse.json({ error: "Email failed" }, { status: 500 });
  }
}
