import { loadDataset, loadEditorial, currentSeason } from "@/lib/data-server";
import { formatGameDate } from "@/lib/format-date";

export default async function AdminEditorialPage({
  searchParams,
}: { searchParams: Promise<{ ok?: string }> }) {
  const sp = await searchParams;
  const season = await currentSeason();
  const data = await loadDataset(season);
  const editorial = await loadEditorial() ?? {
    currentSeason: "2025-26", currentWeek: 0,
    gameOfTheWeek: { gameId: null, storyline: "", pickedBy: "", pickedAt: "" },
    topPerformerNotes: {}, featuredQuote: "",
  };
  const upcoming = data.games
    .filter((g) => g.status === "scheduled")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 50);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-4xl mb-6">Editorial Controls</h1>
      {sp.ok && (
        <p className="mb-4 rounded bg-green-900/40 border border-green-500/30 px-4 py-2 text-green-300">
          Published. Vercel will rebuild momentarily.
        </p>
      )}
      <form action="/api/admin/editorial" method="post" className="space-y-6">
        <div>
          <label className="text-xs uppercase tracking-wider text-chrome-500">Current Week</label>
          <input name="currentWeek" type="number" min="0" max="20" defaultValue={editorial.currentWeek}
            className="w-full mt-1 px-3 py-2 rounded bg-navy-700 border border-chrome-500/20" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-chrome-500">Game of the Week</label>
          <select name="gameOfTheWeekId" defaultValue={editorial.gameOfTheWeek.gameId ?? ""}
            className="w-full mt-1 px-3 py-2 rounded bg-navy-700 border border-chrome-500/20">
            <option value="">— None —</option>
            {upcoming.map((g) => {
              const away = data.teamsById.get(g.awayTeamId)?.name ?? g.awayTeamId;
              const home = data.teamsById.get(g.homeTeamId)?.name ?? g.homeTeamId;
              return <option key={g.id} value={g.id}>{formatGameDate(g.date)} · {away} @ {home}</option>;
            })}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-chrome-500">Storyline</label>
          <textarea name="storyline" rows={3} defaultValue={editorial.gameOfTheWeek.storyline}
            className="w-full mt-1 px-3 py-2 rounded bg-navy-700 border border-chrome-500/20" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-chrome-500">Picked By</label>
          <input name="pickedBy" type="text" defaultValue={editorial.gameOfTheWeek.pickedBy}
            className="w-full mt-1 px-3 py-2 rounded bg-navy-700 border border-chrome-500/20" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-chrome-500">Featured Quote</label>
          <textarea name="featuredQuote" rows={2} defaultValue={editorial.featuredQuote}
            className="w-full mt-1 px-3 py-2 rounded bg-navy-700 border border-chrome-500/20" />
        </div>
        <button type="submit" className="w-full py-3 rounded-lg bg-crimson-500 hover:bg-crimson-600 font-display tracking-wide">
          PUBLISH
        </button>
      </form>
    </main>
  );
}
