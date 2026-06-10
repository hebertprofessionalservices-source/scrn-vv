import { notFound } from "next/navigation";
import Link from "next/link";
import { loadDataset, currentSeason, availableSeasons } from "@/lib/data-server";
import { JerseyAvatar } from "@/components/player/jersey-avatar";
import { SeasonStatGrid } from "@/components/player/season-stat-grid";
import { displaySlug } from "@/lib/display-slug";

/** "6-3" -> 6'3" */
function formatHeight(height: string): string {
  const m = height.match(/^(\d+)-(\d+)$/);
  return m ? `${m[1]}'${m[2]}"` : height;
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const season = await currentSeason();
  const data = await loadDataset(season);
  const player = data.playersById.get(slug);
  if (!player) notFound();
  const team = data.teamsById.get(player.teamId);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <header className="flex items-center gap-6">
        <JerseyAvatar jersey={player.jersey}
          primary={team?.colors.primary} secondary={team?.colors.secondary} size={96} />
        <div>
          <h1 className="font-display text-5xl">{player.name}</h1>
          <p className="text-chrome-300">
            {player.position} · {player.class}
            {player.height ? <> · Height {formatHeight(player.height)}</> : null}
            {player.weight ? <> · Weight {player.weight} lbs</> : null}
          </p>
          {team && (
            <Link href={`/teams/${displaySlug(team)}` as any} className="text-crimson-500 text-sm">
              {team.name} →
            </Link>
          )}
        </div>
      </header>
      <SeasonStatGrid stats={player.stats} />
    </main>
  );
}

export async function generateStaticParams() {
  const { loadDataset, availableSeasons } = await import("@/lib/data-server");
  const seasons = await availableSeasons();
  const out: { slug: string }[] = [];
  let count = 0;
  const limit = 5000;
  for (const s of seasons) {
    if (count >= limit) break;
    const data = await loadDataset(s);
    for (const p of data.players) {
      if (count >= limit) break;
      out.push({ slug: p.id });
      count++;
    }
  }
  // Dedupe
  const seen = new Set<string>();
  return out.filter((p) => (seen.has(p.slug) ? false : (seen.add(p.slug), true)));
}
