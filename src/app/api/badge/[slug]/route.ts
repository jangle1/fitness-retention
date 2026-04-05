import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Returns an SVG badge showing the trainer's rating
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = getServiceClient();

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id, full_name")
    .eq("slug", slug)
    .single();

  if (!trainer) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: ratings } = await supabase
    .from("ratings")
    .select("score")
    .eq("trainer_id", trainer.id)
    .gt("score", 0);

  const list = (ratings || []) as { score: number }[];
  const avg = list.length > 0
    ? (list.reduce((s, r) => s + r.score, 0) / list.length).toFixed(1)
    : "0.0";
  const count = list.length;

  const stars = Array.from({ length: 5 }, (_, i) => {
    const filled = i < Math.round(Number(avg));
    return `<text x="${18 + i * 16}" y="18" font-size="14" fill="${filled ? "#eab308" : "#d1d5db"}">★</text>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="30" viewBox="0 0 200 30">
    <rect width="200" height="30" rx="15" fill="#f4f4f5" stroke="#e4e4e7" stroke-width="1"/>
    ${stars}
    <text x="100" y="19" font-family="system-ui,sans-serif" font-size="11" font-weight="600" fill="#18181b">${avg}</text>
    <text x="120" y="19" font-family="system-ui,sans-serif" font-size="10" fill="#71717a">(${count})</text>
    <text x="150" y="19" font-family="system-ui,sans-serif" font-size="9" fill="#a1a1aa">FitBook</text>
  </svg>`;

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
