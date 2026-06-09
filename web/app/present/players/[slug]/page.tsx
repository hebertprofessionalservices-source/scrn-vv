import { notFound } from "next/navigation";
import { loadDataset, currentSeason } from "@/lib/data-server";
import { SeasonStatGrid } from "@/components/player/season-stat-grid";

export default async function PresentPlayer({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const season = await currentSeason();
  const data = await loadDataset(season);
  const player = data.playersById.get(slug);
  if (!player) notFound();
  const team = data.teamsById.get(player.teamId);
  return (
    <>
      <h1 className="font-display">{player.name}</h1>
      <p className="text-3xl text-chrome-300">{player.position} · {player.class} · {team?.name}</p>
      <div className="mt-8 scale-125 origin-top-left">
        <SeasonStatGrid stats={player.stats} />
      </div>
    </>
  );
}
