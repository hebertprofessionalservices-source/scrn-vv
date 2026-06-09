import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadDataset } from "@/lib/data-server";
import { TeamStatPanel } from "@/components/team/team-stat-panel";
import { JerseyAvatar } from "@/components/player/jersey-avatar";
import { Badge } from "@/components/ui/badge";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  const team = data.teamsBySlug.get(slug);
  if (!team) notFound();

  const players = data.playersByTeam.get(team.id) ?? [];
  const games = (data.gamesByTeam.get(team.id) ?? [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const groupedRoster = new Map<string, typeof players>();
  for (const p of players) {
    const list = groupedRoster.get(p.position) ?? [];
    list.push(p);
    groupedRoster.set(p.position, list);
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <header className="flex items-center gap-6">
        {team.logoUrl && (
          <Image
            src={team.logoUrl}
            alt=""
            width={96}
            height={96}
            className="h-24 w-24 object-contain"
            unoptimized
          />
        )}
        <div>
          <h1 className="font-display text-5xl">{team.name}</h1>
          <p className="text-chrome-500">{team.city}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge>{team.classification}</Badge>
            {team.district && <Badge variant="outline">{team.district}</Badge>}
            {team.headCoach && (
              <span className="text-sm text-chrome-300 ml-2">
                Coach {team.headCoach}
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/present/teams/${slug}` as any}
          className="ml-auto px-4 py-2 rounded-lg border border-crimson-500 text-crimson-500 font-display"
        >
          Broadcast →
        </Link>
      </header>

      <TeamStatPanel team={team} />

      <section>
        <h2 className="font-display text-2xl mb-3">Schedule</h2>
        <div className="rounded-xl border border-chrome-500/15 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-700/50 text-chrome-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Opponent</th>
                <th className="px-3 py-2 text-right">Result</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const isHome = g.homeTeamId === team.id;
                const oppId = isHome ? g.awayTeamId : g.homeTeamId;
                const opp = data.teamsById.get(oppId);
                const sf = isHome ? g.homeScore : g.awayScore;
                const sa = isHome ? g.awayScore : g.homeScore;
                return (
                  <tr key={g.id} className="border-t border-chrome-500/10">
                    <td className="px-3 py-2 text-chrome-300">{g.date}</td>
                    <td className="px-3 py-2">
                      {isHome ? "vs " : "@ "}
                      {opp ? opp.name : oppId.replace(/-/g, " ")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {g.status === "final" && sf !== null && sa !== null
                        ? `${sf > sa ? "W" : "L"} ${sf}–${sa}`
                        : g.status === "scheduled"
                          ? "—"
                          : g.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl mb-3">Roster</h2>
        <div className="space-y-4">
          {Array.from(groupedRoster.entries()).map(([pos, list]) => (
            <div key={pos}>
              <h3 className="text-xs uppercase tracking-wider text-chrome-500 mb-2">
                {pos}
              </h3>
              <div className="flex flex-wrap gap-3">
                {list.map((p) => (
                  <Link
                    key={p.id}
                    href={`/players/${p.id}` as any}
                    className="flex items-center gap-2 rounded-lg border border-chrome-500/15 px-2 py-1 hover:border-crimson-500"
                  >
                    <JerseyAvatar
                      jersey={p.jersey}
                      primary={team.colors.primary}
                      secondary={team.colors.secondary}
                      size={32}
                    />
                    <div>
                      <div className="text-sm">{p.name}</div>
                      <div className="text-[10px] text-chrome-500">{p.class}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export async function generateStaticParams() {
  const { loadDataset } = await import("@/lib/data-server");
  const { displaySlug } = await import("@/lib/display-slug");
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  return data.teams.map((t) => ({ slug: displaySlug(t) }));
}
