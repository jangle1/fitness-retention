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

  const summary = nudges.length === 1
    ? `1 session needs attention`
    : `${nudges.length} items need attention`;

  return (
    <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <p className="text-sm font-medium text-amber-300">{summary}</p>
      </div>
      <div className="space-y-1.5">
        {nudges.map((nudge) => (
          <div key={nudge.id} className="flex items-center justify-between rounded-xl bg-card/50 px-3 py-2">
            <p className="text-sm">
              <span className="font-medium text-foreground">{nudge.client_name || "A client"}</span>{" "}
              <span className="text-muted-foreground">{NUDGE_MESSAGES[nudge.type] || "needs attention"}</span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(nudge.id)}
              className="text-muted-foreground hover:text-foreground rounded-lg h-7 px-2 text-xs"
            >
              Dismiss
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
