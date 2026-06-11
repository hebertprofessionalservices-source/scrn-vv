import Link from "next/link";
import { displaySlug } from "@/lib/display-slug";
import { TeamLogo } from "@/components/brand/team-logo";
import { formatGameDate } from "@/lib/format-date";
import type { Game, Team } from "@/lib/types";

export function GameOfTheWeekCard({
  game, away, home, label, storyline,
}: {
  game: Game; away: Team | undefined; home: Team | undefined;
  label: string; storyline: string;
}) {
  if (!away || !home) {
    return (
      <div className="rounded-2xl border border-chrome-500/15 p-6">
        <div className="text-xs uppercase tracking-wider text-chrome-500">{label}</div>
        <p className="mt-2 text-chrome-300">No game selected.</p>
      </div>
    );
  }
  const href = `/matchup/${displaySlug(away)}-vs-${displaySlug(home)}`;
  return (
    <Link href={href as any}>
      <div className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 hover:border-crimson-500 p-6">
        <div className="text-xs uppercase tracking-wider text-crimson-500 mb-2">{label}</div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center gap-3 justify-end">
            <div className="text-right">
              <div className="font-display text-2xl leading-tight">{away.name}</div>
              <div className="text-xs text-chrome-500">{away.classification} · {away.record.wins}–{away.record.losses}</div>
            </div>
            <TeamLogo src={away.logoUrl} size={56} />
          </div>
          <div className="font-display text-3xl text-crimson-500">VS</div>
          <div className="flex items-center gap-3">
            <TeamLogo src={home.logoUrl} size={56} />
            <div>
              <div className="font-display text-2xl leading-tight">{home.name}</div>
              <div className="text-xs text-chrome-500">{home.classification} · {home.record.wins}–{home.record.losses}</div>
            </div>
          </div>
        </div>
        {storyline && (
          <p className="mt-4 text-sm text-chrome-300 leading-snug">{storyline}</p>
        )}
        <p className="mt-2 text-xs text-chrome-500">{formatGameDate(game.date)}{game.venue ? ` · ${game.venue}` : ""}</p>
      </div>
    </Link>
  );
}
