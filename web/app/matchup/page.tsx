import { loadDataset, loadPriorSeasonInfo, loadRankDeltas, currentSeason } from "@/lib/data-server";
import { MatchupPicker, type MatchupTeam, type PairOutlook } from "@/components/matchup/matchup-picker";
import { KeyPlayers } from "@/components/matchup/key-players";
import { KeyReturnersSection } from "@/components/matchup/key-returners";
import { SeriesHistory } from "@/components/matchup/series-history";
import { buildStorylines } from "@/lib/storylines";
import { loadHistory } from "@/lib/history-server";
import { buildMatchupHistory } from "@/lib/matchup-history";
import { buildPowerRankings } from "@/lib/power";
import { buildRatings, matchupPlayoffOutlook, playoffPotentials } from "@/lib/standings";
import { buildTeamEfficiency } from "@/lib/efficiency";
import { runPassAttempts } from "@/lib/run-pass";
import { buildMatchupSide } from "@/lib/team-outlook";
import { matchupKeyLeaders } from "@/lib/game-leaders";
import { displaySlug } from "@/lib/display-slug";

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

  const power = buildPowerRankings(data);
  const potentials = playoffPotentials(data);
  const rate = buildRatings(data);
  const efficiency = buildTeamEfficiency(data);
  const prior = await loadPriorSeasonInfo(season);
  const deltas = await loadRankDeltas(season, power);

  const teams: MatchupTeam[] = data.teams
    .map((t) => {
      const p = power.get(t.id);
      const d = deltas.get(t.id);
      const runPass = runPassAttempts(data.playersByTeam.get(t.id) ?? []);
      return {
        id: t.id,
        slug: displaySlug(t),
        name: t.name,
        logoUrl: t.logoUrl,
        classification: t.classification,
        district: t.district,
        record: { wins: t.record.wins, losses: t.record.losses },
        power: p
          ? {
              overall: p.overallRank,
              cls: p.classRank,
              priorYear:
                p.source === "prior" ? prior?.season.slice(0, 4) ?? "prior" : null,
              deltaOverall: d?.overall ?? null,
              deltaClass: d?.class ?? null,
            }
          : null,
        rating: p?.rating ?? null,
        playoffPct: potentials.get(t.id) ?? null,
        runPass,
        side: buildMatchupSide(data, t, {
          rate,
          efficiency: efficiency.get(t.id) ?? null,
          runPass,
          retOff: prior?.returningOffense.get(t.id) ?? null,
          retAll: prior?.returning.get(t.id) ?? null,
        }),
        stats: {
          pointsFor: t.stats.pointsFor,
          pointsAgainst: t.stats.pointsAgainst,
          yardsFor: t.stats.yardsFor,
          passYdsFor: t.stats.passYdsFor,
          rushYdsFor: t.stats.rushYdsFor,
          turnoversForced: t.stats.turnoversForced,
          turnoversLost: t.stats.turnoversLost,
        },
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  let pairOutlook: PairOutlook | null = null;
  if (sp.a && sp.b && sp.a !== sp.b) {
    const outlook = matchupPlayoffOutlook(data, sp.a, sp.b);
    if (outlook) pairOutlook = { aId: sp.a, bId: sp.b, ...outlook };
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-4xl">Match Up</h1>
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
          pairOutlook={pairOutlook}
        >
          <MatchupExtras a={sp.a} b={sp.b} data={data} season={season} />
        </MatchupPicker>
      )}
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
  const prior = await loadPriorSeasonInfo(season);
  const keyLeaders = matchupKeyLeaders(
    data, teamA, teamB, h2h, prior?.returningPlayers ?? null,
  );

  return (
    <div className="mt-8 space-y-8">
      <KeyReturnersSection
        a={{ teamName: teamA.name, returners: prior?.keyReturners.get(teamA.id) ?? [] }}
        b={{ teamName: teamB.name, returners: prior?.keyReturners.get(teamB.id) ?? [] }}
      />
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
      <KeyPlayers away={teamA} home={teamB} leaders={keyLeaders} />
      <SeriesHistory away={teamA} home={teamB} h2h={h2h} view={historyView} />
    </div>
  );
}
