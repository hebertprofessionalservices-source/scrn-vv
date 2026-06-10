import { loadDataset, currentSeason } from "@/lib/data-server";
import { MatchupPicker, type MatchupTeam } from "@/components/matchup/matchup-picker";

export default async function MatchupBuilderPage() {
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
        <MatchupPicker teams={teams} />
      )}
    </main>
  );
}
