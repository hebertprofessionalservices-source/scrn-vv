import Link from "next/link";
import { anyInScope, scopeSuffix } from "@/lib/home-filter";
import type { ScoreCard } from "@/lib/scores";

export type { ScoreCard };

/** Last week's finals, narrowed to the home page's league/classification filter. */
export function LastWeekScores({
  scores, league, cls,
}: {
  scores: ScoreCard[];
  league: string;
  cls: string;
}) {
  const shown = scores.filter((s) => anyInScope(s.classifications, league, cls));
  return (
    <div>
      <h2 className="font-display text-2xl mb-3">
        Last Week&apos;s Scores{scopeSuffix(league, cls)}
      </h2>
      {shown.length === 0 ? (
        <p className="text-chrome-500 text-sm">No finals from last week.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {shown.map((s) => {
            const content = (
              <div className="rounded-lg border border-chrome-500/15 px-3 py-2 hover:border-crimson-500 text-sm">
                <div className="flex items-center justify-between">
                  <span className={s.awayWin ? "font-semibold" : "text-chrome-300"}>
                    {s.awayName}
                  </span>
                  <span className="font-display">{s.awayScore ?? "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className={!s.awayWin ? "font-semibold" : "text-chrome-300"}>
                    {s.homeName}
                  </span>
                  <span className="font-display">{s.homeScore ?? "—"}</span>
                </div>
                <div className="text-[10px] text-chrome-500 mt-1">{s.date}</div>
              </div>
            );
            return s.href
              ? <Link key={s.id} href={s.href as any}>{content}</Link>
              : <div key={s.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
