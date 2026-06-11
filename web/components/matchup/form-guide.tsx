import { formatGameDate } from "@/lib/format-date";
import type { Game } from "@/lib/types";

export function FormGuide({ teamId, games }: { teamId: string; games: Game[] }) {
  const last5 = games
    .filter((g) => g.status === "final")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .reverse();
  return (
    <div className="flex items-center gap-1">
      {last5.map((g) => {
        const isHome = g.homeTeamId === teamId;
        const sf = isHome ? g.homeScore : g.awayScore;
        const sa = isHome ? g.awayScore : g.homeScore;
        if (sf == null || sa == null) return <span key={g.id} className="w-6 h-6 rounded bg-chrome-500/20" />;
        const win = sf > sa;
        return (
          <span key={g.id}
            title={`${formatGameDate(g.date)}: ${sf}-${sa}`}
            className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${win ? "bg-green-600/70" : "bg-crimson-600/80"}`}>
            {win ? "W" : "L"}
          </span>
        );
      })}
      {last5.length === 0 && <span className="text-xs text-chrome-500">No games played</span>}
    </div>
  );
}
