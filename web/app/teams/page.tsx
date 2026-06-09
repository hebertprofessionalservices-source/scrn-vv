import { loadDataset } from "@/lib/data-server";
import { ClassFilter } from "@/components/filters/class-filter";
import { TeamCard } from "@/components/cards/team-card";

export default async function TeamsPage({
  searchParams,
}: { searchParams: Promise<{ class?: string; sort?: string }> }) {
  const sp = await searchParams;
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teams.map((t) => <TeamCard key={t.id} team={t} />)}
      </div>
    </main>
  );
}
