import Link from "next/link";
import { classificationLabel } from "@/lib/team-format";
import { formatGameDate } from "@/lib/format-date";
import { displaySlug } from "@/lib/display-slug";
import { fmtWLT } from "@/lib/matchup-history";
import type { CoachSummary } from "@/lib/history";
import type { PowerRank } from "@/lib/power";
import type { RankDelta } from "@/lib/rank-history";
import { RankDeltaChip } from "@/components/rank-delta";
import type { Game, Team } from "@/lib/types";

function rec(r: { wins: number; losses: number } | null | undefined): string {
  return r ? `${r.wins}–${r.losses}` : "n/a";
}

export interface LastLoss {
  opponent: Team | null;
  opponentLabel: string;
  scoreFor: number;
  scoreAgainst: number;
  date: string;
  where: string;
}

/** Most recent final game the team lost, with opponent/date/location. */
export function findLastLoss(
  team: Team,
  games: Game[],
  resolve: (id: string) => Team | undefined,
): LastLoss | null {
  const losses = games
    .filter((g) => {
      if (g.status !== "final" || g.homeScore === null || g.awayScore === null) return false;
      const isHome = g.homeTeamId === team.id;
      const sf = isHome ? g.homeScore : g.awayScore;
      const sa = isHome ? g.awayScore : g.homeScore;
      return sf < sa;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  const g = losses[0];
  if (!g) return null;
  const isHome = g.homeTeamId === team.id;
  const oppId = isHome ? g.awayTeamId : g.homeTeamId;
  const opp = resolve(oppId) ?? null;
  return {
    opponent: opp,
    opponentLabel: opp?.name ?? oppId,
    scoreFor: (isHome ? g.homeScore : g.awayScore)!,
    scoreAgainst: (isHome ? g.awayScore : g.homeScore)!,
    date: g.date,
    where: g.venue ?? (isHome ? "Home" : "Away"),
  };
}

export function TeamVitals({
  team,
  power,
  delta,
  lastLoss,
  coach,
  coachName,
}: {
  team: Team;
  power: PowerRank | null;
  /** Week-over-week rank movement. */
  delta?: RankDelta | null;
  lastLoss: LastLoss | null;
  coach?: CoachSummary | null;
  /** Resolved coach display name; the card is hidden when null. */
  coachName?: string | null;
}) {
  const played = team.record.wins + team.record.losses > 0;
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* The source is never named on the dashboard (client rule, Sep 2 2026). */}
      <VitalCard label="Rank">
        {power && power.overallRank !== null ? (
          <>
            <span className="font-display text-3xl">#{power.overallRank}</span>
            <span className="ml-2"><RankDeltaChip delta={delta?.overall} /></span>
            <span className="text-chrome-500 text-sm ml-2">Overall</span>
            {power.classRank !== null && (
              <div className="text-sm text-chrome-300 mt-1">
                #{power.classRank} <RankDeltaChip delta={delta?.class} /> in{" "}
                {classificationLabel(team.classification)}
              </div>
            )}
          </>
        ) : (
          <NA />
        )}
      </VitalCard>

      <VitalCard label="Streak">
        {team.streak ? (
          <span
            className={`font-display text-3xl ${team.streak.result === "W" ? "text-green-400" : "text-crimson-500"}`}
          >
            {team.streak.result}
            {team.streak.count}
          </span>
        ) : (
          <NA />
        )}
      </VitalCard>

      <VitalCard label="Last Loss">
        {lastLoss ? (
          <>
            <div className="font-display text-xl">
              {lastLoss.scoreFor}–{lastLoss.scoreAgainst}{" "}
              {lastLoss.opponent ? (
                <Link
                  href={`/teams/${displaySlug(lastLoss.opponent)}` as any}
                  className="hover:text-crimson-500"
                >
                  vs {lastLoss.opponentLabel}
                </Link>
              ) : (
                <>vs {lastLoss.opponentLabel}</>
              )}
            </div>
            <div className="text-sm text-chrome-500 mt-1">
              {formatGameDate(lastLoss.date)} · {lastLoss.where}
            </div>
          </>
        ) : played ? (
          <span className="font-display text-xl text-green-400">None — undefeated</span>
        ) : (
          <NA />
        )}
      </VitalCard>

      <VitalCard label="Record Splits">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Split label="Home" value={rec(team.homeRecord)} />
          <Split label="Away" value={rec(team.awayRecord)} />
          <Split label="Neutral" value={rec(team.neutralRecord)} />
        </div>
      </VitalCard>

      {coachName && (
      <VitalCard label="Head Coach" className="sm:col-span-2 lg:col-span-4">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="font-display text-2xl">{coachName}</span>
          <span className="text-sm text-chrome-500">
            Years at school:{" "}
            <span className="text-chrome-300">{coach ? coach.yearsAtSchool : "n/a"}</span>
          </span>
          <span className="text-sm text-chrome-500">
            Record at school:{" "}
            <span className="text-chrome-300">{coach ? fmtWLT(coach.atSchool) : "n/a"}</span>
          </span>
          <span className="text-sm text-chrome-500">
            Overall record:{" "}
            <span className="text-chrome-300">{coach ? fmtWLT(coach.career) : "n/a"}</span>
          </span>
        </div>
      </VitalCard>
      )}
    </section>
  );
}

function VitalCard({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-chrome-500/15 bg-navy-700/40 p-4 ${className}`}>
      <div className="text-xs uppercase tracking-wider text-chrome-500 mb-2">{label}</div>
      {children}
    </div>
  );
}

function Split({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-xl">{value}</div>
      <div className="text-xs text-chrome-500">{label}</div>
    </div>
  );
}

function NA() {
  return <span className="font-display text-xl text-chrome-500">n/a</span>;
}
