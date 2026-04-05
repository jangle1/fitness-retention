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

const STATUS_VARIANTS: Record<BookingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  booked: "default",
  attended: "secondary",
  cancelled: "destructive",
  no_show: "destructive",
  rescheduled: "outline",
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

    await supabase
      .from("bookings")
      .update({ status })
      .eq("id", booking.id);

    // Log event
    await supabase.from("booking_events").insert({
      booking_id: booking.id,
      trainer_id: booking.trainer_id,
      client_id: booking.client_id,
      event_type: status,
      new_starts_at: booking.starts_at,
    });

    // If attended, increment package counter
    if (status === "attended" && booking.package_id) {
      const { data: pkg } = await supabase
        .from("packages")
        .select("used_sessions, total_sessions")
        .eq("id", booking.package_id)
        .single();

      if (pkg) {
        const used = (pkg as { used_sessions: number }).used_sessions + 1;
        const total = (pkg as { total_sessions: number }).total_sessions;
        await supabase
          .from("packages")
          .update({
            used_sessions: used,
            status: used >= total ? "completed" : "active",
          })
          .eq("id", booking.package_id);
      }
    }

    setSaving(false);
    onUpdate();
    onClose();
  }

  async function saveNotes() {
    setSaving(true);
    const supabase = createClient();

    await supabase
      .from("bookings")
      .update({ session_notes: notes })
      .eq("id", booking.id);

    await supabase.from("booking_events").insert({
      booking_id: booking.id,
      trainer_id: booking.trainer_id,
      client_id: booking.client_id,
      event_type: "notes_added",
      metadata: { notes },
    });

    setSaving(false);
    onUpdate();
  }

  const start = new Date(booking.starts_at);
  const end = new Date(booking.ends_at);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{booking.client_name || "Booking"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANTS[booking.status]}>
              {STATUS_LABELS[booking.status]}
            </Badge>
          </div>

          <div className="text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Date:</span>{" "}
              {start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <p>
              <span className="text-muted-foreground">Time:</span>{" "}
              {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
              {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">Session Notes</p>
            <Textarea
              placeholder="How did the session go? Any injuries or progress to note..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
            <Button size="sm" variant="outline" onClick={saveNotes} disabled={saving}>
              Save notes
            </Button>
          </div>

          <Separator />

          {booking.status === "booked" && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Update Status</p>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => updateStatus("attended")} disabled={saving}>
                  Mark Attended
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateStatus("no_show")} disabled={saving}>
                  No Show
                </Button>
                <Button size="sm" variant="destructive" onClick={() => updateStatus("cancelled")} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
