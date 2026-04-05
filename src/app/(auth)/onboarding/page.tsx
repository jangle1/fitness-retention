"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Warsaw",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get("fullName") as string;
    const slug = (formData.get("slug") as string).toLowerCase().trim();
    const timezone = formData.get("timezone") as string;
    const bufferMinutes = parseInt(formData.get("bufferMinutes") as string, 10);

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError("URL slug can only contain lowercase letters, numbers, and hyphens.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from("trainers")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      setError("This URL is already taken. Try a different one.");
      setLoading(false);
      return;
    }

    // Create trainer profile
    const { error: insertError } = await supabase.from("trainers").insert({
      supabase_auth_id: user.id,
      email: user.email!,
      full_name: fullName,
      slug,
      timezone,
      buffer_minutes: bufferMinutes,
      avatar_url: user.user_metadata?.avatar_url || null,
    });

    if (insertError) {
      console.error("Trainer insert error:", insertError);
      setError(`Error: ${insertError.message}`);
      setLoading(false);
      return;
    }

    router.push("/calendar");
  }

  // Generate slug suggestion from name
  function suggestSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Set up your profile</h1>
          <p className="text-sm text-muted-foreground">
            This creates your public booking page
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                placeholder="Jane Smith"
                required
                onChange={(e) => {
                  const slugInput = document.getElementById("slug") as HTMLInputElement;
                  if (slugInput && !slugInput.dataset.touched) {
                    slugInput.value = suggestSlug(e.target.value);
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Booking URL</Label>
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  fitbook.app/
                </span>
                <Input
                  id="slug"
                  name="slug"
                  placeholder="jane-smith"
                  required
                  pattern="[a-z0-9-]+"
                  title="Lowercase letters, numbers, and hyphens only"
                  onKeyDown={(e) => {
                    (e.target as HTMLInputElement).dataset.touched = "true";
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                name="timezone"
                defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone}
                className="flex h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bufferMinutes">Buffer between sessions (minutes)</Label>
              <Input
                id="bufferMinutes"
                name="bufferMinutes"
                type="number"
                min={0}
                max={120}
                defaultValue={30}
                required
              />
              <p className="text-xs text-muted-foreground">
                Rest or travel time blocked after each session
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create my booking page"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
