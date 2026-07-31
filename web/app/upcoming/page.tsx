import { loadDataset, currentSeason } from "@/lib/data-server";
import { formatGameDate } from "@/lib/format-date";
import { leagueOf, titleCaseSlug } from "@/lib/team-format";
import { todayCentral } from "@/lib/upcoming";
import { mondayOf } from "@/lib/rank-history";
import {
  ScheduleWeek,
  type ScheduleCard,
  type ScheduleLeague,
} from "@/components/schedule/schedule-week";
import type { Dataset } from "@/lib/data";
import type { Game } from "@/lib/types";

function dayLabel(dateISO: string): string {
  return new Date(`${dateISO}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

function toCard(game: Game, data: Dataset): ScheduleCard {
  const away = data.teamsByAlias.get(game.awayTeamId);
  const home = data.teamsByAlias.get(game.homeTeamId);
  const isFinal =
    game.status === "final" && game.homeScore !== null && game.awayScore !== null;
  const side = (t: typeof away, raw: string, mine: number | null, theirs: number | null) => ({
    name: t?.name ?? titleCaseSlug(raw),
    logo: t?.logoUrl ?? null,
    sub: isFinal
      ? String(mine)
      : t
        ? `${t.record.wins}–${t.record.losses}`
        : "",
  });
  return {
    id: game.id,
    href: away && home ? `/matchup?a=${away.id}&b=${home.id}` : null,
    away: side(away, game.awayTeamId, game.awayScore, game.homeScore),
    home: side(home, game.homeTeamId, game.homeScore, game.awayScore),
    awayBold: isFinal && game.awayScore! > game.homeScore!,
    homeBold: isFinal && game.homeScore! > game.awayScore!,
    footer:
      (isFinal ? "Final" : formatGameDate(game.date)) +
      (game.venue ? ` · ${game.venue}` : ""),
  };
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
  const leagues: ScheduleLeague[] = (["MHSAA", "MAIS"] as const)
    .map((league) => {
      const byDay = new Map<string, ScheduleCard[]>();
      for (const g of weekGames) {
        if (gameLeague(g) !== league) continue;
        const day = g.date.slice(0, 10);
        const list = byDay.get(day) ?? [];
        list.push(toCard(g, data));
        byDay.set(day, list);
      }
      return {
        league,
        days: [...byDay.entries()].map(([day, games]) => ({
          day,
          weekday: dayLabel(day),
          dateLabel: formatGameDate(day),
          games,
        })),
      };
    })
    .filter((l) => l.days.length > 0);

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

      <ScheduleWeek leagues={leagues} />
    </main>
  );
}
