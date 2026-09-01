/** "AI Pick: Starkville Yellowjackets — 63%" from the rating gap. */
export function AiPick({
  aName,
  bName,
  aRating,
  bRating,
}: {
  aName: string;
  bName: string;
  aRating: number | null;
  bRating: number | null;
}) {
  if (aRating === null || bRating === null) return null;
  const pA = 1 / (1 + Math.exp(-(aRating - bRating) / 7));
  const winner = pA >= 0.5 ? aName : bName;
  const pct = Math.round(Math.max(pA, 1 - pA) * 100);
  return (
    <div className="rounded-xl border border-crimson-500/40 bg-navy-700/40 px-4 py-2.5 text-center">
      <span className="text-xs uppercase tracking-wider text-crimson-500 mr-2">AI Pick</span>
      <span className="font-display text-lg text-chrome-100">
        {winner} — {pct}%
      </span>
    </div>
  );
}
