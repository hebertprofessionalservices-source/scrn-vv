import Link from "next/link";
import Image from "next/image";
import { JerseyAvatar } from "@/components/player/jersey-avatar";
import type { Player, Team } from "@/lib/types";

export function TopPerformerCard({
  player, team, headline, secondary, rank,
}: {
  player: Player; team: Team | undefined;
  headline: string; secondary: string; rank: 1 | 2 | 3;
}) {
  return (
    <Link href={`/players/${player.id}` as any}>
      <div className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 hover:border-crimson-500 p-5 h-full">
        <div className="flex items-start justify-between mb-3">
          <span className="font-display text-3xl text-crimson-500">#{rank}</span>
          {team?.logoUrl && (
            <Image src={team.logoUrl} alt="" width={36} height={36} className="h-9 w-9 object-contain" unoptimized />
          )}
        </div>
        <div className="flex items-center gap-3 mb-3">
          <JerseyAvatar jersey={player.jersey}
            primary={team?.colors.primary} secondary={team?.colors.secondary} size={48} />
          <div>
            <div className="font-display text-xl leading-tight">{player.name}</div>
            <div className="text-xs text-chrome-500">{team?.name} · {player.position}</div>
          </div>
        </div>
        <div className="font-display text-2xl text-chrome-100">{headline}</div>
        <div className="text-xs text-chrome-500 mt-1">{secondary}</div>
      </div>
    </Link>
  );
}
