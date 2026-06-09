import { loadDataset } from "@/lib/data-server";
import { topPlayersByStat, topDefensesByPPG } from "@/lib/stats";

export default async function PresentHome() {
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  const topQBs = topPlayersByStat(data.players, "QB", (p) => p.stats.passing.yds, 3);
  const topRBs = topPlayersByStat(data.players, "RB", (p) => p.stats.rushing.yds, 3);
  const topDef = topDefensesByPPG(data.teams, 3);

  return (
    <>
      <h1 className="font-display">MS HS FOOTBALL · TOP PERFORMERS</h1>
      <h2 className="font-display mt-6">Top 3 Quarterbacks</h2>
      <ol className="space-y-2 mt-2 text-3xl font-display">
        {topQBs.map((p, i) => (
          <li key={p.id}>#{i + 1} {p.name} · {p.stats.passing.yds.toLocaleString()} YDS · {p.stats.passing.td} TD</li>
        ))}
      </ol>
      <h2 className="font-display mt-8">Top 3 Running Backs</h2>
      <ol className="space-y-2 mt-2 text-3xl font-display">
        {topRBs.map((p, i) => (
          <li key={p.id}>#{i + 1} {p.name} · {p.stats.rushing.yds.toLocaleString()} YDS · {p.stats.rushing.td} TD</li>
        ))}
      </ol>
      <h2 className="font-display mt-8">Top 3 Defenses</h2>
      <ol className="space-y-2 mt-2 text-3xl font-display">
        {topDef.map((d, i) => (
          <li key={d.team.id}>#{i + 1} {d.team.name} · {d.ppg.toFixed(1)} PA/G</li>
        ))}
      </ol>
    </>
  );
}
