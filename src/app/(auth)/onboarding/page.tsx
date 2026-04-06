"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
  "Europe/London", "Europe/Berlin", "Europe/Warsaw",
  "Asia/Tokyo", "Australia/Sydney",
];

const SPECIALTY_OPTIONS = [
  "Strength Training", "Cardio", "HIIT", "Yoga",
  "Pilates", "Rehabilitation", "Stretching", "Boxing",
  "CrossFit", "Calisthenics", "Mobility", "Nutrition",
];

const STEPS = [
  { num: 1, label: "Profile" },
  { num: 2, label: "Link" },
  { num: 3, label: "Sessions" },
  { num: 4, label: "Done!" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Profile
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  // Step 2: Link
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [timezone, setTimezone] = useState(
    typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/New_York"
  );

  // Step 3: Sessions
  const [sessionDuration, setSessionDuration] = useState(60);
  const [bufferMinutes, setBufferMinutes] = useState(10);

  function suggestSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
  }

  function toggleSpecialty(s: string) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function handleFinish() {
    setLoading(true);
    setError(null);

    const finalSlug = slug.toLowerCase().trim();
    if (!/^[a-z0-9-]+$/.test(finalSlug)) {
      setError("URL slug can only contain lowercase letters, numbers, and hyphens.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: existing } = await supabase
      .from("trainers").select("id").eq("slug", finalSlug).single();

    if (existing) {
      setError("This URL is already taken. Try a different one.");
      setStep(2);
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("trainers").insert({
      supabase_auth_id: user.id,
      email: user.email!,
      full_name: fullName,
      slug: finalSlug,
      timezone,
      buffer_minutes: bufferMinutes,
      bio: bio || null,
      city: city || null,
      specialties: specialties.length > 0 ? specialties : null,
      avatar_url: user.user_metadata?.avatar_url || null,
    });

    if (insertError) {
      setError(`Error: ${insertError.message}`);
      setLoading(false);
      return;
    }

    setStep(4);
    setLoading(false);
    setTimeout(() => router.push("/calendar"), 1500);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col px-6 py-8">
      <div className="mx-auto w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
              <svg className="h-4 w-4 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
              </svg>
            </div>
            <span className="text-base font-bold">FitBook</span>
          </div>
          <span className="text-sm text-muted-foreground">Step {step}/4</span>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-border rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                s.num === step
                  ? "bg-primary text-primary-foreground"
                  : s.num < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}>
                {s.num < step ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : s.num}
              </div>
              <span className={`text-[10px] font-medium ${s.num === step ? "text-primary" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold">Your profile</h2>
              <p className="text-sm text-muted-foreground mt-1">Basic info visible to clients.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Full name</label>
              <Input
                placeholder="Anna Kowalska"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (!slugTouched) setSlug(suggestSlug(e.target.value));
                }}
                className="h-14 rounded-2xl bg-card border-border text-base px-5"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">City</label>
              <Input
                placeholder="Warsaw"
                value={city}
                onChange={(e) => setCity(e.target.value)}
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

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Bio (optional)</label>
              <Textarea
                placeholder="A few words about you and your methods..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="rounded-2xl bg-card border-border px-5 py-4"
              />
            </div>

            <Button
              size="lg"
              className="w-full h-14 rounded-2xl text-base font-bold"
              onClick={() => { if (fullName.trim()) setStep(2); }}
              disabled={!fullName.trim()}
            >
              Next
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Button>
          </div>
        )}

        {/* Step 2: Link */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold">Your booking link</h2>
              <p className="text-sm text-muted-foreground mt-1">This is how clients will find you.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Slug (URL)</label>
              <div className="flex items-center h-14 rounded-2xl bg-card border border-border overflow-hidden">
                <span className="text-sm text-muted-foreground pl-5 shrink-0">fitbook.pl/</span>
                <input
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                  placeholder="anna-kowalska"
                  className="flex-1 h-full bg-transparent text-base outline-none px-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="flex h-14 w-full rounded-2xl border border-border bg-card px-5 text-base outline-none"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="flex-1 h-14 rounded-2xl" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                size="lg"
                className="flex-1 h-14 rounded-2xl text-base font-bold"
                onClick={() => { if (slug.trim()) { setError(null); setStep(3); } }}
                disabled={!slug.trim()}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Sessions */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold">Session settings</h2>
              <p className="text-sm text-muted-foreground mt-1">Configure your default session.</p>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Session length</label>
              <div className="grid grid-cols-3 gap-2">
                {[45, 60, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSessionDuration(d)}
                    className={`h-14 rounded-2xl text-base font-bold border transition-all ${
                      sessionDuration === d
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {d}&apos;
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Break between sessions</label>
              <div className="grid grid-cols-3 gap-2">
                {[0, 10, 15].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBufferMinutes(b)}
                    className={`h-14 rounded-2xl text-base font-bold border transition-all ${
                      bufferMinutes === b
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border text-muted-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3">
              <Button variant="outline" size="lg" className="flex-1 h-14 rounded-2xl" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                size="lg"
                className="flex-1 h-14 rounded-2xl text-base font-bold"
                onClick={handleFinish}
                disabled={loading}
              >
                {loading ? "Creating..." : "Finish"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <div className="text-center py-12 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
              <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold">All set!</h2>
            <p className="text-muted-foreground">Redirecting to your dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}
