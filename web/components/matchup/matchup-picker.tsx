"use client";

import { useMemo, useState } from "react";
import { TeamLogo } from "@/components/brand/team-logo";
import { classRegionLabel } from "@/lib/team-format";
import type { Team } from "@/lib/types";

export interface MatchupTeam {
  id: string;
  name: string;
  logoUrl: string | null;
  classification: Team["classification"];
  district: string | null;
  record: { wins: number; losses: number };
  stateRank: number | null;
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

interface StatRow {
  label: string;
  value: (t: MatchupTeam) => number;
  format: (v: number) => string;
  lowerIsBetter?: boolean;
}

const STAT_ROWS: StatRow[] = [
  { label: "Points / Game", value: (t) => perGame(t, t.stats.pointsFor), format: f1 },
  { label: "Points Allowed / Game", value: (t) => perGame(t, t.stats.pointsAgainst), format: f1, lowerIsBetter: true },
  { label: "Total Points", value: (t) => t.stats.pointsFor, format: f0 },
  { label: "Total Yards", value: (t) => t.stats.yardsFor, format: f0 },
  { label: "Passing Yards", value: (t) => t.stats.passYdsFor, format: f0 },
  { label: "Rushing Yards", value: (t) => t.stats.rushYdsFor, format: f0 },
  { label: "Turnovers Forced", value: (t) => t.stats.turnoversForced, format: f0 },
  { label: "Turnovers Lost", value: (t) => t.stats.turnoversLost, format: f0, lowerIsBetter: true },
];

function perGame(t: MatchupTeam, total: number): number {
  const games = t.record.wins + t.record.losses;
  return games > 0 ? total / games : 0;
}
function f0(v: number): string { return Math.round(v).toLocaleString(); }
function f1(v: number): string { return v.toFixed(1); }

export function MatchupPicker({ teams }: { teams: MatchupTeam[] }) {
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");

  const byId = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const teamA = byId.get(aId);
  const teamB = byId.get(bId);

  return (
    <div className="space-y-8">
      <div className="grid sm:grid-cols-2 gap-4">
        <TeamSelect label="Team A" value={aId} onChange={setAId} teams={teams} excludeId={bId} />
        <TeamSelect label="Team B" value={bId} onChange={setBId} teams={teams} excludeId={aId} />
      </div>

      {teamA && teamB ? (
        <div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4 mb-6">
            <TeamHeader team={teamA} align="right" />
            <div className="font-display text-4xl text-crimson-500 self-center">VS</div>
            <TeamHeader team={teamB} align="left" />
          </div>

          <div className="rounded-xl border border-chrome-500/15 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {STAT_ROWS.map((row) => {
                  const va = row.value(teamA);
                  const vb = row.value(teamB);
                  const aBetter = row.lowerIsBetter ? va < vb : va > vb;
                  const bBetter = row.lowerIsBetter ? vb < va : vb > va;
                  return (
                    <tr key={row.label} className="border-t border-chrome-500/10 first:border-t-0">
                      <td className={cellClass("right", aBetter)}>{row.format(va)}</td>
                      <td className="px-3 py-2.5 text-center text-xs uppercase tracking-wider text-chrome-500 whitespace-nowrap">
                        {row.label}
                      </td>
                      <td className={cellClass("left", bBetter)}>{row.format(vb)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

function cellClass(align: "left" | "right", better: boolean): string {
  return [
    "px-4 py-2.5 w-2/5 font-display text-lg",
    align === "right" ? "text-right" : "text-left",
    better ? "text-crimson-500" : "text-chrome-100",
  ].join(" ");
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
            {t.name} ({t.classification})
          </option>
        ))}
      </select>
    </label>
  );
}

function TeamHeader({ team, align }: { team: MatchupTeam; align: "left" | "right" }) {
  const alignClass = align === "right" ? "items-end text-right" : "items-start text-left";
  return (
    <div className={`flex flex-col gap-2 ${alignClass}`}>
      <TeamLogo src={team.logoUrl} size={72} />
      <div className="font-display text-3xl leading-tight">{team.name}</div>
      <div className="text-sm text-chrome-300">
        {team.stateRank ? `Rank: #${team.stateRank} ` : ""}
        {classRegionLabel(team)}
      </div>
      <div className="text-sm text-chrome-500">
        {team.record.wins}–{team.record.losses}
      </div>
    </div>
  );
}
