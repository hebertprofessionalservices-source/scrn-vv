import Link from "next/link";
import { loadDataset, currentSeason } from "@/lib/data-server";
import { TeamLogo } from "@/components/brand/team-logo";
import { formatGameDate } from "@/lib/format-date";
import { leagueOf, titleCaseSlug } from "@/lib/team-format";
import { todayCentral } from "@/lib/upcoming";
import { mondayOf } from "@/lib/rank-history";
import type { Dataset } from "@/lib/data";
import type { Game } from "@/lib/types";

function dayLabel(dateISO: string): string {
  return new Date(`${dateISO}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

export default async function SchedulesPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const sp = await searchParams;
  const season = await currentSeason();
  const data = await loadDataset(season);

  // Season weeks (Monday-anchored), numbered like the rest of the site.
  const weekKeys = [...new Set(data.games.map((g) => mondayOf(g.date)))].sort();
  const weeks = weekKeys.map((key, i) => ({ key, label: `Week ${i + 1}` }));

  // Default to the current week, else the next week with games, else the last.
  const todayWeek = mondayOf(todayCentral());
  let defaultIdx = weekKeys.findIndex((k) => k >= todayWeek);
  if (defaultIdx === -1) defaultIdx = weeks.length - 1;
  const requested = Number(sp.week);
  const idx =
    Number.isInteger(requested) && requested >= 1 && requested <= weeks.length
      ? requested - 1
      : defaultIdx;
  const week = weeks[idx];

  const weekGames = week
    ? data.games
        .filter((g) => mondayOf(g.date) === week.key)
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  // MHSAA slate first, MAIS below; each grouped by day.
  const gameLeague = (g: Game): "MHSAA" | "MAIS" => {
    const t =
      data.teamsByAlias.get(g.homeTeamId) ?? data.teamsByAlias.get(g.awayTeamId);
    return t ? leagueOf(t.classification) : "MHSAA";
  };
  const leagues = (["MHSAA", "MAIS"] as const)
    .map((league) => {
      const byDay = new Map<string, Game[]>();
      for (const g of weekGames) {
        if (gameLeague(g) !== league) continue;
        const day = g.date.slice(0, 10);
        const list = byDay.get(day) ?? [];
        list.push(g);
        byDay.set(day, list);
      }
      return { league, byDay };
    })
    .filter((l) => l.byDay.size > 0);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-8">
        <div>
          {idx > 0 && (
            <a
              href={`/upcoming?week=${idx}`}
              className="inline-block px-4 py-2 rounded-lg border border-chrome-500/30 font-display hover:border-crimson-500"
            >
              ← {weeks[idx - 1].label}
            </a>
          )}
        </div>
        <h1 className="font-display text-4xl text-center">
          {week ? week.label : "Schedules"}
        </h1>
        <div className="text-right">
          {idx < weeks.length - 1 && (
            <a
              href={`/upcoming?week=${idx + 2}`}
              className="inline-block px-4 py-2 rounded-lg border border-chrome-500/30 font-display hover:border-crimson-500"
            >
              {weeks[idx + 1].label} →
            </a>
          )}
        </div>
      </div>

      {weekGames.length === 0 ? (
        <div className="rounded-xl border border-chrome-500/15 p-12 text-center">
          <p className="font-display text-2xl mb-2">No games scheduled</p>
          <p className="text-chrome-500 text-sm">
            Check back when the season is underway.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {leagues.map(({ league, byDay }) => (
            <section key={league}>
              <h2 className="font-display text-3xl mb-4 border-b border-chrome-500/15 pb-2">
                {league}
              </h2>
              <div className="space-y-8">
                {[...byDay.entries()].map(([day, games]) => (
                  <section key={day}>
                    <h3 className="font-display text-2xl mb-3">
                      {dayLabel(day)}
                      <span className="ml-3 text-base text-chrome-500">
                        {formatGameDate(day)}
                      </span>
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {games.map((g) => (
                        <GameCard key={g.id} game={g} data={data} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function GameCard({ game, data }: { game: Game; data: Dataset }) {
  const away = data.teamsByAlias.get(game.awayTeamId);
  const home = data.teamsByAlias.get(game.homeTeamId);
  const matchupHref =
    away && home ? `/matchup?a=${away.id}&b=${home.id}` : null;
  const isFinal =
    game.status === "final" && game.homeScore !== null && game.awayScore !== null;

  const score = (mine: number, theirs: number) => (
    <span className={`text-sm font-display ${mine > theirs ? "text-chrome-100" : "text-chrome-500"}`}>
      {mine}
    </span>
  );

  const card = (
    <div className="rounded-xl border border-chrome-500/15 bg-navy-700/30 px-4 py-3 hover:border-crimson-500 h-full">
      <div className="flex items-center gap-2">
        <TeamLogo src={away?.logoUrl ?? null} size={28} />
        <span className="text-sm flex-1">
          {away?.name ?? titleCaseSlug(game.awayTeamId)}
        </span>
        {isFinal ? (
          score(game.awayScore!, game.homeScore!)
        ) : (
          <span className="text-xs text-chrome-500">
            {away ? `${away.record.wins}–${away.record.losses}` : ""}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <TeamLogo src={home?.logoUrl ?? null} size={28} />
        <span className="text-sm flex-1">
          @ {home?.name ?? titleCaseSlug(game.homeTeamId)}
        </span>
        {isFinal ? (
          score(game.homeScore!, game.awayScore!)
        ) : (
          <span className="text-xs text-chrome-500">
            {home ? `${home.record.wins}–${home.record.losses}` : ""}
          </span>
        )}
      </div>
      <div className="text-xs text-chrome-500 mt-2">
        {isFinal ? "Final" : formatGameDate(game.date)}
        {game.venue ? ` · ${game.venue}` : ""}
      </div>
    </div>
  );

  return matchupHref ? (
    <Link href={matchupHref as any}>{card}</Link>
  ) : (
    <div>{card}</div>
  );
}
