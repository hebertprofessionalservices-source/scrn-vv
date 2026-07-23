import type { KeyReturner } from "@/lib/returning";

export interface ReturnersSide {
  teamName: string;
  returners: KeyReturner[];
}

/** Top returning stat leaders from the prior season, side by side. */
export function KeyReturnersSection({ a, b }: { a: ReturnersSide; b: ReturnersSide }) {
  if (a.returners.length === 0 && b.returners.length === 0) return null;
  return (
    <section>
      <h2 className="font-display text-xl mb-3">Key Returning Players</h2>
      <div className="grid md:grid-cols-2 gap-6">
        <ReturnersList side={a} />
        <ReturnersList side={b} />
      </div>
    </section>
  );
}

export function ReturnersList({ side }: { side: ReturnersSide }) {
  return (
    <div className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 p-4">
      <div className="text-xs uppercase tracking-wider text-chrome-500 mb-2">
        {side.teamName}
      </div>
      {side.returners.length === 0 ? (
        <p className="text-sm text-chrome-500">No returning stat leaders on record.</p>
      ) : (
        <ul className="divide-y divide-chrome-500/10">
          {side.returners.map((p) => (
            <li key={p.playerId} className="py-2 flex items-baseline gap-2">
              <span className="text-sm text-chrome-100">{p.name}</span>
              <span className="text-xs text-chrome-500">
                {p.position} · {p.nextClass}
              </span>
              <span className="ml-auto text-xs font-display text-chrome-300 text-right">
                {p.line}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
