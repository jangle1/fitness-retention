"use client";

export function ReviewBadge({
  rating,
  count,
  embeddable = false,
}: {
  rating: number;
  count: number;
  embeddable?: boolean;
}) {
  const stars = Math.round(rating * 2) / 2; // round to nearest 0.5

  const badge = (
    <div className={`inline-flex items-center gap-1.5 ${embeddable ? "bg-white border shadow-sm" : "bg-muted"} rounded-full px-3 py-1.5 mt-2`}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`text-sm ${n <= stars ? "text-yellow-500" : n - 0.5 <= stars ? "text-yellow-400" : "text-gray-300"}`}
          >
            &#9733;
          </span>
        ))}
      </div>
      <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count} reviews)</span>
    </div>
  );

  return badge;
}

// Embeddable snippet generator
export function getEmbedCode(slug: string, appUrl: string) {
  return `<a href="${appUrl}/${slug}" target="_blank" rel="noopener"><img src="${appUrl}/api/badge/${slug}" alt="FitBook Reviews" /></a>`;
}
