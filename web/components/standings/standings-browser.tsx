"use client";
import { useState } from "react";
import Link from "next/link";
import { TeamLogo } from "@/components/brand/team-logo";
import { classificationLabel } from "@/lib/team-format";
import type { RegionTable, StandingsData, StandingRow } from "@/lib/standings";

const SELECT_CLASSES =
  "bg-navy-700 border border-chrome-500/20 rounded-lg px-3 py-2 text-sm text-chrome-100 cursor-pointer hover:border-crimson-500 focus:outline-none focus:border-crimson-500";

export function StandingsBrowser({ data }: { data: StandingsData }) {
  const [cls, setCls] = useState<string>(data.classes[0] ?? "");

  const regions = cls
    ? data.regions.filter((r) => r.classification === cls)
    : data.regions;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <label className="text-xs uppercase tracking-wider text-chrome-500">
          Classification
        </label>
        <select
          className={SELECT_CLASSES}
          value={cls}
          onChange={(e) => setCls(e.target.value)}
          aria-label="Classification"
        >
          <option value="">All Classifications</option>
          {data.classes.map((c) => (
            <option key={c} value={c}>{classificationLabel(c)}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {regions.map((r) => (
          <RegionCard key={`${r.classification}|${r.district}`} region={r} />
        ))}
      </div>
    </div>
  );
}

function RegionCard({ region }: { region: RegionTable }) {
  return (
    <div className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-chrome-500/15 font-display text-lg">
        {region.district === "Independent"
          ? `${classificationLabel(region.classification)} · No Region`
          : region.district}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-chrome-500">
            <th className="text-left font-normal px-4 py-2">Team</th>
            <th className="text-right font-normal px-2 py-2">Overall</th>
            <th className="text-right font-normal px-2 py-2">Region</th>
            <th className="text-right font-normal px-4 py-2">Playoff %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-chrome-500/10">
          {region.rows.map((row, i) => (
            <StandingRowView key={row.slug} row={row} rank={i + 1} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StandingRowView({ row, rank }: { row: StandingRow; rank: number }) {
  return (
    <tr className="hover:bg-navy-700/60">
      <td className="px-4 py-2">
        <Link href={`/teams/${row.slug}` as any} className="flex items-center gap-2 hover:text-crimson-500">
          <span className="font-display text-chrome-500 w-5 shrink-0">{rank}</span>
          <TeamLogo src={row.logoUrl} size={24} />
          <span className="truncate">{row.name}</span>
        </Link>
      </td>
      <td className="px-2 py-2 text-right font-display">
        {row.overall.wins}–{row.overall.losses}
      </td>
      <td className="px-2 py-2 text-right font-display">
        {row.region ? `${row.region.wins}–${row.region.losses}` : "n/a"}
      </td>
      <td className="px-4 py-2 text-right font-display">
        {row.playoffPct === null ? (
          <span className="text-chrome-500">n/a</span>
        ) : (
          `${row.playoffPct}%`
        )}
      </td>
    </tr>
  );
}
