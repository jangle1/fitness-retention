"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import type { Booking, Trainer, Nudge } from "@/types/database";
import { BookingDetailSheet } from "@/components/booking/booking-detail-sheet";
import { NudgesBanner } from "@/components/nudges-banner";

const HOUR_HEIGHT = 60;
const START_HOUR = 7;
const END_HOUR = 20;

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getWeekDates(offset: number) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatWeekRange(dates: Date[]) {
  const start = dates[0];
  const end = dates[6];
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
  return `${start.getDate()}–${end.toLocaleDateString(undefined, opts)}`;
}

const STATUS_COLORS: Record<string, string> = {
  booked: "bg-indigo-500/30 border-l-2 border-l-indigo-400 text-indigo-300",
  attended: "bg-emerald-500/30 border-l-2 border-l-emerald-400 text-emerald-300",
  cancelled: "bg-orange-500/20 border-l-2 border-l-orange-400 text-orange-300 line-through opacity-60",
  no_show: "bg-red-500/25 border-l-2 border-l-red-400 text-red-300",
  rescheduled: "bg-amber-500/25 border-l-2 border-l-amber-400 text-amber-300",
};

const STATUS_LEGEND = [
  { key: "booked", label: "Booked", color: "bg-indigo-400" },
  { key: "attended", label: "Attended", color: "bg-emerald-400" },
  { key: "cancelled", label: "Cancelled", color: "bg-orange-400" },
  { key: "no_show", label: "No-show", color: "bg-red-400" },
  { key: "rescheduled", label: "Rescheduled", color: "bg-amber-400" },
];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarPage() {
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [bookings, setBookings] = useState<(Booking & { client_name?: string })[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<(Booking & { client_name?: string }) | null>(null);
  const [nudges, setNudges] = useState<(Nudge & { client_name?: string })[]>([]);
  const weekDates = getWeekDates(weekOffset);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: t } = await supabase.from("trainers").select("*").eq("supabase_auth_id", user.id).single();
    if (t) setTrainer(t as Trainer);

    const weekStart = weekDates[0].toISOString();
    const weekEnd = new Date(weekDates[6].getTime() + 86400000).toISOString();

    const { data: b } = await supabase
      .from("bookings").select("*, clients(full_name)")
      .eq("trainer_id", t?.id)
      .gte("starts_at", weekStart).lt("starts_at", weekEnd)
      .order("starts_at");

    if (b) {
      setBookings(b.map((booking: Record<string, unknown>) => ({
        ...(booking as unknown as Booking),
        client_name: (booking.clients as { full_name: string } | null)?.full_name,
      })));
    }

    if ((t as Trainer)?.tier === "paid") {
      const { data: n } = await supabase
        .from("nudges").select("*, clients(full_name)")
        .eq("trainer_id", t?.id).eq("dismissed", false)
        .order("created_at", { ascending: false }).limit(5);
      if (n) {
        setNudges(n.map((nudge: Record<string, unknown>) => ({
          ...(nudge as unknown as Nudge),
          client_name: (nudge.clients as { full_name: string } | null)?.full_name,
        })));
      }
    }
  }, [weekOffset]);

  useEffect(() => { loadData(); }, [loadData]);

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 md:pt-20 pb-20 md:pb-6">
      {/* Nudges */}
      {nudges.length > 0 && (
        <NudgesBanner nudges={nudges} onDismiss={async (id) => {
          const supabase = createClient();
          await supabase.from("nudges").update({ dismissed: true }).eq("id", id);
          setNudges(nudges.filter((n) => n.id !== id));
        }} />
      )}

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h2 className="text-base font-bold">{formatWeekRange(weekDates)}</h2>
        <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Week header */}
      <div className="grid grid-cols-[48px_repeat(7,1fr)] mb-1">
        <div />
        {weekDates.map((date, i) => (
          <div key={i} className="text-center">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {DAY_NAMES[i]}
            </div>
            <div className={`text-lg mt-0.5 mx-auto ${
              isToday(date)
                ? "bg-primary text-primary-foreground rounded-full w-9 h-9 flex items-center justify-center font-bold"
                : "font-medium text-foreground"
            }`}>
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-[48px_repeat(7,1fr)] relative overflow-y-auto max-h-[calc(100vh-280px)] md:max-h-[calc(100vh-220px)] rounded-xl border border-border bg-card/30">
        {/* Hour labels */}
        <div>
          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
            <div key={i} className="h-[60px] text-[11px] text-muted-foreground pr-2 text-right leading-none pt-0">
              {`${(START_HOUR + i).toString().padStart(2, "0")}:00`}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDates.map((date, dayIdx) => {
          const dayBookings = bookings.filter((b) => new Date(b.starts_at).toDateString() === date.toDateString());

          return (
            <div key={dayIdx} className="relative border-l border-border/50">
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                <div key={i} className="h-[60px] border-b border-border/30" />
              ))}

              {dayBookings.map((booking) => {
                const start = new Date(booking.starts_at);
                const end = new Date(booking.ends_at);
                const startMinutes = start.getHours() * 60 + start.getMinutes() - START_HOUR * 60;
                const duration = (end.getTime() - start.getTime()) / 60000;
                const top = (startMinutes / 60) * HOUR_HEIGHT;
                const height = (duration / 60) * HOUR_HEIGHT;

                const initials = (booking.client_name || "C")
                  .split(" ").map(n => n[0]).join("").slice(0, 2);

                return (
                  <button
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking)}
                    className={`absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 text-[11px] cursor-pointer overflow-hidden transition-shadow hover:shadow-lg ${STATUS_COLORS[booking.status] || STATUS_COLORS.booked}`}
                    style={{ top: `${top}px`, height: `${Math.max(height, 28)}px` }}
                  >
                    <div className="font-bold truncate">{initials}</div>
                    <div className="opacity-80">{formatTime(start)}</div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Status legend */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {STATUS_LEGEND.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${s.color}`} />
            <span className="text-[11px] text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {selectedBooking && (
        <BookingDetailSheet
          booking={selectedBooking}
          open={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onUpdate={loadData}
        />
      )}
    </div>
  );
}
