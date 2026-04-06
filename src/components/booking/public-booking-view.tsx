"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Trainer, AvailabilityRule } from "@/types/database";

const SESSION_DURATION = 60;

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

    for (let min = ruleStartMin; min + SESSION_DURATION <= ruleEndMin; min += 30) {
      const slotStart = new Date(date);
      slotStart.setHours(Math.floor(min / 60), min % 60, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + SESSION_DURATION * 60000);
      if (slotStart <= new Date()) continue;

      const hasConflict = existingBookings.some((b) => {
        const bStart = new Date(b.starts_at);
        const bEnd = new Date(new Date(b.ends_at).getTime() + bufferMinutes * 60000);
        const bBufferedStart = new Date(bStart.getTime() - bufferMinutes * 60000);
        return slotStart < bEnd && slotEnd > bBufferedStart;
      });

      if (!hasConflict) slots.push(slotStart.toISOString());
    }
  }
  return slots;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate next 14 days grouped by week
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Week range label
  const weekStart = dates[0];
  const weekEnd = dates[6];
  const weekLabel = `${weekStart.getDate()}–${weekEnd.getDate()} ${weekEnd.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;

  useEffect(() => {
    if (!selectedDate) return;
    async function loadSlots() {
      const supabase = createClient();
      const date = new Date(selectedDate);
      const nextDay = new Date(date.getTime() + 86400000);
      const { data: bookings } = await supabase
        .from("bookings").select("starts_at, ends_at")
        .eq("trainer_id", trainer.id).neq("status", "cancelled")
        .gte("starts_at", date.toISOString()).lt("starts_at", nextDay.toISOString());
      const available = getAvailableSlots(date, rules, (bookings || []) as { starts_at: string; ends_at: string }[], trainer.buffer_minutes);
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

    if (trainer.tier === "free") {
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const { count: sessionCount } = await supabase.from("bookings").select("id", { count: "exact", head: true }).eq("trainer_id", trainer.id).gte("starts_at", monthStart.toISOString()).neq("status", "cancelled");
      if ((sessionCount || 0) >= 20) { setError("Session limit reached for the month."); setLoading(false); return; }

      const { count: clientCount } = await supabase.from("clients").select("id", { count: "exact", head: true }).eq("trainer_id", trainer.id);
      const { data: existingCheck } = await supabase.from("clients").select("id").eq("trainer_id", trainer.id).eq("email", email).single();
      if (!existingCheck && (clientCount || 0) >= 10) { setError("Client limit reached."); setLoading(false); return; }
    }

    const { data: existingClient } = await supabase.from("clients").select("id").eq("trainer_id", trainer.id).eq("email", email).single();
    let clientId: string;

    if (existingClient) {
      clientId = (existingClient as { id: string }).id;
    } else {
      const { data: newClient, error: clientError } = await supabase.from("clients").insert({ trainer_id: trainer.id, email, full_name: name }).select("id").single();
      if (clientError || !newClient) { setError("Could not create your profile."); setLoading(false); return; }
      clientId = (newClient as { id: string }).id;
    }

    const { data: booking, error: bookingError } = await supabase.from("bookings").insert({ trainer_id: trainer.id, client_id: clientId, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() }).select("id").single();
    if (bookingError || !booking) { setError("Could not create booking."); setLoading(false); return; }

    const bookingId = (booking as { id: string }).id;
    await supabase.from("booking_events").insert({ booking_id: bookingId, trainer_id: trainer.id, client_id: clientId, event_type: "created", new_starts_at: startsAt.toISOString() });
    fetch("/api/bookings/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId }) }).catch(() => {});

    setLoading(false);
    setStep("confirmed");
  }

  if (step === "confirmed") {
    const time = new Date(selectedSlot!);
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-xl font-bold">Booking Confirmed!</h2>
        <p className="text-muted-foreground">
          {time.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })} at{" "}
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-sm text-muted-foreground">with {trainer.full_name}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week navigation + date picker */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pick a date</label>
          <span className="text-sm text-muted-foreground">{weekLabel}</span>
        </div>
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
          {dates.slice(0, 7).map((date) => {
            const dateStr = date.toISOString();
            const hasAvailability = rules.some((r) => r.day_of_week === date.getDay());
            const isSelected = selectedDate === dateStr;
            return (
              <button
                key={dateStr}
                disabled={!hasAvailability}
                onClick={() => { setSelectedDate(dateStr); setSelectedSlot(null); setStep("time"); }}
                className={`flex flex-col items-center justify-center shrink-0 w-[calc((100%-48px)/7)] min-w-[52px] h-20 rounded-2xl text-sm transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : hasAvailability
                      ? "bg-card border border-border hover:border-muted-foreground"
                      : "bg-muted/30 text-muted-foreground/30 cursor-not-allowed"
                }`}
              >
                <span className="text-[11px] font-bold uppercase">{DAY_NAMES[date.getDay()]}</span>
                <span className="text-xl font-bold">{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slots */}
      {step !== "date" && selectedDate && (
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">Available times</label>
          {slots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No available slots on this day.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot) => {
                const time = new Date(slot);
                const isSelected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    onClick={() => { setSelectedSlot(slot); setStep("details"); }}
                    className={`h-14 rounded-2xl border text-base font-bold flex items-center justify-center gap-2 transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:border-muted-foreground"
                    }`}
                  >
                    <svg className="h-4 w-4 opacity-60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Client details */}
      {step === "details" && selectedSlot && (
        <div className="space-y-4 pt-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your details</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required className="h-14 rounded-2xl bg-card border-border text-base px-5" />
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" required className="h-14 rounded-2xl bg-card border-border text-base px-5" />
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="h-14 rounded-2xl bg-card border-border text-base px-5" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full h-14 rounded-2xl text-base font-bold" onClick={handleBook} disabled={loading || !name || !email}>
            {loading ? "Booking..." : "Confirm booking"}
          </Button>
        </div>
      )}
    </div>
  );
}
