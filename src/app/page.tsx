import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LandingPage() {
  return (
    <div className="min-h-full flex flex-col">
      {/* Top nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <svg className="h-5 w-5 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">FitBook</span>
        </div>
        <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          Log in
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center px-6 pt-6 pb-16">
        <div className="mx-auto max-w-lg w-full space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
            <span className="text-base">&#127942;</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">For Personal Trainers</span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
              Your training.{" "}
              <span className="text-primary italic">Your schedule.</span>
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-md">
              Professional booking page, client CRM and analytics — all in one place. No commissions.
            </p>
          </div>

          {/* Email CTA */}
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="your@email.com"
              className="h-14 rounded-2xl bg-card border-border text-base px-5"
            />
            <Link href="/login" className="block">
              <Button size="lg" className="w-full h-14 text-base font-bold rounded-2xl">
                Get started for free
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Button>
            </Link>
            <p className="text-center text-xs text-muted-foreground">
              No credit card · 14-day trial · Cancel anytime
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary">1,200+</p>
              <p className="text-xs text-muted-foreground mt-1">trainers</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary">48k</p>
              <p className="text-xs text-muted-foreground mt-1">sessions</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <p className="text-2xl font-bold text-primary">4.9&#9733;</p>
              <p className="text-xs text-muted-foreground mt-1">avg rating</p>
            </div>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex -space-x-2">
              {["A", "P", "T", "K", "M"].map((letter, i) => (
                <div key={i} className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold border-2 border-card ${
                  ["bg-red-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500"][i]
                } text-white`}>
                  {letter}
                </div>
              ))}
            </div>
            <div>
              <div className="flex gap-0.5 text-amber-400 text-sm">
                {"★★★★★".split("").map((s, i) => <span key={i}>{s}</span>)}
              </div>
              <p className="text-sm text-muted-foreground">
                Join <span className="font-semibold text-foreground">1,200+ trainers</span>
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            {[
              { icon: "calendar", text: "Public booking page under your link" },
              { icon: "zap", text: "Automatic reminders and SMS confirmations" },
              { icon: "users", text: "Client CRM with packages and progress" },
              { icon: "bar", text: "Revenue analytics and session tracking" },
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  {feature.icon === "calendar" && (
                    <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  )}
                  {feature.icon === "zap" && (
                    <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
                    </svg>
                  )}
                  {feature.icon === "users" && (
                    <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  )}
                  {feature.icon === "bar" && (
                    <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  )}
                </div>
                <p className="text-sm font-medium flex-1">{feature.text}</p>
                <svg className="h-5 w-5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
