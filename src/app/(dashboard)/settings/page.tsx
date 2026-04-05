"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Trainer, AvailabilityRule } from "@/types/database";
import { AvailabilityEditor } from "@/components/availability-editor";

export default function SettingsPage() {
  const router = useRouter();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: t } = await supabase
        .from("trainers")
        .select("*")
        .eq("supabase_auth_id", user.id)
        .single();
      if (t) setTrainer(t as Trainer);

      const { data: r } = await supabase
        .from("availability_rules")
        .select("*")
        .eq("trainer_id", t?.id)
        .order("day_of_week")
        .order("start_time");
      if (r) setRules(r as AvailabilityRule[]);
    }
    load();
  }, []);

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!trainer) return;
    setSaving(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const supabase = createClient();

    const { error } = await supabase
      .from("trainers")
      .update({
        full_name: formData.get("fullName") as string,
        buffer_minutes: parseInt(formData.get("bufferMinutes") as string, 10),
      })
      .eq("id", trainer.id);

    setSaving(false);
    setMessage(error ? error.message : "Saved!");
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!trainer) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 md:pt-20 space-y-6 pb-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Profile</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" name="fullName" defaultValue={trainer.full_name} required />
            </div>
            <div className="space-y-2">
              <Label>Booking URL</Label>
              <p className="text-sm text-muted-foreground">fitbook.app/{trainer.slug}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bufferMinutes">Buffer between sessions (min)</Label>
              <Input
                id="bufferMinutes"
                name="bufferMinutes"
                type="number"
                min={0}
                max={120}
                defaultValue={trainer.buffer_minutes}
                required
              />
            </div>
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Availability</h2>
          <p className="text-sm text-muted-foreground">Set your weekly working hours. Clients can only book during these times.</p>
        </CardHeader>
        <CardContent>
          <AvailabilityEditor trainerId={trainer.id} initialRules={rules} />
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Google Calendar</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {trainer.google_refresh_token
              ? "Connected. Your bookings sync with Google Calendar."
              : "Not connected. Sign in with Google to enable 2-way calendar sync."}
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="destructive" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
