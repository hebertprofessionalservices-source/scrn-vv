"use client";
import { useState } from "react";
import Link from "next/link";
import { JerseyAvatar } from "@/components/player/jersey-avatar";
import { TeamLogo } from "@/components/brand/team-logo";
import { classificationLabel } from "@/lib/team-format";
import { HomeLeaderboards } from "@/components/home/home-leaderboards";
import type { LeaderboardData } from "@/lib/leaderboard";
import type { OutstandingLine, WeeklyBucket, WeeklyLine, WeeklyView } from "@/lib/weekly";

const SECTIONS: { bucket: WeeklyBucket; heading: string }[] = [
  { bucket: "QB", heading: "Passing" },
  { bucket: "RB", heading: "Rushing" },
  { bucket: "WR", heading: "Receiving" },
  { bucket: "DEF", heading: "Defense" },
];

const SELECT_CLASSES =
  "bg-navy-700 border border-chrome-500/20 rounded-lg px-3 py-2 text-sm text-chrome-100 cursor-pointer hover:border-crimson-500 focus:outline-none focus:border-crimson-500";

export function HomePerformances({
  leaderboards,
  weekly,
}: {
  leaderboards: LeaderboardData;
  weekly: WeeklyView;
}) {
  const hasWeekly = weekly.latestKey !== null;
  const [view, setView] = useState<"week" | "season">(hasWeekly ? "week" : "season");
  const [weekKey, setWeekKey] = useState<string>(weekly.latestKey ?? "");

  const group = weekly.byWeek[weekKey];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs uppercase tracking-wider text-chrome-500">View</label>
        <select
          className={SELECT_CLASSES}
          value={view}
          onChange={(e) => setView(e.target.value as "week" | "season")}
          aria-label="Leaderboard view"
        >
          <option value="week">Top Performances by Week</option>
          <option value="season">Season Leaders</option>
        </select>
        {view === "week" && hasWeekly && (
          <select
            className={SELECT_CLASSES}
            value={weekKey}
            onChange={(e) => setWeekKey(e.target.value)}
            aria-label="Week"
          >
            {[...weekly.weeks].reverse().map((w) => (
              <option key={w.key} value={w.key}>
                {w.label} · {w.range}
              </option>
            ))}
          </select>
        )}
      </div>

      {view === "season" ? (
        <HomeLeaderboards data={leaderboards} />
      ) : !group ? (
        <p className="text-chrome-500 text-sm">No games played yet this season.</p>
      ) : (
        SECTIONS.map(({ bucket, heading }) => (
          <WeeklySection
            key={bucket}
            heading={`${heading} — ${group.label}`}
            lines={group.leaders[bucket]}
          />
        ))
      )}
    </div>
  );
}

function WeeklySection({ heading, lines }: { heading: string; lines: WeeklyLine[] }) {
  if (lines.length === 0) return null;
  return (
    <div>
      <h2 className="font-display text-2xl mb-3">{heading}</h2>
      <div className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 divide-y divide-chrome-500/10">
        {lines.map((l, i) => (
          <WeeklyRow key={`${l.playerId ?? l.name}:${i}`} line={l} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}

function WeeklyRow({ line, rank }: { line: WeeklyLine; rank: number }) {
  const inner = (
    <>
      <span className="font-display text-lg text-crimson-500 w-8 shrink-0">#{rank}</span>
      <JerseyAvatar jersey={line.jersey} primary={line.primary} secondary={line.secondary} size={28} />
      <div className="min-w-0 flex-1">
        <span className="text-sm text-chrome-100">{line.name}</span>
        <span className="text-xs text-chrome-500 ml-2 hidden sm:inline">
          {line.teamName} · {classificationLabel(line.classification)} · {line.context}
        </span>
      </div>
      <TeamLogo src={line.teamLogo} size={24} />
      <span className="text-sm font-display text-chrome-100 shrink-0">{line.line}</span>
    </>
  );
  const classes = "flex items-center gap-3 px-4 py-2.5 hover:bg-navy-700/60";
  return line.playerId ? (
    <Link href={`/players/${line.playerId}` as any} className={classes}>{inner}</Link>
  ) : (
    <div className={classes}>{inner}</div>
  );
}

export function OutstandingPerformances({ weekly }: { weekly: WeeklyView }) {
  const hasWeekly = weekly.latestKey !== null;
  const [mode, setMode] = useState<"week" | "season">("week");
  const latest = hasWeekly ? weekly.byWeek[weekly.latestKey!] : null;

  if (!hasWeekly) return null;
  const lines = mode === "week" ? latest!.outstanding : weekly.outstandingSeason;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h2 className="font-display text-2xl">Outstanding Performances</h2>
        <select
          className={SELECT_CLASSES}
          value={mode}
          onChange={(e) => setMode(e.target.value as "week" | "season")}
          aria-label="Outstanding performances range"
        >
          <option value="week">This Week ({latest!.label})</option>
          <option value="season">Full Season</option>
        </select>
      </div>
      {lines.length === 0 ? (
        <p className="text-chrome-500 text-sm">
          No qualifying performances {mode === "week" ? `in ${latest!.label}` : "yet"}.
        </p>
      ) : (
        <>
          <div className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 divide-y divide-chrome-500/10">
            {lines.map((l, i) => (
              <OutstandingRow key={`${l.playerId ?? l.name}:${l.weekLabel}:${i}`} line={l} showWeek={mode === "season"} />
            ))}
          </div>
          {mode === "season" && weekly.outstandingSeasonTotal > lines.length && (
            <p className="text-xs text-chrome-500 mt-2">
              Showing the {lines.length} most recent of {weekly.outstandingSeasonTotal} qualifying performances.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function OutstandingRow({ line, showWeek }: { line: OutstandingLine; showWeek: boolean }) {
  const inner = (
    <>
      <TeamLogo src={line.teamLogo} size={28} />
      <div className="min-w-0 flex-1">
        <span className="text-sm text-chrome-100">{line.name}</span>
        <span className="text-xs text-chrome-500 ml-2 hidden sm:inline">
          {line.teamName} · {classificationLabel(line.classification)} ·{" "}
          {showWeek ? `${line.weekLabel} · ` : ""}{line.context}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
        {line.badges.map((b) => (
          <span
            key={b}
            className="text-xs font-display px-2 py-0.5 rounded-md border border-crimson-500/40 text-crimson-500"
          >
            {b}
          </span>
        ))}
      </div>
    </>
  );
  const classes = "flex items-center gap-3 px-4 py-2.5 hover:bg-navy-700/60";
  return line.playerId ? (
    <Link href={`/players/${line.playerId}` as any} className={classes}>{inner}</Link>
  ) : (
    <div className={classes}>{inner}</div>
  );
}
