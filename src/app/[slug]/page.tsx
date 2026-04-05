import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Trainer, AvailabilityRule } from "@/types/database";
import { PublicBookingView } from "@/components/booking/public-booking-view";
import { ReviewBadge } from "@/components/review-badge";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: trainer } = await supabase
    .from("trainers")
    .select("full_name, bio, city, specialties")
    .eq("slug", slug)
    .single();

  if (!trainer) return { title: "Trainer Not Found" };

  const t = trainer as { full_name: string; bio: string | null; city: string | null; specialties: string[] | null };
  const title = `${t.full_name} — Personal Trainer${t.city ? ` in ${t.city}` : ""}`;
  const description = t.bio || `Book a training session with ${t.full_name}.${t.specialties?.length ? ` Specialties: ${t.specialties.join(", ")}.` : ""}`;

  return {
    title,
    description,
    openGraph: { title, description, type: "profile" },
  };
}

export default async function PublicBookingPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id, full_name, slug, timezone, buffer_minutes, avatar_url, bio, city, specialties, brand_primary_color, brand_hide_logo, tier")
    .eq("slug", slug)
    .single();

  if (!trainer) notFound();

  const t = trainer as Trainer;

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("trainer_id", t.id)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");

  // Get average rating
  const { data: ratings } = await supabase
    .from("ratings")
    .select("score")
    .eq("trainer_id", t.id)
    .gt("score", 0);

  const ratingsList = (ratings || []) as { score: number }[];
  const avgRating = ratingsList.length > 0
    ? ratingsList.reduce((sum, r) => sum + r.score, 0) / ratingsList.length
    : 0;

  const isPaid = t.tier === "paid";
  const brandColor = isPaid && t.brand_primary_color ? t.brand_primary_color : "#0f172a";
  const hideLogo = isPaid && t.brand_hide_logo;

  return (
    <div className="min-h-full bg-muted/30">
      <div className="mx-auto max-w-lg px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-white text-2xl font-bold mb-3"
            style={{ backgroundColor: brandColor }}
          >
            {t.full_name.charAt(0)}
          </div>
          <h1 className="text-2xl font-bold">{t.full_name}</h1>
          {t.city && (
            <p className="text-sm text-muted-foreground">{t.city}</p>
          )}
          {t.bio && (
            <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">{t.bio}</p>
          )}
          {t.specialties && t.specialties.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {t.specialties.map((s) => (
                <span
                  key={s}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {avgRating > 0 && (
            <ReviewBadge rating={avgRating} count={ratingsList.length} />
          )}
        </div>

        <PublicBookingView
          trainer={t}
          rules={(rules || []) as AvailabilityRule[]}
        />

        {!hideLogo && (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Powered by <span className="font-semibold">FitBook</span>
          </p>
        )}
      </div>
    </div>
  );
}
