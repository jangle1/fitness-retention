"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AvailabilityRule } from "@/types/database";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface TimeSlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export function AvailabilityEditor({
  trainerId,
  initialRules,
}: {
  trainerId: string;
  initialRules: AvailabilityRule[];
}) {
  const [slots, setSlots] = useState<TimeSlot[]>(
    initialRules.length > 0
      ? initialRules.map((r) => ({
          id: r.id,
          day_of_week: r.day_of_week,
          start_time: r.start_time.slice(0, 5),
          end_time: r.end_time.slice(0, 5),
        }))
      : // Default: Mon-Fri 8am-5pm
        [1, 2, 3, 4, 5].map((day) => ({
          day_of_week: day,
          start_time: "08:00",
          end_time: "17:00",
        }))
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function addSlot(day: number) {
    setSlots([...slots, { day_of_week: day, start_time: "09:00", end_time: "17:00" }]);
  }

  function removeSlot(index: number) {
    setSlots(slots.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, field: "start_time" | "end_time", value: string) {
    const updated = [...slots];
    updated[index] = { ...updated[index], [field]: value };
    setSlots(updated);
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();

    // Delete all existing rules and re-insert
    await supabase.from("availability_rules").delete().eq("trainer_id", trainerId);

    if (slots.length > 0) {
      const { error } = await supabase.from("availability_rules").insert(
        slots.map((s) => ({
          trainer_id: trainerId,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        }))
      );
      if (error) {
        setMessage(`Error: ${error.message}`);
        setSaving(false);
        return;
      }
    }

    setMessage("Availability saved!");
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {DAYS.map((dayName, dayIndex) => {
        const daySlots = slots
          .map((s, i) => ({ ...s, originalIndex: i }))
          .filter((s) => s.day_of_week === dayIndex);

        return (
          <div key={dayIndex} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium w-24">{dayName}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => addSlot(dayIndex)}
              >
                + Add
              </Button>
            </div>
            {daySlots.length === 0 && (
              <p className="text-xs text-muted-foreground ml-24">Unavailable</p>
            )}
            {daySlots.map((slot) => (
              <div key={slot.originalIndex} className="flex items-center gap-2 ml-24">
                <Input
                  type="time"
                  value={slot.start_time}
                  onChange={(e) => updateSlot(slot.originalIndex, "start_time", e.target.value)}
                  className="w-28"
                />
                <span className="text-sm text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={slot.end_time}
                  onChange={(e) => updateSlot(slot.originalIndex, "end_time", e.target.value)}
                  className="w-28"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeSlot(slot.originalIndex)}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            ))}
          </div>
        );
      })}
      <div className="pt-2">
        {message && <p className="text-sm text-muted-foreground mb-2">{message}</p>}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save availability"}
        </Button>
      </div>
    </div>
  );
}
