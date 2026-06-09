import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadDataset } from "@/lib/data-server";
import { TaleOfTheTape } from "@/components/matchup/tale-of-the-tape";
import { FormGuide } from "@/components/matchup/form-guide";
import { displaySlug } from "@/lib/display-slug";

export default async function MatchupPage({ params }: { params: Promise<{ matchup: string }> }) {
  const { matchup } = await params;
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  const m = matchup.match(/^(.+)-vs-(.+)$/);
  if (!m) notFound();
  const away = data.teamsBySlug.get(m[1]);
  const home = data.teamsBySlug.get(m[2]);
  if (!away || !home) notFound();

  const awayGames = data.gamesByTeam.get(away.id) ?? [];
  const homeGames = data.gamesByTeam.get(home.id) ?? [];
  const h2h = awayGames.filter((g) =>
    g.homeTeamId === home.id || g.awayTeamId === home.id);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center justify-end gap-3">
          <div className="text-right">
            <div className="text-xs text-chrome-500">{away.classification} · {away.record.wins}–{away.record.losses}</div>
            <Link href={`/teams/${displaySlug(away)}` as any} className="font-display text-3xl">{away.name}</Link>
          </div>
          {away.logoUrl && <Image src={away.logoUrl} alt="" width={64} height={64} className="h-16 w-16 object-contain" unoptimized />}
        </div>
        <div className="font-display text-5xl text-crimson-500">VS</div>
        <div className="flex items-center gap-3">
          {home.logoUrl && <Image src={home.logoUrl} alt="" width={64} height={64} className="h-16 w-16 object-contain" unoptimized />}
          <div>
            <div className="text-xs text-chrome-500">{home.classification} · {home.record.wins}–{home.record.losses}</div>
            <Link href={`/teams/${displaySlug(home)}` as any} className="font-display text-3xl">{home.name}</Link>
          </div>
        </div>
      </div>

      <TaleOfTheTape a={away} b={home} />

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <h2 className="font-display text-xl mb-2">{away.name} — Last 5</h2>
          <FormGuide teamId={away.id} games={awayGames} />
        </section>
        <section>
          <h2 className="font-display text-xl mb-2">{home.name} — Last 5</h2>
          <FormGuide teamId={home.id} games={homeGames} />
        </section>
      </div>

      {h2h.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-2">Head-to-Head</h2>
          <ul className="space-y-1 text-sm">
            {h2h.map((g) => (
              <li key={g.id} className="text-chrome-300">
                {g.date}: {g.awayScore} – {g.homeScore}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href={`/present/matchup/${matchup}` as any}
        className="inline-block px-4 py-2 rounded-lg border border-crimson-500 text-crimson-500 font-display"
      >
        Open in broadcast mode →
      </Link>
    </main>
  );
}
