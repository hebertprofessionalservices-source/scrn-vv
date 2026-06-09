import Link from "next/link";
import Image from "next/image";
import { displaySlug } from "@/lib/display-slug";
import type { Team } from "@/lib/types";

export function TopDefenseCard({
  team, ppg, rank,
}: { team: Team; ppg: number; rank: 1 | 2 | 3 }) {
  return (
    <Link href={`/teams/${displaySlug(team)}` as any}>
      <div className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 hover:border-crimson-500 p-5 h-full">
        <div className="flex items-start justify-between mb-3">
          <span className="font-display text-3xl text-crimson-500">#{rank}</span>
          {team.logoUrl && (
            <Image src={team.logoUrl} alt="" width={36} height={36} className="h-9 w-9 object-contain" unoptimized />
          )}
        </div>
        <div className="font-display text-xl leading-tight mb-2">{team.name}</div>
        <div className="font-display text-4xl">{ppg.toFixed(1)}</div>
        <div className="text-xs text-chrome-500 mt-1">PTS ALLOWED / GAME</div>
        <div className="text-xs text-chrome-500">{team.classification} · {team.record.wins}–{team.record.losses}</div>
      </div>
    </Link>
  );
}
