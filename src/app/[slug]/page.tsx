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
    .from("trainers").select("full_name, bio, city, specialties").eq("slug", slug).single();

  if (!trainer) return { title: "Trainer Not Found" };
  const t = trainer as { full_name: string; bio: string | null; city: string | null; specialties: string[] | null };
  const title = `${t.full_name} — Personal Trainer${t.city ? ` in ${t.city}` : ""}`;
  const description = t.bio || `Book a training session with ${t.full_name}.${t.specialties?.length ? ` Specialties: ${t.specialties.join(", ")}.` : ""}`;
  return { title, description, openGraph: { title, description, type: "profile" } };
}

export default async function PublicBookingPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id, full_name, slug, timezone, buffer_minutes, avatar_url, bio, city, specialties, brand_primary_color, brand_hide_logo, tier")
    .eq("slug", slug).single();

  if (!trainer) notFound();
  const t = trainer as Trainer;

  const { data: rules } = await supabase
    .from("availability_rules").select("*").eq("trainer_id", t.id).eq("is_active", true).order("day_of_week").order("start_time");

  const { data: ratings } = await supabase.from("ratings").select("score").eq("trainer_id", t.id).gt("score", 0);
  const ratingsList = (ratings || []) as { score: number }[];
  const avgRating = ratingsList.length > 0 ? ratingsList.reduce((sum, r) => sum + r.score, 0) / ratingsList.length : 0;

  const isPaid = t.tier === "paid";
  const hideLogo = isPaid && t.brand_hide_logo;

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-lg px-4 py-8">
        {/* Back + title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center">
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </div>
          <h1 className="text-base font-semibold">Book a Session</h1>
        </div>

        {/* Trainer card */}
        <div className="rounded-2xl border border-border bg-card p-5 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                {t.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={t.avatar_url} alt={t.full_name} className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  t.full_name.split(" ").map(n => n[0]).join("").slice(0, 2)
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{t.full_name}</h2>
              {t.city && (
                <p className="text-sm text-muted-foreground">{t.specialties?.[0] || "Personal Trainer"} · {t.city}</p>
              )}
              <div className="flex items-center gap-3 mt-1">
                {avgRating > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {avgRating.toFixed(1)}
                  </span>
                )}
                {ratingsList.length > 0 && (
                  <span className="text-xs text-muted-foreground">{ratingsList.length} reviews</span>
                )}
              </div>
            </div>
          </div>

          {t.bio && (
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{t.bio}</p>
          )}

          {t.specialties && t.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {t.specialties.map((s) => (
                <span key={s} className="text-xs font-medium px-3 py-1.5 rounded-full border border-border text-muted-foreground">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>

        <PublicBookingView trainer={t} rules={(rules || []) as AvailabilityRule[]} />

        {!hideLogo && (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Powered by <span className="font-bold text-foreground">FitBook</span>
          </p>
        )}
      </div>
    </div>
  );
}
