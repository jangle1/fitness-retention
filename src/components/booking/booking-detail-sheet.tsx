"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Booking, BookingStatus } from "@/types/database";

const STATUS_LABELS: Record<BookingStatus, string> = {
  booked: "Booked",
  attended: "Attended",
  cancelled: "Cancelled",
  no_show: "No Show",
  rescheduled: "Rescheduled",
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  booked: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  attended: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  cancelled: "bg-red-500/20 text-red-300 border-red-500/30",
  no_show: "bg-red-500/20 text-red-300 border-red-500/30",
  rescheduled: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export function BookingDetailSheet({
  booking,
  open,
  onClose,
  onUpdate,
}: {
  booking: Booking & { client_name?: string };
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [notes, setNotes] = useState(booking.session_notes || "");
  const [saving, setSaving] = useState(false);

  async function updateStatus(status: BookingStatus) {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("bookings").update({ status }).eq("id", booking.id);
    await supabase.from("booking_events").insert({
      booking_id: booking.id, trainer_id: booking.trainer_id,
      client_id: booking.client_id, event_type: status, new_starts_at: booking.starts_at,
    });

    if (status === "attended") {
      fetch("/api/bookings/request-rating", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId: booking.id }) }).catch(() => {});
    }

    if (status === "attended" && booking.package_id) {
      const { data: pkg } = await supabase.from("packages").select("used_sessions, total_sessions").eq("id", booking.package_id).single();
      if (pkg) {
        const used = (pkg as { used_sessions: number }).used_sessions + 1;
        const total = (pkg as { total_sessions: number }).total_sessions;
        await supabase.from("packages").update({ used_sessions: used, status: used >= total ? "completed" : "active" }).eq("id", booking.package_id);
      }
    }

    setSaving(false);
    onUpdate();
    onClose();
  }

  async function saveNotes() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("bookings").update({ session_notes: notes }).eq("id", booking.id);
    await supabase.from("booking_events").insert({
      booking_id: booking.id, trainer_id: booking.trainer_id,
      client_id: booking.client_id, event_type: "notes_added", metadata: { notes },
    });
    setSaving(false);
    onUpdate();
  }

  const start = new Date(booking.starts_at);
  const end = new Date(booking.ends_at);
  const initials = (booking.client_name || "C").split(" ").map(n => n[0]).join("").slice(0, 2);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md bg-background border-border">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {initials}
            </div>
            <div>
              <SheetTitle className="text-left">{booking.client_name || "Booking"}</SheetTitle>
              <p className="text-sm text-muted-foreground">
                {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {" "}
                {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – {" "}
                {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-5">
          <span className={`inline-flex text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_COLORS[booking.status]}`}>
            {STATUS_LABELS[booking.status]}
          </span>

          <Separator className="bg-border" />

          {/* Session Notes */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Session Notes</label>
            <Textarea
              placeholder="How did the session go?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="rounded-2xl bg-card border-border px-5 py-4"
            />
            <Button size="sm" variant="outline" className="rounded-xl" onClick={saveNotes} disabled={saving}>
              Save notes
            </Button>
          </div>

          <Separator className="bg-border" />

          {/* Actions */}
          {booking.status === "booked" && (
            <div className="space-y-2">
              <Button className="w-full h-12 rounded-2xl font-bold" onClick={() => updateStatus("attended")} disabled={saving}>
                <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mark attended
              </Button>
              <Button variant="outline" className="w-full h-12 rounded-2xl font-medium" onClick={() => updateStatus("rescheduled")} disabled={saving}>
                Reschedule
              </Button>
              <Button variant="outline" className="w-full h-12 rounded-2xl font-medium text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => updateStatus("cancelled")} disabled={saving}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
