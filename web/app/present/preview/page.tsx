import { currentSeason, loadDataset } from "@/lib/data-server";
import { leagueWeek } from "@/lib/newspaper";
import { currentWeekRange, slateDates } from "@/lib/preview";
import { classificationLabel } from "@/lib/team-format";
import { formatGameDate } from "@/lib/format-date";
import type { Classification } from "@/lib/types";

/**
 * Index of week-ahead preview pages, one per classification — the mirror of
 * the recap index, covering the Monday–Sunday week we are currently in.
 */

const COLUMNS: { league: "MHSAA" | "MAIS"; classes: Classification[] }[] = [
  { league: "MHSAA", classes: ["7A", "6A", "5A", "4A", "3A", "2A", "1A"] },
  {
    league: "MAIS",
    classes: ["MAIS-4A", "MAIS-3A", "MAIS-2A", "MAIS-8M-2A", "MAIS-8M-1A"],
  },
];

export default async function PreviewIndex() {
  const season = await currentSeason();
  const data = await loadDataset(season);
  const today = new Date().toISOString().slice(0, 10);
  const [monday, sunday] = currentWeekRange(today);
  const dates = slateDates(data.games, [monday, sunday]);
  const first = dates[0];

  const present = new Set(data.teams.map((t) => t.classification));
  const scheduled = new Set<string>();
  const dateSet = new Set(dates);
  for (const g of data.games) {
    if (g.status === "final" || !dateSet.has(g.date.slice(0, 10))) continue;
    for (const id of [g.homeTeamId, g.awayTeamId]) {
      const t = data.teamsByAlias.get(id);
      if (t) scheduled.add(t.classification);
    }
  }

  return (
    <>
      <h1 className="font-display">Week Ahead Preview Pages</h1>
      <p className="text-2xl text-chrome-300 mt-3">
        {dates.length > 0
          ? `This week: ${formatGameDate(monday).replace(/, \d{4}$/, "")} – ${formatGameDate(sunday)}`
          : "No games scheduled for the rest of this week."}
      </p>

      <div className="grid grid-cols-2 gap-16 mt-10">
        {COLUMNS.map(({ league, classes }) => {
          const week = first ? leagueWeek(season, league, first) : null;
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
                    const hasGames = scheduled.has(c);
                    return (
                      <li key={c}>
                        {/* Plain anchor — see site-header.tsx. */}
                        <a
                          href={`/present/preview/${encodeURIComponent(c)}`}
                          className="flex items-baseline justify-between gap-4 px-4 py-3 rounded border border-chrome-500/20 hover:border-crimson-500 hover:text-crimson-500"
                        >
                          <span className="font-display">
                            {classificationLabel(c)}
                          </span>
                          <span className="text-xl text-chrome-400">
                            {hasGames
                              ? week !== null
                                ? `View Week ${week} Preview →`
                                : "View Preview →"
                              : "No games this week"}
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
