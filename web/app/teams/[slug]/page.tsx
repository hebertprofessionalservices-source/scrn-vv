import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadDataset, currentSeason } from "@/lib/data-server";
import { TeamStatPanel } from "@/components/team/team-stat-panel";
import { JerseyAvatar } from "@/components/player/jersey-avatar";
import { TeamLogo } from "@/components/brand/team-logo";
import { Badge } from "@/components/ui/badge";
import { displaySlug } from "@/lib/display-slug";
import { regionLabel, titleCaseSlug } from "@/lib/team-format";
import type { Player } from "@/lib/types";

// Offense first, then defense, then special teams.
const POSITION_ORDER = ["QB", "RB", "WR", "TE", "OL", "ATH", "DL", "LB", "DB", "K", "P"];

const MAX_ROSTER_ROWS = 5;

function rosterSortValue(p: Player): number {
  const s = p.stats;
  return (
    s.passing.yds + s.rushing.yds + s.receiving.yds +
    s.defense.tackles * 8 + s.kicking.xpm + s.kicking.fgm * 3
  );
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const season = await currentSeason();
  const data = await loadDataset(season);
  const team = data.teamsBySlug.get(slug);
  if (!team) notFound();

  const players = data.playersByTeam.get(team.id) ?? [];
  const games = (data.gamesByTeam.get(team.id) ?? [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  const groupedRoster = new Map<string, Player[]>();
  for (const p of players) {
    const list = groupedRoster.get(p.position) ?? [];
    list.push(p);
    groupedRoster.set(p.position, list);
  }
  const orderedPositions = [
    ...POSITION_ORDER.filter((pos) => groupedRoster.has(pos)),
    ...Array.from(groupedRoster.keys()).filter((pos) => !POSITION_ORDER.includes(pos)),
  ];

  const region = regionLabel(team);

  return (
    <main className="relative max-w-7xl mx-auto px-4 py-8 space-y-8">
      {team.logoUrl && (
        <div
          className="fixed inset-0 -z-10 flex items-center justify-center pointer-events-none"
          aria-hidden
        >
          <Image
            src={team.logoUrl}
            alt=""
            width={640}
            height={640}
            className="w-[55vmin] h-[55vmin] object-contain opacity-[0.05]"
            unoptimized
          />
        </div>
      )}

      <header className="flex items-center gap-6">
        <TeamLogo src={team.logoUrl} size={96} />
        <div>
          <h1 className="font-display text-5xl">{team.name}</h1>
          <p className="text-chrome-500">{team.city}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge>{team.classification}</Badge>
            {region && <Badge variant="outline">{region}</Badge>}
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
                const opp = data.teamsByAlias.get(oppId);
                const sf = isHome ? g.homeScore : g.awayScore;
                const sa = isHome ? g.awayScore : g.homeScore;
                return (
                  <tr key={g.id} className="border-t border-chrome-500/10">
                    <td className="px-3 py-2 text-chrome-300">{g.date}</td>
                    <td className="px-3 py-2">
                      {isHome ? "vs " : "@ "}
                      {opp ? (
                        <Link
                          href={`/teams/${displaySlug(opp)}` as any}
                          className="hover:text-crimson-500"
                        >
                          {opp.name}
                        </Link>
                      ) : (
                        titleCaseSlug(oppId)
                      )}
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
        <div className="space-y-6">
          {orderedPositions.map((pos) => {
            const list = (groupedRoster.get(pos) ?? [])
              .slice()
              .sort((a, b) => rosterSortValue(b) - rosterSortValue(a) || a.name.localeCompare(b.name));
            const rows = Math.min(MAX_ROSTER_ROWS, list.length);
            return (
              <div key={pos}>
                <h3 className="text-xs uppercase tracking-wider text-chrome-500 mb-2">
                  {pos}
                </h3>
                <div className="overflow-x-auto">
                  <div
                    className="grid grid-flow-col auto-cols-max gap-x-10 gap-y-1.5 w-max"
                    style={{ gridTemplateRows: `repeat(${rows}, minmax(0, auto))` }}
                  >
                    {list.map((p) => (
                      <Link
                        key={p.id}
                        href={`/players/${p.id}` as any}
                        className="flex items-center gap-2.5 rounded px-1 py-0.5 hover:bg-navy-700/40"
                      >
                        <JerseyAvatar
                          jersey={p.jersey}
                          primary={team.colors.primary}
                          secondary={team.colors.secondary}
                          size={28}
                        />
                        <span className="text-sm">{p.name}</span>
                        <span className="text-xs text-chrome-500">{p.class}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export async function generateStaticParams() {
  const { loadDataset, availableSeasons } = await import("@/lib/data-server");
  const { displaySlug } = await import("@/lib/display-slug");
  const seasons = await availableSeasons();
  const out: { slug: string }[] = [];
  for (const s of seasons) {
    const data = await loadDataset(s);
    for (const t of data.teams) {
      out.push({ slug: displaySlug(t) });
    }
  }
  // Dedupe
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.slug) ? false : (seen.add(p.slug), true)));
}
