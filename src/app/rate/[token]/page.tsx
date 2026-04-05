"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function RatePage() {
  const { token } = useParams<{ token: string }>();
  const [trainerName, setTrainerName] = useState("");
  const [score, setScore] = useState(0);
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
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 text-center space-y-3">
            <div className="text-4xl">&#11088;</div>
            <h2 className="text-xl font-bold">
              {submitted ? "Thanks for your feedback!" : "Already rated"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {submitted
                ? `Your rating for ${trainerName} has been submitted.`
                : "You've already rated this session."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold">Rate your session</h2>
            <p className="text-sm text-muted-foreground">with {trainerName}</p>
          </div>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setScore(n)}
                className={`text-3xl transition-transform ${
                  n <= score ? "scale-110" : "opacity-30 hover:opacity-60"
                }`}
              >
                &#9733;
              </button>
            ))}
          </div>

          <Textarea
            placeholder="Any feedback? (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={score === 0 || submitting}
          >
            {submitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
