import { loadDataset, currentSeason } from "@/lib/data-server";
import { ClassFilter } from "@/components/filters/class-filter";
import { TeamCard } from "@/components/cards/team-card";

export default async function TeamsPage({
  searchParams,
}: { searchParams: Promise<{ class?: string; sort?: string }> }) {
  const sp = await searchParams;
  const season = await currentSeason();
  const data = await loadDataset(season);
  const cls = sp.class ?? null;
  const sort = sp.sort ?? "name";

  let teams = data.teams;
  if (cls) teams = teams.filter((t) => t.classification === cls);

  teams = [...teams].sort((a, b) => {
    if (sort === "wins") return b.record.wins - a.record.wins;
    if (sort === "points") return b.stats.pointsFor - a.stats.pointsFor;
    if (sort === "defense") return a.stats.pointsAgainst - b.stats.pointsAgainst;
    return a.name.localeCompare(b.name);
  });

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between mb-6">
        <h1 className="font-display text-4xl">Teams</h1>
        <span className="text-chrome-500 text-sm">{teams.length} teams</span>
      </div>
      <div className="mb-6 space-y-4">
        <ClassFilter />
      </div>
      {data.teams.length === 0 ? (
        <div className="rounded-xl border border-chrome-500/15 p-12 text-center">
          <p className="font-display text-2xl mb-2">No teams yet for {season}</p>
          <p className="text-chrome-500 text-sm">
            The {season} season hasn&apos;t started yet. Check back in September.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((t) => <TeamCard key={t.id} team={t} />)}
        </div>
      )}
    </main>
  );
}
