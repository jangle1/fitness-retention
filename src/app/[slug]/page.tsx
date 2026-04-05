import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Trainer, AvailabilityRule, Booking } from "@/types/database";
import { PublicBookingView } from "@/components/booking/public-booking-view";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id, full_name, slug, timezone, buffer_minutes, avatar_url")
    .eq("slug", slug)
    .single();

  if (!trainer) notFound();

  const { data: rules } = await supabase
    .from("availability_rules")
    .select("*")
    .eq("trainer_id", trainer.id)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time");

  return (
    <div className="min-h-full bg-muted/30">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="text-center mb-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold mb-3">
            {(trainer as { full_name: string }).full_name.charAt(0)}
          </div>
          <h1 className="text-2xl font-bold">{(trainer as { full_name: string }).full_name}</h1>
          <p className="text-sm text-muted-foreground">Book a training session</p>
        </div>

        <PublicBookingView
          trainer={trainer as Trainer}
          rules={(rules || []) as AvailabilityRule[]}
        />
      </div>
    </div>
  );
}
