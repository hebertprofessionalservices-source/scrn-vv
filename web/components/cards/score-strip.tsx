import Link from "next/link";
import { displaySlug } from "@/lib/display-slug";
import type { Game, Team } from "@/lib/types";

export function ScoreStrip({
  games, teamsById,
}: { games: Game[]; teamsById: Map<string, Team> }) {
  if (games.length === 0) {
    return <p className="text-chrome-500 text-sm">No finals from last week.</p>;
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {games.map((g) => {
        const away = teamsById.get(g.awayTeamId);
        const home = teamsById.get(g.homeTeamId);
        const awayWin = (g.awayScore ?? 0) > (g.homeScore ?? 0);
        const matchupHref = away && home
          ? `/matchup/${displaySlug(away)}-vs-${displaySlug(home)}`
          : null;
        const content = (
          <div className="rounded-lg border border-chrome-500/15 px-3 py-2 hover:border-crimson-500 text-sm">
            <div className="flex items-center justify-between">
              <span className={awayWin ? "font-semibold" : "text-chrome-300"}>
                {away?.name ?? g.awayTeamId.replace(/-/g, " ")}
              </span>
              <span className="font-display">{g.awayScore ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={!awayWin ? "font-semibold" : "text-chrome-300"}>
                {home?.name ?? g.homeTeamId.replace(/-/g, " ")}
              </span>
              <span className="font-display">{g.homeScore ?? "—"}</span>
            </div>
            <div className="text-[10px] text-chrome-500 mt-1">{g.date}</div>
          </div>
        );
        return matchupHref
          ? <Link key={g.id} href={matchupHref as any}>{content}</Link>
          : <div key={g.id}>{content}</div>;
      })}
    </div>
  );
}
