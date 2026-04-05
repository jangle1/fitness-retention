"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Trainer, AvailabilityRule } from "@/types/database";

const SESSION_DURATION = 60; // minutes

function getAvailableSlots(
  date: Date,
  rules: AvailabilityRule[],
  existingBookings: { starts_at: string; ends_at: string }[],
  bufferMinutes: number
): string[] {
  const dayOfWeek = date.getDay();
  const dayRules = rules.filter((r) => r.day_of_week === dayOfWeek);

  if (dayRules.length === 0) return [];

  const slots: string[] = [];

  for (const rule of dayRules) {
    const [startH, startM] = rule.start_time.split(":").map(Number);
    const [endH, endM] = rule.end_time.split(":").map(Number);
    const ruleStartMin = startH * 60 + startM;
    const ruleEndMin = endH * 60 + endM;

    // Generate 30-min interval slots
    for (let min = ruleStartMin; min + SESSION_DURATION <= ruleEndMin; min += 30) {
      const slotStart = new Date(date);
      slotStart.setHours(Math.floor(min / 60), min % 60, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + SESSION_DURATION * 60000);

      // Check if slot is in the past
      if (slotStart <= new Date()) continue;

      // Check conflicts with existing bookings (including buffer)
      const hasConflict = existingBookings.some((b) => {
        const bStart = new Date(b.starts_at);
        const bEnd = new Date(new Date(b.ends_at).getTime() + bufferMinutes * 60000);
        const bBufferedStart = new Date(bStart.getTime() - bufferMinutes * 60000);
        return slotStart < bEnd && slotEnd > bBufferedStart;
      });

      if (!hasConflict) {
        slots.push(slotStart.toISOString());
      }
    }
  }

  return slots;
}

export function PublicBookingView({
  trainer,
  rules,
}: {
  trainer: Trainer;
  rules: AvailabilityRule[];
}) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<"date" | "time" | "details" | "confirmed">("date");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    if (!selectedDate) return;

    async function loadSlots() {
      const supabase = createClient();
      const date = new Date(selectedDate);
      const nextDay = new Date(date.getTime() + 86400000);

      const { data: bookings } = await supabase
        .from("bookings")
        .select("starts_at, ends_at")
        .eq("trainer_id", trainer.id)
        .neq("status", "cancelled")
        .gte("starts_at", date.toISOString())
        .lt("starts_at", nextDay.toISOString());

      const available = getAvailableSlots(
        date,
        rules,
        (bookings || []) as { starts_at: string; ends_at: string }[],
        trainer.buffer_minutes
      );
      setSlots(available);
    }

    loadSlots();
  }, [selectedDate, trainer.id, trainer.buffer_minutes, rules]);

  async function handleBook() {
    if (!selectedSlot) return;
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const startsAt = new Date(selectedSlot);
    const endsAt = new Date(startsAt.getTime() + SESSION_DURATION * 60000);

    // Check tier caps
    if (trainer.tier === "free") {
      // Check session cap (20/month)
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count: sessionCount } = await supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("trainer_id", trainer.id)
        .gte("starts_at", monthStart.toISOString())
        .neq("status", "cancelled");

      if ((sessionCount || 0) >= 20) {
        setError("This trainer's free plan session limit has been reached for the month. Please contact them directly.");
        setLoading(false);
        return;
      }

      // Check client cap (10 active)
      const { count: clientCount } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("trainer_id", trainer.id);

      const { data: existingCheck } = await supabase
        .from("clients")
        .select("id")
        .eq("trainer_id", trainer.id)
        .eq("email", email)
        .single();

      if (!existingCheck && (clientCount || 0) >= 10) {
        setError("This trainer's free plan client limit has been reached. Please contact them directly.");
        setLoading(false);
        return;
      }
    }

    // Find or create client
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("trainer_id", trainer.id)
      .eq("email", email)
      .single();

    let clientId: string;

    if (existingClient) {
      clientId = (existingClient as { id: string }).id;
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          trainer_id: trainer.id,
          email,
          full_name: name,
        })
        .select("id")
        .single();

      if (clientError || !newClient) {
        setError("Could not create your profile. Please try again.");
        setLoading(false);
        return;
      }
      clientId = (newClient as { id: string }).id;
    }

    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        trainer_id: trainer.id,
        client_id: clientId,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      setError("Could not create booking. Please try again.");
      setLoading(false);
      return;
    }

    const bookingId = (booking as { id: string }).id;

    // Log event
    await supabase.from("booking_events").insert({
      booking_id: bookingId,
      trainer_id: trainer.id,
      client_id: clientId,
      event_type: "created",
      new_starts_at: startsAt.toISOString(),
    });

    // Send confirmation email (fire-and-forget)
    fetch("/api/bookings/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId }),
    }).catch(() => {});

    setLoading(false);
    setStep("confirmed");
  }

  if (step === "confirmed") {
    const time = new Date(selectedSlot!);
    return (
      <Card>
        <CardContent className="pt-6 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">Booking Confirmed!</h2>
          <p className="text-muted-foreground">
            {time.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} at{" "}
            {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-sm text-muted-foreground">
            with {trainer.full_name}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date selection */}
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-sm font-medium mb-3">Select a date</h2>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {dates.map((date) => {
              const dateStr = date.toISOString();
              const hasAvailability = rules.some((r) => r.day_of_week === date.getDay());
              return (
                <button
                  key={dateStr}
                  disabled={!hasAvailability}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    setSelectedSlot(null);
                    setStep("time");
                  }}
                  className={`rounded-lg p-2 text-center text-sm transition-colors ${
                    selectedDate === dateStr
                      ? "bg-primary text-primary-foreground"
                      : hasAvailability
                        ? "hover:bg-muted border"
                        : "text-muted-foreground/40 cursor-not-allowed"
                  }`}
                >
                  <div className="text-xs">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]}
                  </div>
                  <div className="font-medium">{date.getDate()}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Time slots */}
      {step !== "date" && selectedDate && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-medium mb-3">Select a time</h2>
            {slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No available slots on this day.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((slot) => {
                  const time = new Date(slot);
                  return (
                    <button
                      key={slot}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setStep("details");
                      }}
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                        selectedSlot === slot
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Client details */}
      {step === "details" && selectedSlot && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-sm font-medium">Your details</h2>
            <div className="space-y-2">
              <Label htmlFor="clientName">Name</Label>
              <Input
                id="clientName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email</Label>
              <Input
                id="clientEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={handleBook} disabled={loading || !name || !email}>
              {loading ? "Booking..." : "Confirm Booking"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
