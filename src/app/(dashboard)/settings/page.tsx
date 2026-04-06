"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { Trainer, AvailabilityRule } from "@/types/database";
import { QRCodeDisplay } from "@/components/qr-code";
import { getEmbedCode } from "@/components/review-badge";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_MAP = [1, 2, 3, 4, 5, 6, 0]; // Mon=1...Sun=0

const SPECIALTY_OPTIONS = [
  "Strength Training", "Cardio", "HIIT", "Yoga",
  "Pilates", "Rehabilitation", "Stretching", "Boxing",
  "CrossFit", "Calisthenics", "Mobility", "Nutrition",
];

export default function SettingsPage() {
  const router = useRouter();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [sessionDuration, setSessionDuration] = useState(60);
  const [bufferMinutes, setBufferMinutes] = useState(10);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: t } = await supabase.from("trainers").select("*").eq("supabase_auth_id", user.id).single();
      if (t) {
        const tr = t as Trainer;
        setTrainer(tr);
        setFullName(tr.full_name);
        setSlug(tr.slug);
        setBio(tr.bio || "");
        setCity(tr.city || "");
        setSpecialties(tr.specialties || []);
        setBufferMinutes(tr.buffer_minutes);
      }

      const { data: r } = await supabase
        .from("availability_rules").select("*")
        .eq("trainer_id", t?.id)
        .order("day_of_week").order("start_time");
      if (r) {
        setRules(r as AvailabilityRule[]);
        const days = [...new Set((r as AvailabilityRule[]).map((rule) => rule.day_of_week))];
        if (days.length > 0) setActiveDays(days);
      }
    }
    load();
  }, []);

  function toggleSpecialty(s: string) {
    setSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function toggleDay(day: number) {
    setActiveDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort());
  }

  async function handleSave() {
    if (!trainer) return;
    setSaving(true);
    setMessage(null);

    const supabase = createClient();

    // Update trainer profile
    const updateData: Record<string, unknown> = {
      full_name: fullName,
      buffer_minutes: bufferMinutes,
      bio: bio || null,
      city: city || null,
      specialties: specialties.length > 0 ? specialties : null,
    };

    if (trainer.tier === "paid") {
      updateData.brand_primary_color = trainer.brand_primary_color;
      updateData.brand_hide_logo = trainer.brand_hide_logo;
    }

    const { error } = await supabase.from("trainers").update(updateData).eq("id", trainer.id);

    // Update availability rules
    await supabase.from("availability_rules").delete().eq("trainer_id", trainer.id);
    const newRules = activeDays.map((day) => ({
      trainer_id: trainer.id,
      day_of_week: day,
      start_time: "08:00",
      end_time: "17:00",
    }));
    if (newRules.length > 0) {
      await supabase.from("availability_rules").insert(newRules);
    }

    setSaving(false);
    if (!error) {
      setTrainer({ ...trainer, ...updateData } as Trainer);
      setMessage("Saved!");
      setTimeout(() => setMessage(null), 2000);
    } else {
      setMessage(error.message);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!trainer) return null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const bookingUrl = `${appUrl}/${trainer.slug}`;
  const isPaid = trainer.tier === "paid";

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 md:pt-20 space-y-8 pb-24 md:pb-8">
      <h1 className="text-2xl font-extrabold">Settings</h1>

      {/* PROFILE section */}
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Profile</h2>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Full name</label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="h-14 rounded-2xl bg-card border-border text-base px-5"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Slug (URL)</label>
          <div className="flex items-center h-14 rounded-2xl bg-card border border-border overflow-hidden">
            <span className="text-sm text-muted-foreground pl-5 shrink-0">fitbook.pl/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="flex-1 h-full bg-transparent text-base outline-none px-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bio</label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A few words about you and your methods..."
            rows={3}
            className="rounded-2xl bg-card border-border px-5 py-4"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">City</label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Warsaw"
            className="h-14 rounded-2xl bg-card border-border text-base px-5"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Specializations</label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTY_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialty(s)}
                className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all ${
                  specialties.includes(s)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Separator className="bg-border" />

      {/* AVAILABILITY section */}
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Availability</h2>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active days</label>
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map((day, i) => {
              const dayNum = DAY_MAP[i];
              const isActive = activeDays.includes(dayNum);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(dayNum)}
                  className={`h-12 rounded-2xl text-sm font-bold border transition-all ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Session length</label>
            <div className="grid grid-cols-3 gap-2">
              {[45, 60, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSessionDuration(d)}
                  className={`h-12 rounded-2xl text-sm font-bold border transition-all ${
                    sessionDuration === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  {d}&apos;
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Break</label>
            <div className="grid grid-cols-3 gap-2">
              {[0, 10, 15].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBufferMinutes(b)}
                  className={`h-12 rounded-2xl text-sm font-bold border transition-all ${
                    bufferMinutes === b
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Separator className="bg-border" />

      {/* QR Code & Booking Link */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Booking Link</h2>
        </div>

        <div className="flex items-center gap-2">
          <Input value={bookingUrl} readOnly className="h-12 rounded-2xl bg-card border-border font-mono text-sm px-5" />
          <Button variant="outline" size="sm" className="rounded-xl h-12 px-4 shrink-0" onClick={() => navigator.clipboard.writeText(bookingUrl)}>
            Copy
          </Button>
        </div>

        <QRCodeDisplay url={bookingUrl} size={160} />

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Embed review badge</label>
          <div className="flex items-center gap-2">
            <Input value={getEmbedCode(trainer.slug, appUrl)} readOnly className="h-12 rounded-2xl bg-card border-border font-mono text-xs px-5" />
            <Button variant="outline" size="sm" className="rounded-xl h-12 px-4 shrink-0" onClick={() => { navigator.clipboard.writeText(getEmbedCode(trainer.slug, appUrl)); setEmbedCopied(true); setTimeout(() => setEmbedCopied(false), 2000); }}>
              {embedCopied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>
      </div>

      {/* Upgrade CTA for free tier */}
      {!isPaid && (
        <>
          <Separator className="bg-border" />
          <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 text-center space-y-3">
            <h2 className="text-lg font-bold">Upgrade to Pro</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Unlimited clients, SMS reminders, nudges, progress reports, custom branding, and referral network.
            </p>
            <p className="text-2xl font-bold">20 PLN<span className="text-sm font-normal text-muted-foreground">/month</span></p>
            <Button size="lg" className="rounded-2xl">Upgrade Now</Button>
          </div>
        </>
      )}

      {/* Save + Sign out */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          className="rounded-2xl text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          Sign out
        </Button>
        <Button className="rounded-2xl px-8 font-bold" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : message || "Save"}
        </Button>
      </div>
    </div>
  );
}
