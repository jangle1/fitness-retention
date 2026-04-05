import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Show rating page data
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = getServiceClient();

  const { data: rating } = await supabase
    .from("ratings")
    .select("id, score, trainer_id, trainers(full_name)")
    .eq("token", token)
    .single();

  if (!rating) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }

  const trainerRaw = rating.trainers;
  const trainer = (Array.isArray(trainerRaw) ? trainerRaw[0] : trainerRaw) as { full_name: string } | null;

  return NextResponse.json({
    rated: rating.score > 0,
    trainerName: trainer?.full_name,
  });
}

// POST: Submit rating
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { score, comment } = await request.json();

  if (!score || score < 1 || score > 5) {
    return NextResponse.json({ error: "Score must be 1-5" }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data: rating } = await supabase
    .from("ratings")
    .select("id, score")
    .eq("token", token)
    .single();

  if (!rating) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  if (rating.score > 0) {
    return NextResponse.json({ error: "Already rated" }, { status: 400 });
  }

  await supabase
    .from("ratings")
    .update({ score, comment: comment || null })
    .eq("id", rating.id);

  return NextResponse.json({ success: true });
}
