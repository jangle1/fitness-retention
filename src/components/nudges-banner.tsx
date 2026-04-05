"use client";

import { Button } from "@/components/ui/button";
import type { Nudge } from "@/types/database";

const NUDGE_MESSAGES: Record<string, string> = {
  inactive_client: "hasn't booked in 2+ weeks",
  package_expiring: "has a package about to expire",
};

export function NudgesBanner({
  nudges,
  onDismiss,
}: {
  nudges: (Nudge & { client_name?: string })[];
  onDismiss: (id: string) => void;
}) {
  if (nudges.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {nudges.map((nudge) => (
        <div
          key={nudge.id}
          className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span className="text-orange-500 text-lg">&#9888;</span>
            <p className="text-sm">
              <span className="font-medium">{nudge.client_name || "A client"}</span>{" "}
              {NUDGE_MESSAGES[nudge.type] || "needs attention"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDismiss(nudge.id)}
            className="text-muted-foreground"
          >
            Dismiss
          </Button>
        </div>
      ))}
    </div>
  );
}
