import { loadDataset, currentSeason } from "@/lib/data-server";
import { MatchupPicker, type MatchupTeam } from "@/components/matchup/matchup-picker";
import { KeyPlayers } from "@/components/matchup/key-players";
import { SeriesHistory } from "@/components/matchup/series-history";
import { buildStorylines } from "@/lib/storylines";
import { loadHistory } from "@/lib/history-server";
import { buildMatchupHistory } from "@/lib/matchup-history";

// Storylines / Key Players / Coaches / Series History hidden from production
// until client revisions land. Flip to true to bring them back.
const SHOW_MATCHUP_EXTRAS = true;

export default async function MatchupBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const sp = await searchParams;
  const season = await currentSeason();
  const data = await loadDataset(season);

  const teams: MatchupTeam[] = data.teams
    .map((t) => ({
      id: t.id,
      name: t.name,
      logoUrl: t.logoUrl,
      classification: t.classification,
      district: t.district,
      record: { wins: t.record.wins, losses: t.record.losses },
      stateRank: t.rankings.stateOverall,
      stats: {
        pointsFor: t.stats.pointsFor,
        pointsAgainst: t.stats.pointsAgainst,
        yardsFor: t.stats.yardsFor,
        passYdsFor: t.stats.passYdsFor,
        rushYdsFor: t.stats.rushYdsFor,
        turnoversForced: t.stats.turnoversForced,
        turnoversLost: t.stats.turnoversLost,
      },
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-4xl">Match Up</h1>
        <p className="text-chrome-500 text-sm mt-1">
          Compare any two teams side by side.
        </p>
      </div>
      {teams.length === 0 ? (
        <div className="rounded-xl border border-chrome-500/15 p-12 text-center">
          <p className="font-display text-2xl mb-2">No teams yet for {season}</p>
          <p className="text-chrome-500 text-sm">
            The {season} season hasn&apos;t started yet. Check back in September.
          </p>
        </div>
      ) : (
        <MatchupPicker
          teams={teams}
          initialA={teams.some((t) => t.id === sp.a) ? sp.a : ""}
          initialB={teams.some((t) => t.id === sp.b) ? sp.b : ""}
        />
      )}
      <MatchupExtras a={sp.a} b={sp.b} data={data} season={season} />
    </main>
  );
}

/** Storylines, key players, and series history for the selected pair. */
async function MatchupExtras({
  a,
  b,
  data,
  season,
}: {
  a?: string;
  b?: string;
  data: Awaited<ReturnType<typeof loadDataset>>;
  season: string;
}) {
  if (!SHOW_MATCHUP_EXTRAS) return null;
  const teamA = a ? data.teamsById.get(a) : undefined;
  const teamB = b ? data.teamsById.get(b) : undefined;
  if (!teamA || !teamB || teamA.id === teamB.id) return null;

  const h2h = (data.gamesByTeam.get(teamA.id) ?? []).filter(
    (g) => g.homeTeamId === teamB.id || g.awayTeamId === teamB.id,
  );
  const history = await loadHistory();
  const historyView = buildMatchupHistory(history, teamA, teamB, Number(season.slice(0, 4)));
  const storylines = [
    ...buildStorylines(data, teamA, teamB, h2h),
    ...historyView.milestones,
  ].slice(0, 8);

  return (
    <div className="mt-8 space-y-8">
      {storylines.length > 0 && (
        <section className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 p-5">
          <h2 className="font-display text-xl mb-3">Storylines</h2>
          <ul className="space-y-2 text-sm">
            {storylines.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-crimson-500 shrink-0">—</span>
                <span className="text-chrome-100">{line}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <KeyPlayers away={teamA} home={teamB} playersByTeam={data.playersByTeam} />
      <SeriesHistory away={teamA} home={teamB} h2h={h2h} view={historyView} />
    </div>
  );
}
