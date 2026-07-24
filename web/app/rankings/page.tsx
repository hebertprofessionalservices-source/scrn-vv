import Link from "next/link";
import { loadDataset, currentSeason } from "@/lib/data-server";
import { buildPowerRankings } from "@/lib/power";
import { TeamLogo } from "@/components/brand/team-logo";
import { displaySlug } from "@/lib/display-slug";
import { classificationLabel, leagueOf } from "@/lib/team-format";
import { RankingsFilter } from "@/components/filters/rankings-filter";

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const sp = await searchParams;
  const league = sp.league === "MHSAA" || sp.league === "MAIS" ? sp.league : null;
  const season = await currentSeason();
  const data = await loadDataset(season);
  const power = buildPowerRankings(data);

  const rows = data.teams
    .map((t) => ({ team: t, rank: power.get(t.id) }))
    .filter((r) => r.rank !== undefined)
    .filter((r) => !league || leagueOf(r.team.classification) === league)
    .sort((a, b) => a.rank!.overallRank - b.rank!.overallRank)
    // League views renumber 1..N within the league; Overall keeps the
    // global rank.
    .map((r, i) => ({ ...r, shownRank: league ? i + 1 : r.rank!.overallRank }));

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-4xl">SCRN Power Rankings</h1>
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
          {rows.map(({ team, rank, shownRank }) => (
            <Link
              key={team.id}
              href={`/teams/${displaySlug(team)}` as any}
              className="flex items-center gap-3 rounded-xl border border-chrome-500/15 bg-navy-700/40 hover:border-crimson-500 px-4 py-2.5"
            >
              <span className="font-display text-2xl text-crimson-500 w-16 shrink-0">
                #{shownRank}
              </span>
              <TeamLogo src={team.logoUrl} size={32} />
              <span className="font-display text-xl text-chrome-100 truncate">
                {team.name}
              </span>
              <span className="ml-auto font-display text-lg text-chrome-100 whitespace-nowrap">
                (#{rank!.classRank} {classificationLabel(team.classification)})
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
