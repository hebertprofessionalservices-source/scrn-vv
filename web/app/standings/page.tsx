import type { Metadata } from "next";
import { loadDataset, currentSeason } from "@/lib/data-server";
import { buildStandings } from "@/lib/standings";
import { StandingsBrowser } from "@/components/standings/standings-browser";

export const metadata: Metadata = { title: "Standings · Varsity Voices" };

export default async function StandingsPage() {
  const season = await currentSeason();
  const data = await loadDataset(season);
  const standings = buildStandings(data);

  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="font-display text-4xl mb-1">Standings</h1>
      <p className="text-sm text-chrome-500 mb-6">
        Region standings · {season} · Playoff % is based on remaining region games
      </p>
      {standings.regions.length === 0 ? (
        <p className="text-chrome-500">No standings data yet.</p>
      ) : (
        <StandingsBrowser data={standings} />
      )}
    </section>
  );
}
