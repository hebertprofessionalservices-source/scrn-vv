import { notFound } from "next/navigation";
import Link from "next/link";
import { loadDataset } from "@/lib/data-server";
import { JerseyAvatar } from "@/components/player/jersey-avatar";
import { SeasonStatGrid } from "@/components/player/season-stat-grid";
import { displaySlug } from "@/lib/display-slug";

export default async function PlayerDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
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
            {player.position} · {player.class} · {player.height ?? "—"} · {player.weight ?? "—"}
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
  const { loadDataset } = await import("@/lib/data-server");
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  // Cap static generation to 5000 for build perf; rest still resolvable at request time
  return data.players.slice(0, 5000).map((p) => ({ slug: p.id }));
}
