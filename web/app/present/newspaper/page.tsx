import { currentSeason, loadDataset } from "@/lib/data-server";
import { latestSlate, leagueWeek } from "@/lib/newspaper";
import { classificationLabel } from "@/lib/team-format";
import { formatGameDate } from "@/lib/format-date";
import type { Classification } from "@/lib/types";

/**
 * Index of weekly recap pages, one per classification.
 *
 * Each link opens the printed page for the most recent completed slate, so
 * the show can pull any class up on air without hand-editing a URL.
 */

const COLUMNS: { league: "MHSAA" | "MAIS"; classes: Classification[] }[] = [
  { league: "MHSAA", classes: ["7A", "6A", "5A", "4A", "3A", "2A", "1A"] },
  {
    league: "MAIS",
    classes: ["MAIS-4A", "MAIS-3A", "MAIS-2A", "MAIS-8M-2A", "MAIS-8M-1A"],
  },
];

export default async function NewspaperIndex() {
  const season = await currentSeason();
  const data = await loadDataset(season);
  const dates = latestSlate(data.games);
  const last = dates[dates.length - 1];

  // Only offer a class we actually have teams for this season.
  const present = new Set(data.teams.map((t) => t.classification));
  const played = new Set<string>();
  for (const g of data.games) {
    if (g.status !== "final" || !dates.includes(g.date.slice(0, 10))) continue;
    for (const id of [g.homeTeamId, g.awayTeamId]) {
      const t = data.teamsByAlias.get(id);
      if (t) played.add(t.classification);
    }
  }

  return (
    <>
      <h1 className="font-display">Weekly Recap Pages</h1>
      <p className="text-2xl text-chrome-300 mt-3">
        {last
          ? `Latest slate: ${dates.map((d) => formatGameDate(d)).join(" · ")}`
          : "No completed games yet this season."}
      </p>

      <div className="grid grid-cols-2 gap-16 mt-10">
        {COLUMNS.map(({ league, classes }) => {
          const week = last ? leagueWeek(season, league, last) : null;
          return (
            <section key={league}>
              <h2 className="font-display border-b border-chrome-500/30 pb-2">
                {league}
                {week !== null ? (
                  <span className="text-chrome-400"> · Week {week}</span>
                ) : null}
              </h2>
              <ul className="mt-5 space-y-3">
                {classes
                  .filter((c) => present.has(c))
                  .map((c) => {
                    const hasGames = played.has(c);
                    return (
                      <li key={c}>
                        {/* Plain anchor: a client-side Link click during
                            hydration can be silently dropped. */}
                        <a
                          href={`/present/newspaper/${encodeURIComponent(c)}`}
                          className="flex items-baseline justify-between gap-4 px-4 py-3 rounded border border-chrome-500/20 hover:border-crimson-500 hover:text-crimson-500"
                        >
                          <span className="font-display">
                            {classificationLabel(c)}
                          </span>
                          <span className="text-xl text-chrome-400">
                            {hasGames ? "View page →" : "No games this slate"}
                          </span>
                        </a>
                      </li>
                    );
                  })}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
