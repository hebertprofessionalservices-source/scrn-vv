import { notFound } from "next/navigation";
import { loadDataset } from "@/lib/data-server";
import { TaleOfTheTape } from "@/components/matchup/tale-of-the-tape";

export default async function PresentMatchup({ params }: { params: Promise<{ matchup: string }> }) {
  const { matchup } = await params;
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  const m = matchup.match(/^(.+)-vs-(.+)$/);
  if (!m) notFound();
  const away = data.teamsBySlug.get(m[1]);
  const home = data.teamsBySlug.get(m[2]);
  if (!away || !home) notFound();
  return (
    <>
      <h1 className="font-display text-center">{away.name} <span className="text-crimson-500">VS</span> {home.name}</h1>
      <div className="mt-8 scale-125 origin-top">
        <TaleOfTheTape a={away} b={home} />
      </div>
    </>
  );
}
