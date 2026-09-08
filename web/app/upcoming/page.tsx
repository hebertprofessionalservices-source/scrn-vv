import { loadDataset, currentSeason } from "@/lib/data-server";
import { formatGameDate } from "@/lib/format-date";
import { leagueOf, titleCaseSlug } from "@/lib/team-format";
import { leagueWeek } from "@/lib/newspaper";
import { todayCentral } from "@/lib/upcoming";
import { mondayOf } from "@/lib/rank-history";
import {
  ScheduleWeek,
  type ScheduleCard,
  type ScheduleLeague,
  type WeekOption,
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
    // Opponents outside our team set still have a crest on file.
    logo: t?.logoUrl ?? data.opponentLogos.get(raw) ?? null,
    sub: isFinal
      ? String(mine)
      : t
        ? `${t.record.wins}–${t.record.losses}`
        : "",
  });
  return {
    id: game.id,
    // A played game opens its box score; an upcoming one opens the matchup.
    href: isFinal
      ? `/game/${game.id}`
      : away && home
        ? `/matchup?a=${away.id}&b=${home.id}`
        : null,
    // Both sides, so a cross-class game shows under either classification.
    classes: [
      ...new Set(
        [away?.classification, home?.classification].filter(Boolean) as string[],
      ),
    ],
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
  searchParams: Promise<{ week?: string; league?: string; cls?: string }>;
}) {
  const sp = await searchParams;
  const season = await currentSeason();
  const data = await loadDataset(season);

  /*
   * Every week carries BOTH leagues' own numbers, because they do not agree:
   * MAIS opens two weeks earlier but calls its first slate Week 0, so its
   * number runs one ahead of MHSAA's all season. The label shown depends on
   * which league is filtered — see weekLabel in the client component.
   */
  const weekKeys = [...new Set(data.games.map((g) => mondayOf(g.date)))].sort();
  const weeks: WeekOption[] = weekKeys.map((key) => ({
    key,
    mais: leagueWeek(season, "MAIS", key),
    mhsaa: leagueWeek(season, "MHSAA", key),
  }));

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
      {/* Header, week navigation and the filter row all live in the client
          component: the week label depends on the selected league, and the
          filters have to survive a week change. */}
      <ScheduleWeek
        leagues={leagues}
        weeks={weeks}
        weekIndex={idx}
        initialLeague={sp.league ?? ""}
        initialCls={sp.cls ?? ""}
      />
    </main>
  );
}
