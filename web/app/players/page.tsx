import Link from "next/link";
import { loadDataset } from "@/lib/data-server";
import { PositionFilter } from "@/components/filters/position-filter";
import { JerseyAvatar } from "@/components/player/jersey-avatar";

export default async function PlayersPage({
  searchParams,
}: { searchParams: Promise<{ pos?: string; class?: string }> }) {
  const sp = await searchParams;
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  const pos = sp.pos ?? null;
  const cls = sp.class ?? null;

  let players = data.players;
  if (pos) players = players.filter((p) => p.position === pos);
  if (cls) players = players.filter((p) => p.class === cls);

  players = [...players].sort((a, b) => {
    if (pos) {
      const aTotal = a.stats.passing.yds + a.stats.rushing.yds + a.stats.receiving.yds;
      const bTotal = b.stats.passing.yds + b.stats.rushing.yds + b.stats.receiving.yds;
      return bTotal - aTotal;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between mb-6">
        <h1 className="font-display text-4xl">Players</h1>
        <span className="text-chrome-500 text-sm">{players.length.toLocaleString()} listed</span>
      </div>
      <div className="mb-6"><PositionFilter /></div>
      <ul className="divide-y divide-chrome-500/15 rounded-xl border border-chrome-500/15 overflow-hidden">
        {players.slice(0, 200).map((p) => {
          const team = data.teamsById.get(p.teamId);
          return (
            <li key={p.id}>
              <Link href={`/players/${p.id}` as any} className="flex items-center gap-3 px-3 py-2 hover:bg-navy-700/40">
                <JerseyAvatar jersey={p.jersey} size={32} />
                <div className="flex-1">
                  <div className="text-sm">{p.name}</div>
                  <div className="text-xs text-chrome-500">{p.position} · {p.class} · {team?.name}</div>
                </div>
                <span className="text-xs text-chrome-500">{team?.classification}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {players.length > 200 && (
        <p className="text-xs text-chrome-500 mt-4 text-center">
          Showing first 200. Use the search palette (⌘K) to find specific players.
        </p>
      )}
    </main>
  );
}
