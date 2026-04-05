import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mx-auto max-w-md space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
          <svg
            className="h-8 w-8 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">FitBook</h1>
          <p className="text-lg text-muted-foreground">
            Free booking calendar & CRM for personal trainers.
            Let clients book you online, track packages, and reduce no-shows.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/login">
            <Button size="lg" className="w-full">
              Get started — it&apos;s free
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 text-sm text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">Calendar Sync</p>
            <p>2-way Google Calendar</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Client CRM</p>
            <p>Packages & session notes</p>
          </div>
          <div>
            <p className="font-semibold text-foreground">Reminders</p>
            <p>Automated 24h emails</p>
          </div>
        </div>
      </div>
    </div>
  );
}
