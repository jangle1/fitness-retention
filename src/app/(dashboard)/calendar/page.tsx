"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Booking, Trainer } from "@/types/database";
import { BookingDetailSheet } from "@/components/booking/booking-detail-sheet";

const HOUR_HEIGHT = 60;
const START_HOUR = 6;
const END_HOUR = 22;

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

const STATUS_COLORS: Record<string, string> = {
  booked: "bg-blue-500/15 border-blue-500/30 text-blue-700",
  attended: "bg-green-500/15 border-green-500/30 text-green-700",
  cancelled: "bg-red-500/15 border-red-500/30 text-red-700 line-through",
  no_show: "bg-orange-500/15 border-orange-500/30 text-orange-700",
  rescheduled: "bg-yellow-500/15 border-yellow-500/30 text-yellow-700",
};

export default function CalendarPage() {
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [bookings, setBookings] = useState<(Booking & { client_name?: string })[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<(Booking & { client_name?: string }) | null>(null);
  const weekDates = getWeekDates(weekOffset);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: t } = await supabase
      .from("trainers")
      .select("*")
      .eq("supabase_auth_id", user.id)
      .single();
    if (t) setTrainer(t as Trainer);

    const weekStart = weekDates[0].toISOString();
    const weekEnd = new Date(weekDates[6].getTime() + 86400000).toISOString();

    const { data: b } = await supabase
      .from("bookings")
      .select("*, clients(full_name)")
      .eq("trainer_id", t?.id)
      .gte("starts_at", weekStart)
      .lt("starts_at", weekEnd)
      .order("starts_at");

    if (b) {
      setBookings(
        b.map((booking: Record<string, unknown>) => ({
          ...(booking as unknown as Booking),
          client_name: (booking.clients as { full_name: string } | null)?.full_name,
        }))
      );
    }
  }, [weekOffset]);

  useEffect(() => { loadData(); }, [loadData]);

  const isToday = (date: Date) => {
    const now = new Date();
    return date.toDateString() === now.toDateString();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 md:pt-20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          {trainer && (
            <p className="text-sm text-muted-foreground">
              Booking link: <span className="font-mono text-foreground">fitbook.app/{trainer.slug}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset - 1)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset + 1)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Week header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
        <div />
        {weekDates.map((date, i) => (
          <div
            key={i}
            className={`text-center py-2 text-sm ${isToday(date) ? "font-bold text-primary" : "text-muted-foreground"}`}
          >
            <div>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()]}</div>
            <div className={`text-lg ${isToday(date) ? "bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto" : ""}`}>
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] relative overflow-y-auto max-h-[calc(100vh-220px)]">
        {/* Hour labels */}
        <div>
          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
            <div key={i} className="h-[60px] text-xs text-muted-foreground pr-2 text-right pt-[-6px]">
              {`${(START_HOUR + i).toString().padStart(2, "0")}:00`}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDates.map((date, dayIdx) => {
          const dayBookings = bookings.filter((b) => {
            const bDate = new Date(b.starts_at);
            return bDate.toDateString() === date.toDateString();
          });

          return (
            <div key={dayIdx} className="relative border-l">
              {/* Hour grid lines */}
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                <div key={i} className="h-[60px] border-b border-dashed border-muted" />
              ))}

              {/* Booking blocks */}
              {dayBookings.map((booking) => {
                const start = new Date(booking.starts_at);
                const end = new Date(booking.ends_at);
                const startMinutes = start.getHours() * 60 + start.getMinutes() - START_HOUR * 60;
                const duration = (end.getTime() - start.getTime()) / 60000;
                const top = (startMinutes / 60) * HOUR_HEIGHT;
                const height = (duration / 60) * HOUR_HEIGHT;

                return (
                  <button
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking)}
                    className={`absolute left-1 right-1 rounded-md border px-1.5 py-1 text-xs cursor-pointer overflow-hidden ${STATUS_COLORS[booking.status] || STATUS_COLORS.booked}`}
                    style={{ top: `${top}px`, height: `${Math.max(height, 24)}px` }}
                  >
                    <div className="font-medium truncate">{booking.client_name || "Client"}</div>
                    <div className="opacity-70">{formatTime(start)}</div>
                  </button>
                );
              })}
            </div>
          );
        })}
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
