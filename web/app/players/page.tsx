import Link from "next/link";
import { loadDataset, currentSeason } from "@/lib/data-server";
import { PositionFilter } from "@/components/filters/position-filter";
import { JerseyAvatar } from "@/components/player/jersey-avatar";
import { playerImpactScore } from "@/lib/stats";
import { classificationLabel } from "@/lib/team-format";

export default async function PlayersPage({
  searchParams,
}: { searchParams: Promise<{ pos?: string; class?: string }> }) {
  const sp = await searchParams;
  const season = await currentSeason();
  const data = await loadDataset(season);
  const pos = sp.pos ?? null;
  const cls = sp.class ?? null;

  let players = data.players;
  if (pos) players = players.filter((p) => p.position === pos);
  if (cls) players = players.filter((p) => p.class === cls);

  players = [...players].sort(
    (a, b) =>
      playerImpactScore(b) - playerImpactScore(a) || a.name.localeCompare(b.name),
  );

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between mb-6">
        <h1 className="font-display text-4xl">Players</h1>
        <span className="text-chrome-500 text-sm">{players.length.toLocaleString()} listed</span>
      </div>
      <div className="mb-6"><PositionFilter /></div>
      {data.players.length === 0 && (
        <div className="rounded-xl border border-chrome-500/15 p-12 text-center">
          <p className="font-display text-2xl mb-2">No players yet for {season}</p>
          <p className="text-chrome-500 text-sm">
            The {season} season hasn&apos;t started yet. Check back in September.
          </p>
        </div>
      )}
      {data.players.length > 0 && (
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
                <span className="text-xs text-chrome-500">{team ? classificationLabel(team.classification) : ""}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      )}
      {data.players.length > 0 && players.length > 200 && (
        <p className="text-xs text-chrome-500 mt-4 text-center">
          Showing the top 200 by season production. Use search (Ctrl+F) to find specific players.
        </p>
      )}
    </main>
  );
}
