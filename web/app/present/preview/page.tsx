import { currentSeason, loadDataset } from "@/lib/data-server";
import { leagueWeek, neighborWeeks, seasonWeeks } from "@/lib/newspaper";
import { currentWeekRange, slateDates } from "@/lib/preview";
import { classificationLabel } from "@/lib/team-format";
import { formatGameDate } from "@/lib/format-date";
import type { Classification } from "@/lib/types";
import { WeekNav } from "@/components/present/week-nav";

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

export default async function PreviewIndex({
  searchParams,
}: {
  searchParams: Promise<{ dates?: string }>;
}) {
  const sp = await searchParams;
  const season = await currentSeason();
  const data = await loadDataset(season);
  const today = new Date().toISOString().slice(0, 10);
  const override = (sp.dates ?? "").split(",").map((d) => d.trim()).filter(Boolean);
  const [monday, sunday] = currentWeekRange(override[0] ?? today);
  const dates = slateDates(data.games, [monday, sunday]);
  const first = dates[0];

  // Prev/next week arrows: any week with a game anywhere in the state, so
  // browsing forward or back never lands on a page with nothing to show.
  const allWeeks = seasonWeeks(data.games);
  const mondays = [...allWeeks.keys()].sort();
  const { prev: prevMonday, next: nextMonday } = neighborWeeks(mondays, monday);
  const weekHref = (m: string): string =>
    `/present/preview?dates=${(allWeeks.get(m) ?? [m]).join(",")}`;
  const prevHref = prevMonday ? weekHref(prevMonday) : null;
  const nextHref = nextMonday ? weekHref(nextMonday) : null;

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

  // Falls back to the week's known games when nothing is left unplayed in it
  // (e.g. an overridden past week), so the badge still reads "Week N".
  const weekAnchor = first ?? allWeeks.get(monday)?.[0] ?? monday;

  return (
    <>
      <WeekNav prevHref={prevHref} nextHref={nextHref} />
      <h1 className="font-display">Week Ahead Preview Pages</h1>
      <p className="text-2xl text-chrome-300 mt-3">
        {`${formatGameDate(monday).replace(/, \d{4}$/, "")} – ${formatGameDate(sunday)}`}
        {dates.length === 0 ? " — no games scheduled." : ""}
      </p>

      <div className="grid grid-cols-2 gap-16 mt-10">
        {COLUMNS.map(({ league, classes }) => {
          const week = leagueWeek(season, league, weekAnchor);
          const dateQuery = dates.length > 0 ? dates.join(",") : monday;
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
                          href={`/present/preview/${encodeURIComponent(c)}?dates=${dateQuery}`}
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
