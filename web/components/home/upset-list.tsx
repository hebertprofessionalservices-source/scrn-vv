import Link from "next/link";
import { TeamLogo } from "@/components/brand/team-logo";
import { displaySlug } from "@/lib/display-slug";
import { classificationLabel } from "@/lib/team-format";
import type { Upset, UpsetSide } from "@/lib/upsets";

/**
 * Biggest upsets of the previous week for one league.
 *
 * Built as a card matching GameOfTheWeekCard — same frame, same inset crimson
 * label — so the two stack as a consistent pair. `h-full` lets it fill its grid
 * cell, which is what keeps the MHSAA and MAIS cards the same height even when
 * one league has no upsets.
 *
 * Each row stacks the two teams: the beaten favourite first, then the winner.
 * Logo and score sit in fixed side columns so every classification line starts
 * directly beneath its team name and both scores share one right-hand column.
 */
export function UpsetList({
  league,
  upsets,
}: {
  league: "MHSAA" | "MAIS";
  upsets: Upset[];
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-chrome-500/15 bg-navy-700/40 p-6">
      <div className="text-xs uppercase tracking-wider text-crimson-500 mb-2">
        {league} Biggest Upsets
      </div>
      {upsets.length === 0 ? (
        <div className="flex flex-1 items-center justify-center py-6">
          <p className="text-chrome-500 text-sm">No upsets last week.</p>
        </div>
      ) : (
        <div className="flex-1 divide-y divide-chrome-500/10">
          {upsets.map((u, i) => (
            <UpsetRow key={u.gameId} upset={u} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function UpsetRow({ upset, rank }: { upset: Upset; rank: number }) {
  return (
    <div className="flex items-start gap-3 py-3 first:pt-1 last:pb-1">
      <span className="font-display text-lg text-crimson-500 w-8 shrink-0">#{rank}</span>
      <div className="min-w-0 flex-1 space-y-2">
        <TeamRow side={upset.favorite} beaten />
        <TeamRow side={upset.winner} />
      </div>
    </div>
  );
}

function TeamRow({ side, beaten = false }: { side: UpsetSide; beaten?: boolean }) {
  const { team, score } = side;
  return (
    <div className="flex items-center gap-3">
      <TeamLogo src={team.logoUrl} size={28} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <Link
          href={`/teams/${displaySlug(team)}` as any}
          className={
            beaten
              ? "block truncate text-sm text-chrome-300 hover:text-crimson-500"
              : "block truncate text-sm font-semibold text-chrome-100 hover:text-crimson-500"
          }
        >
          {team.name}
        </Link>
        <div className="text-xs text-chrome-500">
          {classificationLabel(team.classification)} · {team.record.wins}–{team.record.losses}
        </div>
      </div>
      <span
        className={
          beaten
            ? "font-display text-lg text-chrome-300 shrink-0 tabular-nums"
            : "font-display text-lg text-chrome-100 shrink-0 tabular-nums"
        }
      >
        {score}
      </span>
    </div>
  );
}
