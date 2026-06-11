import Link from "next/link";
import { loadDataset, currentSeason } from "@/lib/data-server";
import { TeamLogo } from "@/components/brand/team-logo";
import { formatGameDate } from "@/lib/format-date";
import { titleCaseSlug } from "@/lib/team-format";
import { closestWeekend, todayCentral, upcomingGamesOn } from "@/lib/upcoming";
import type { Dataset } from "@/lib/data";
import type { Game } from "@/lib/types";

export default async function UpcomingGamesPage() {
  const season = await currentSeason();
  const data = await loadDataset(season);

  const today = todayCentral();
  const { friday, saturday } = closestWeekend(today);
  const days = [
    { label: "Friday", games: upcomingGamesOn(data.games, friday, today) },
    { label: "Saturday", games: upcomingGamesOn(data.games, saturday, today) },
  ].filter((d) => d.games.length > 0);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-display text-4xl mb-6">Upcoming Games</h1>
      {days.length === 0 ? (
        <div className="rounded-xl border border-chrome-500/15 p-12 text-center">
          <p className="font-display text-2xl mb-2">No upcoming games</p>
          <p className="text-chrome-500 text-sm">
            Check back when the season is underway.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {days.map((day) => (
            <section key={day.label}>
              <h2 className="font-display text-2xl mb-3">
                {day.label}
                <span className="ml-3 text-base text-chrome-500">
                  {formatGameDate(day.games[0].date.slice(0, 10))}
                </span>
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {day.games.map((g) => (
                  <UpcomingGameCard key={g.id} game={g} data={data} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function UpcomingGameCard({ game, data }: { game: Game; data: Dataset }) {
  const away = data.teamsByAlias.get(game.awayTeamId);
  const home = data.teamsByAlias.get(game.homeTeamId);
  const matchupHref =
    away && home ? `/matchup?a=${away.id}&b=${home.id}` : null;

  const card = (
    <div className="rounded-xl border border-chrome-500/15 bg-navy-700/30 px-4 py-3 hover:border-crimson-500 h-full">
      <div className="flex items-center gap-2">
        <TeamLogo src={away?.logoUrl ?? null} size={28} />
        <span className="text-sm flex-1">
          {away?.name ?? titleCaseSlug(game.awayTeamId)}
        </span>
        <span className="text-xs text-chrome-500">
          {away ? `${away.record.wins}–${away.record.losses}` : ""}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <TeamLogo src={home?.logoUrl ?? null} size={28} />
        <span className="text-sm flex-1">
          @ {home?.name ?? titleCaseSlug(game.homeTeamId)}
        </span>
        <span className="text-xs text-chrome-500">
          {home ? `${home.record.wins}–${home.record.losses}` : ""}
        </span>
      </div>
      <div className="text-xs text-chrome-500 mt-2">
        {formatGameDate(game.date)}
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
