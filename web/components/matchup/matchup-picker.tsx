"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TeamLogo } from "@/components/brand/team-logo";
import { classRegionLabel, classificationLabel } from "@/lib/team-format";
import { RankDeltaChip } from "@/components/rank-delta";
import { runPassLabel, type RunPassSplit } from "@/lib/run-pass";
import { fmtPct, outlookRows, recordsBlockLines, ydsWithAvg, type CompareRow } from "@/lib/matchup-format";
import { CompareTable } from "@/components/matchup/compare-table";
import { StickyMatchupHeader } from "@/components/matchup/sticky-matchup-header";
import type { MatchupOutlook } from "@/lib/standings";
import type { MatchupSideData } from "@/lib/team-outlook";
import type { Team } from "@/lib/types";

interface WL {
  wins: number;
  losses: number;
}

export interface MatchupTeam {
  id: string;
  /** URL slug for team/present links. */
  slug: string;
  name: string;
  logoUrl: string | null;
  classification: Team["classification"];
  district: string | null;
  record: WL;
  /** MaxPreps' ranks; null when MaxPreps does not rank the team. */
  power: {
    overall: number;
    cls: number;
    /** Week-over-week movement (positive = up); null before history exists. */
    deltaOverall: number | null;
    deltaClass: number | null;
  } | null;
  /** Power rating, for the AI pick win probability. */
  rating: number | null;
  playoffPct: number | null;
  runPass: RunPassSplit | null;
  side: MatchupSideData;
  stats: {
    pointsFor: number;
    pointsAgainst: number;
    yardsFor: number;
    passYdsFor: number;
    rushYdsFor: number;
    turnoversForced: number;
    turnoversLost: number;
  };
}

export interface PairOutlook {
  aId: string;
  bId: string;
  a: MatchupOutlook;
  b: MatchupOutlook;
}

interface StatRow {
  label: string;
  value: (t: MatchupTeam) => number;
  format: (v: number) => string;
  lowerIsBetter?: boolean;
  /** Stat comes from MaxPreps season tables, which some schools don't publish. */
  needsPrintStats?: boolean;
}

const STAT_ROWS: StatRow[] = [
  { label: "Points / Game", value: (t) => perGame(t, t.stats.pointsFor), format: f1 },
  { label: "Points Allowed / Game", value: (t) => perGame(t, t.stats.pointsAgainst), format: f1, lowerIsBetter: true },
  { label: "Total Points", value: (t) => t.stats.pointsFor, format: f0 },
  { label: "Total Yards", value: (t) => t.stats.yardsFor, format: f0, needsPrintStats: true },
  { label: "Passing Yards", value: (t) => t.stats.passYdsFor, format: f0, needsPrintStats: true },
  { label: "Rushing Yards", value: (t) => t.stats.rushYdsFor, format: f0, needsPrintStats: true },
  { label: "Turnovers Forced", value: (t) => t.stats.turnoversForced, format: f0, needsPrintStats: true },
  { label: "Turnovers Lost", value: (t) => t.stats.turnoversLost, format: f0, lowerIsBetter: true, needsPrintStats: true },
];

function perGame(t: MatchupTeam, total: number): number {
  const games = t.record.wins + t.record.losses;
  return games > 0 ? total / games : 0;
}
function f0(v: number): string { return Math.round(v).toLocaleString(); }
function f1(v: number): string { return v.toFixed(1); }

/** Schools whose MaxPreps season tables weren't published have all-zero yardage. */
function hasPrintStats(t: MatchupTeam): boolean {
  return t.stats.yardsFor > 0;
}

export function MatchupPicker({
  teams,
  initialA = "",
  initialB = "",
  pairOutlook = null,
  children,
}: {
  teams: MatchupTeam[];
  initialA?: string;
  initialB?: string;
  /** Server-computed win/loss playoff odds for the pair in the URL. */
  pairOutlook?: PairOutlook | null;
  /** Server-rendered sections for the selected pair; rendered inside the
   *  comparison block so the sticky team header spans them too. */
  children?: React.ReactNode;
}) {
  const [aId, setAId] = useState(initialA);
  const [bId, setBId] = useState(initialB);
  const router = useRouter();

  const byId = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const teamA = byId.get(aId);
  const teamB = byId.get(bId);

  // Keep the URL in sync so the server-rendered sections below the picker
  // (storylines, key players, series history) update with the selection.
  function select(which: "a" | "b", id: string) {
    const nextA = which === "a" ? id : aId;
    const nextB = which === "b" ? id : bId;
    if (which === "a") setAId(id);
    else setBId(id);
    const sp = new URLSearchParams();
    if (nextA) sp.set("a", nextA);
    if (nextB) sp.set("b", nextB);
    router.replace(`/matchup?${sp.toString()}` as any, { scroll: false });
  }

  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-2 gap-4">
        <TeamSelect label="Team A" value={aId} onChange={(id) => select("a", id)} teams={teams} excludeId={bId} />
        <TeamSelect label="Team B" value={bId} onChange={(id) => select("b", id)} teams={teams} excludeId={aId} />
      </div>

      {teamA && teamB ? (
        <div>
          {/* Frozen like a header row; condenses to crest + name once scrolled. */}
          <StickyMatchupHeader className="mb-6">
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4">
              <TeamHeader
                team={teamA}
                align="right"
                outlook={pairMatches(pairOutlook, aId, bId) ? pairOutlook!.a : null}
              />
              <div className="font-display text-4xl text-crimson-500 self-center">VS</div>
              <TeamHeader
                team={teamB}
                align="left"
                outlook={pairMatches(pairOutlook, aId, bId) ? pairOutlook!.b : null}
              />
            </div>
          </StickyMatchupHeader>

          <div className="mb-6">
            <AiPickBanner a={teamA} b={teamB} />
          </div>

          <CompareTable rows={compareRows(teamA, teamB)} highlightClass="text-green-400" />

          {children}
        </div>
      ) : (
        <div className="rounded-xl border border-chrome-500/15 p-12 text-center">
          <p className="font-display text-2xl mb-2">Pick two teams</p>
          <p className="text-chrome-500 text-sm">
            Select Team A and Team B above to compare season stats side by side.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * The season comparison rows for a pair, in the client's order: the stat
 * block, run/pass immediately after the yardage it explains, then the
 * efficiency and strength-of-schedule rows.
 */
function compareRows(a: MatchupTeam, b: MatchupTeam): CompareRow[] {
  const rows: CompareRow[] = [];
  for (const row of STAT_ROWS) {
    const va = row.value(a);
    const vb = row.value(b);
    const aMissing = Boolean(row.needsPrintStats) && !hasPrintStats(a);
    const bMissing = Boolean(row.needsPrintStats) && !hasPrintStats(b);
    const comparable = !aMissing && !bMissing;
    // Yardage rows carry the per-attempt average in parentheses.
    const avgFor = (t: MatchupTeam) =>
      row.label === "Passing Yards" ? t.side.avgPass
      : row.label === "Rushing Yards" ? t.side.avgRush
      : null;
    const cell = (t: MatchupTeam, v: number, missing: boolean) => {
      if (missing) return "—";
      const avg = avgFor(t);
      return avg !== null ? ydsWithAvg(v, avg) : row.format(v);
    };
    rows.push({
      label: row.label,
      a: cell(a, va, aMissing),
      b: cell(b, vb, bMissing),
      aBetter: comparable && (row.lowerIsBetter ? va < vb : va > vb),
      bBetter: comparable && (row.lowerIsBetter ? vb < va : vb > va),
    });
    if (row.label === "Rushing Yards") {
      rows.push({
        label: "Run / Pass %",
        a: a.runPass ? runPassLabel(a.runPass) : "—",
        b: b.runPass ? runPassLabel(b.runPass) : "—",
      });
    }
  }
  rows.push(...outlookRows(a.side, b.side));
  return rows;
}

function TeamSelect({
  label, value, onChange, teams, excludeId,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  teams: MatchupTeam[];
  excludeId: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-chrome-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full cursor-pointer rounded-lg bg-navy-700 text-chrome-100 border border-chrome-500/20 focus:border-crimson-500 outline-none px-3 py-2.5"
      >
        <option value="">Select a team…</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id} disabled={t.id === excludeId}>
            {t.name} ({classificationLabel(t.classification)})
          </option>
        ))}
      </select>
    </label>
  );
}

function pairMatches(
  pair: { aId: string; bId: string } | null,
  aId: string,
  bId: string,
): boolean {
  return pair !== null && pair.aId === aId && pair.bId === bId;
}

function AiPickBanner({ a, b }: { a: MatchupTeam; b: MatchupTeam }) {
  if (a.rating === null || b.rating === null) return null;
  const pA = 1 / (1 + Math.exp(-(a.rating - b.rating) / 7));
  const winner = pA >= 0.5 ? a.name : b.name;
  const pct = Math.round(Math.max(pA, 1 - pA) * 100);
  return (
    <div className="rounded-xl border border-crimson-500/40 bg-navy-700/40 px-4 py-2.5 text-center">
      <span className="text-xs uppercase tracking-wider text-crimson-500 mr-2">AI Pick</span>
      <span className="font-display text-lg text-chrome-100">
        {winner} — {pct}%
      </span>
    </div>
  );
}

function TeamHeader({
  team,
  align,
  outlook,
}: {
  team: MatchupTeam;
  align: "left" | "right";
  outlook?: MatchupOutlook | null;
}) {
  const alignClass = align === "right" ? "items-end text-right" : "items-start text-left";
  const rank = team.power && (
    <span className="font-display text-lg text-chrome-500 whitespace-nowrap">
      #{team.power.overall} <RankDeltaChip delta={team.power.deltaOverall} /> Overall
      {" "}- #{team.power.cls} <RankDeltaChip delta={team.power.deltaClass} />{" "}
      {classificationLabel(team.classification)}
    </span>
  );
  const crest = <TeamLogo src={team.logoUrl} size={72} />;
  return (
    // Crest on the OUTER edge, beside the name and info rather than stacked
    // above it (client, Sep 2 2026).
    <div className="flex items-start gap-3">
      {align === "right" && crest}
      <div className={`flex flex-col gap-2 min-w-0 flex-1 ${alignClass}`}>
      <div className="font-display text-2xl xl:text-3xl leading-tight">
        {/* Name never wraps; sides mirror — rank sits VS-far on both. */}
        {align === "right" && rank && <>{rank} </>}
        <span className="whitespace-nowrap">{team.name}</span>
        {align === "left" && rank && <> {rank}</>}
      </div>
      <div className="text-sm text-chrome-300 group-data-[condensed=true]:hidden">
        {classRegionLabel(team)}
        {team.playoffPct !== null &&
          ` (Current Playoff Potential: ${team.playoffPct.toFixed(2)}%)`}
      </div>
      <div className="text-sm text-chrome-500 group-data-[condensed=true]:hidden">
        {recordsBlockLines(team.side.records).map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      {outlook && (outlook.ifWin !== null || outlook.ifLoss !== null) && (
        <div className="text-sm text-chrome-500 group-data-[condensed=true]:hidden">
          Playoff Potential if win/loss:{" "}
          <span className="text-chrome-300">
            {fmtPct(outlook.ifWin)} / {fmtPct(outlook.ifLoss)}
          </span>
        </div>
      )}
      </div>
      {align === "left" && crest}
    </div>
  );
}
