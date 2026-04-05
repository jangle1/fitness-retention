"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Trainer, AvailabilityRule } from "@/types/database";
import { AvailabilityEditor } from "@/components/availability-editor";
import { QRCodeDisplay } from "@/components/qr-code";
import { getEmbedCode } from "@/components/review-badge";

export default function SettingsPage() {
  const router = useRouter();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);

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

    const updateData: Record<string, unknown> = {
      full_name: formData.get("fullName") as string,
      buffer_minutes: parseInt(formData.get("bufferMinutes") as string, 10),
      bio: (formData.get("bio") as string) || null,
      city: (formData.get("city") as string) || null,
      specialties: (formData.get("specialties") as string)
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean) || null,
    };

    // Paid-only fields
    if (trainer.tier === "paid") {
      updateData.brand_primary_color = (formData.get("brandColor") as string) || "#0f172a";
      updateData.brand_hide_logo = formData.get("hideLogo") === "on";
    }

    const { error } = await supabase
      .from("trainers")
      .update(updateData)
      .eq("id", trainer.id);

    setSaving(false);
    if (!error) {
      setTrainer({ ...trainer, ...updateData } as Trainer);
      setMessage("Saved!");
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
    <div className="mx-auto max-w-2xl px-4 pt-6 md:pt-20 space-y-6 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Badge variant={isPaid ? "default" : "secondary"}>
          {isPaid ? "Pro" : "Free"}
        </Badge>
      </div>

      {/* Booking Link & QR */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Your Booking Link</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input value={bookingUrl} readOnly className="font-mono text-sm" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(bookingUrl);
              }}
            >
              Copy
            </Button>
          </div>
          <QRCodeDisplay url={bookingUrl} size={180} />
          <p className="text-xs text-muted-foreground text-center">
            Print this on business cards, gym posters, or share on social media
          </p>
        </CardContent>
      </Card>

      {/* Review Badge Embed */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Review Badge</h2>
          <p className="text-sm text-muted-foreground">Embed your rating anywhere — website, Instagram linktree, etc.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/badge/${trainer.slug}`} alt="Review badge" />
          </div>
          <div className="relative">
            <Input
              value={getEmbedCode(trainer.slug, appUrl)}
              readOnly
              className="font-mono text-xs pr-16"
            />
            <Button
              variant="outline"
              size="xs"
              className="absolute right-1 top-1"
              onClick={() => {
                navigator.clipboard.writeText(getEmbedCode(trainer.slug, appUrl));
                setEmbedCopied(true);
                setTimeout(() => setEmbedCopied(false), 2000);
              }}
            >
              {embedCopied ? "Copied!" : "Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile */}
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
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={trainer.city || ""} placeholder="e.g. Warsaw, Poland" />
              <p className="text-xs text-muted-foreground">Helps clients find you via search</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" name="bio" defaultValue={trainer.bio || ""} placeholder="Tell clients about yourself..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialties">Specialties</Label>
              <Input id="specialties" name="specialties" defaultValue={trainer.specialties?.join(", ") || ""} placeholder="e.g. strength, yoga, rehab" />
              <p className="text-xs text-muted-foreground">Comma-separated</p>
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

            {/* Paid-only: Branding */}
            {isPaid && (
              <>
                <Separator />
                <h3 className="text-sm font-semibold">Custom Branding</h3>
                <div className="space-y-2">
                  <Label htmlFor="brandColor">Brand Color</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="brandColor"
                      name="brandColor"
                      defaultValue={trainer.brand_primary_color}
                      className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">{trainer.brand_primary_color}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hideLogo"
                    name="hideLogo"
                    defaultChecked={trainer.brand_hide_logo}
                    className="rounded"
                  />
                  <Label htmlFor="hideLogo" className="text-sm">Hide FitBook branding on booking page</Label>
                </div>
              </>
            )}

            {message && <p className="text-sm text-muted-foreground">{message}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Availability */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Availability</h2>
          <p className="text-sm text-muted-foreground">Set your weekly working hours.</p>
        </CardHeader>
        <CardContent>
          <AvailabilityEditor trainerId={trainer.id} initialRules={rules} />
        </CardContent>
      </Card>

      {/* Referral */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Referral Program</h2>
          <p className="text-sm text-muted-foreground">
            {isPaid
              ? "Share your referral code with other trainers. When they sign up, you both get benefits."
              : "Upgrade to Pro to access the coach referral network."}
          </p>
        </CardHeader>
        <CardContent>
          {isPaid ? (
            <div className="flex items-center gap-2">
              <Input value={`${appUrl}/login?ref=${trainer.referral_code}`} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigator.clipboard.writeText(`${appUrl}/login?ref=${trainer.referral_code}`)}
              >
                Copy
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">Available on Pro plan</p>
              <Button size="sm" variant="outline">Upgrade to Pro — 20 PLN/mo</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade CTA for free tier */}
      {!isPaid && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6 text-center space-y-3">
            <h2 className="text-lg font-bold">Upgrade to Pro</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Unlimited clients & sessions, SMS reminders, re-engagement nudges, progress reports, custom branding, and referral network.
            </p>
            <p className="text-2xl font-bold">20 PLN<span className="text-sm font-normal text-muted-foreground">/month</span></p>
            <Button size="lg">Upgrade Now</Button>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex justify-end">
        <Button variant="destructive" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
