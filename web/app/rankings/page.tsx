import Link from "next/link";
import { loadDataset, loadRankDeltas, currentSeason } from "@/lib/data-server";
import { buildPowerRankings } from "@/lib/power";
import { RankDeltaChip } from "@/components/rank-delta";
import { teamRecordSplits } from "@/lib/standings";
import { TeamLogo } from "@/components/brand/team-logo";
import { displaySlug } from "@/lib/display-slug";
import { CLASSIFICATIONS, classificationLabel, leagueOf } from "@/lib/team-format";
import { RankingsFilter } from "@/components/filters/rankings-filter";

const CLASS_VIEW_LIMIT = 10;

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string; class?: string }>;
}) {
  const sp = await searchParams;
  const league = sp.league === "MHSAA" || sp.league === "MAIS" ? sp.league : null;
  const cls =
    sp.class &&
    CLASSIFICATIONS.includes(sp.class) &&
    (!league || leagueOf(sp.class) === league)
      ? sp.class
      : null;
  const season = await currentSeason();
  const data = await loadDataset(season);
  const power = buildPowerRankings(data);
  const deltas = await loadRankDeltas(season, power);

  const rows = data.teams
    .map((t) => ({ team: t, rank: power.get(t.id) }))
    // Ranks are MaxPreps' own, so a team they don't rank has no row here.
    .filter((r) => r.rank !== undefined && r.rank.overallRank !== null)
    .filter((r) => !league || leagueOf(r.team.classification) === league)
    .filter((r) => !cls || r.team.classification === cls)
    .sort((a, b) => a.rank!.overallRank! - b.rank!.overallRank!)
    // Filtered views renumber 1..N within the view; Overall keeps the
    // global rank.
    .map((r, i) => ({
      ...r,
      shownRank: league || cls ? i + 1 : r.rank!.overallRank,
      // Classification view: top 10 with each team's region record.
      regionRecord: cls ? teamRecordSplits(data, r.team).region : null,
    }))
    .slice(0, cls ? CLASS_VIEW_LIMIT : undefined);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-4xl">Rankings</h1>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <label className="text-xs uppercase tracking-wider text-chrome-500">League</label>
        <RankingsFilter />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-chrome-500/15 p-12 text-center">
          <p className="font-display text-2xl mb-2">No rankings yet for {season}</p>
          <p className="text-chrome-500 text-sm">
            Rankings appear once ratings are available.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(({ team, rank, shownRank, regionRecord }) => (
            <Link
              key={team.id}
              href={`/teams/${displaySlug(team)}` as any}
              className="flex items-center gap-3 rounded-xl border border-chrome-500/15 bg-navy-700/40 hover:border-crimson-500 px-4 py-2.5"
            >
              <span className="font-display text-2xl text-crimson-500 w-16 shrink-0">
                #{shownRank}
              </span>
              <span className="w-12 shrink-0 text-sm">
                {/* Class view moves by class rank; other views by overall. */}
                <RankDeltaChip
                  delta={cls ? deltas.get(team.id)?.class : deltas.get(team.id)?.overall}
                />
              </span>
              <TeamLogo src={team.logoUrl} size={32} />
              <span className="font-display text-xl text-chrome-100 truncate">
                {team.name}
              </span>
              <span className="ml-auto font-display text-lg text-chrome-100 whitespace-nowrap">
                {regionRecord
                  ? `Region ${regionRecord.wins}–${regionRecord.losses}`
                  : `(#${rank!.classRank} ${classificationLabel(team.classification)})`}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
