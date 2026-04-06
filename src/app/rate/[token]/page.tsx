"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function RatePage() {
  const { token } = useParams<{ token: string }>();
  const [trainerName, setTrainerName] = useState("");
  const [score, setScore] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/rate/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.rated) setAlreadyRated(true);
        if (data.trainerName) setTrainerName(data.trainerName);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  async function handleSubmit() {
    if (score === 0) return;
    setSubmitting(true);
    await fetch(`/api/rate/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score, comment }),
    });
    setSubmitting(false);
    setSubmitted(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (alreadyRated || submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
            <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">
            {submitted ? "Thanks for your feedback!" : "Already rated"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {submitted
              ? `Your rating for ${trainerName} has been submitted.`
              : "You've already rated this session."}
          </p>
        </div>
      </div>
    );
  }

  const initials = trainerName.split(" ").map(n => n[0]).join("").slice(0, 2) || "?";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <svg className="h-5 w-5 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold">FitBook</span>
        </div>

        {/* Session context card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Your latest session</p>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {initials}
            </div>
            <div>
              <p className="font-semibold">{trainerName}</p>
              <p className="text-sm text-muted-foreground">Personal Training</p>
            </div>
          </div>
        </div>

        {/* Rate section */}
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold">Rate your session</h2>
          <p className="text-sm text-muted-foreground">How was your training with {trainerName}?</p>
        </div>

        {/* Star rating — outline stars */}
        <div className="flex justify-center gap-3 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setScore(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <svg
                className={`h-12 w-12 transition-colors ${
                  n <= (hovered || score)
                    ? "text-amber-400 fill-amber-400"
                    : "text-muted-foreground/30"
                }`}
                viewBox="0 0 24 24"
                fill={n <= (hovered || score) ? "currentColor" : "none"}
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          ))}
        </div>

        {/* Comment */}
        <Textarea
          placeholder="Additional comment (optional)..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="rounded-2xl bg-card border-border px-5 py-4"
        />

        {/* Submit */}
        <Button
          className="w-full h-14 rounded-2xl text-base font-bold"
          onClick={handleSubmit}
          disabled={score === 0 || submitting}
        >
          {submitting ? "Submitting..." : "Submit rating"}
          <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
