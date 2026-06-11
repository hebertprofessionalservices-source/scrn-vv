import Link from "next/link";
import { displaySlug } from "@/lib/display-slug";
import { classificationLabel } from "@/lib/team-format";
import { TeamLogo } from "@/components/brand/team-logo";
import type { Team } from "@/lib/types";

export function TopDefenseCard({
  team, ppg, rank,
}: { team: Team; ppg: number; rank: 1 | 2 | 3 }) {
  return (
    <Link href={`/teams/${displaySlug(team)}` as any}>
      <div className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 hover:border-crimson-500 p-5 h-full">
        <div className="flex items-start justify-between mb-3">
          <span className="font-display text-3xl text-crimson-500">#{rank}</span>
          <TeamLogo src={team.logoUrl} size={36} />
        </div>
        <div className="font-display text-xl leading-tight mb-2">{team.name}</div>
        <div className="font-display text-4xl">{ppg.toFixed(1)}</div>
        <div className="text-xs text-chrome-500 mt-1">PTS ALLOWED / GAME</div>
        <div className="text-xs text-chrome-500">{classificationLabel(team.classification)} · {team.record.wins}–{team.record.losses}</div>
      </div>
    </Link>
  );
}
