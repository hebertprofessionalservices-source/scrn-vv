"use client";
import { useState } from "react";
import Link from "next/link";
import { JerseyAvatar } from "@/components/player/jersey-avatar";
import { TeamLogo } from "@/components/brand/team-logo";
import { classificationLabel } from "@/lib/team-format";
import {
  CATEGORY_OPTIONS,
  LEADERBOARD_LIMIT,
  POSITION_META,
  formatValue,
  rankLeaders,
  type DefenseEntry,
  type LeaderCategory,
  type LeaderEntry,
  type LeaderboardData,
  type LeaderPosition,
} from "@/lib/leaderboard";

const SECTIONS: { pos: LeaderPosition; plural: string }[] = [
  { pos: "QB", plural: "Quarterbacks" },
  { pos: "RB", plural: "Running Backs" },
  { pos: "WR", plural: "Receivers" },
];

const SELECT_CLASSES =
  "bg-navy-700 border border-chrome-500/20 rounded-lg px-3 py-2 text-sm text-chrome-100 cursor-pointer hover:border-crimson-500 focus:outline-none focus:border-crimson-500";

/** Classification + stat-category selects; shared by the weekly and season views. */
export function LeaderboardFilters<C extends string>({
  classes, cls, setCls, category, setCategory, categoryOptions,
}: {
  classes: string[];
  cls: string;
  setCls: (v: string) => void;
  category: C;
  setCategory: (v: C) => void;
  categoryOptions: readonly { value: C; label: string }[];
}) {
  return (
    <>
      <select
        className={SELECT_CLASSES}
        value={cls}
        onChange={(e) => setCls(e.target.value)}
        aria-label="Classification"
      >
        <option value="">All Classifications</option>
        {classes.map((c) => (
          <option key={c} value={c}>{classificationLabel(c)}</option>
        ))}
      </select>
      <select
        className={`${SELECT_CLASSES} min-w-44`}
        value={category}
        onChange={(e) => setCategory(e.target.value as C)}
        aria-label="Stat category"
      >
        {categoryOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </>
  );
}

export function HomeLeaderboards({
  data,
  controls,
}: {
  data: LeaderboardData;
  /** When provided, the parent owns the filter selects and this renders none. */
  controls?: { cls: string; category: LeaderCategory };
}) {
  const [clsState, setClsState] = useState<string>("");
  const [categoryState, setCategoryState] = useState<LeaderCategory>("yds");
  const cls = controls?.cls ?? clsState;
  const category = controls?.category ?? categoryState;

  const clsSuffix = cls ? ` (${classificationLabel(cls)})` : "";

  return (
    <div className="space-y-8">
      {!controls && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs uppercase tracking-wider text-chrome-500">Filter</label>
          <LeaderboardFilters
            classes={data.classes}
            cls={clsState}
            setCls={setClsState}
            category={categoryState}
            setCategory={setCategoryState}
            categoryOptions={CATEGORY_OPTIONS}
          />
        </div>
      )}

      {SECTIONS.map(({ pos, plural }) => {
        const pool = cls
          ? data.positions[pos].filter((e) => e.classification === cls)
          : data.positions[pos];
        const leaders = rankLeaders(pool, category, pos).slice(0, LEADERBOARD_LIMIT);
        return (
          <PlayerSection
            key={pos}
            heading={`Top ${LEADERBOARD_LIMIT} ${plural} — by ${POSITION_META[pos].statLabels[category]}${clsSuffix}`}
            leaders={leaders}
            category={category}
            pos={pos}
          />
        );
      })}

      <DefenseSection
        heading={`Top ${LEADERBOARD_LIMIT} Defenses — by Points Allowed/Game${clsSuffix}`}
        defenses={[...(cls ? data.defenses.filter((d) => d.classification === cls) : data.defenses)]
          .sort((a, b) => a.ppg - b.ppg)
          .slice(0, LEADERBOARD_LIMIT)}
      />
    </div>
  );
}

function PlayerSection({
  heading, leaders, category, pos,
}: {
  heading: string;
  leaders: LeaderEntry[];
  category: LeaderCategory;
  pos: LeaderPosition;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl mb-3">{heading}</h2>
      {leaders.length === 0 ? (
        <p className="text-chrome-500 text-sm">No data yet.</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            {leaders.slice(0, 3).map((e, i) => (
              <PlayerCard key={e.id} entry={e} rank={i + 1} category={category} pos={pos} />
            ))}
          </div>
          {leaders.length > 3 && (
            <div className="mt-3 rounded-2xl border border-chrome-500/15 bg-navy-700/40 divide-y divide-chrome-500/10">
              {leaders.slice(3).map((e, i) => (
                <PlayerRow key={e.id} entry={e} rank={i + 4} category={category} pos={pos} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlayerCard({
  entry, rank, category, pos,
}: { entry: LeaderEntry; rank: number; category: LeaderCategory; pos: LeaderPosition }) {
  const showBig = category !== "yds" && category !== "td";
  return (
    <Link href={`/players/${entry.id}` as any}>
      <div className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 hover:border-crimson-500 p-5 h-full">
        <div className="flex items-start justify-between mb-3">
          <span className="font-display text-3xl text-crimson-500">#{rank}</span>
          <TeamLogo src={entry.teamLogo} size={36} />
        </div>
        <div className="flex items-center gap-3 mb-3">
          <JerseyAvatar jersey={entry.jersey} primary={entry.primary} secondary={entry.secondary} size={48} />
          <div>
            <div className="font-display text-xl leading-tight">{entry.name}</div>
            <div className="text-xs text-chrome-500">
              {entry.teamName} · {classificationLabel(entry.classification)}
            </div>
          </div>
        </div>
        <div className="font-display text-2xl text-chrome-100">
          {showBig
            ? `${formatValue(entry[category], category)} ${POSITION_META[pos].units[category]}`
            : entry.headline}
        </div>
        <div className="text-xs text-chrome-500 mt-1">
          {showBig ? entry.headline : entry.secondaryLine}
        </div>
      </div>
    </Link>
  );
}

function PlayerRow({
  entry, rank, category, pos,
}: { entry: LeaderEntry; rank: number; category: LeaderCategory; pos: LeaderPosition }) {
  const showExtra = category !== "yds" && category !== "td";
  return (
    <Link
      href={`/players/${entry.id}` as any}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-navy-700/60"
    >
      <span className="font-display text-lg text-crimson-500 w-8 shrink-0">#{rank}</span>
      <JerseyAvatar jersey={entry.jersey} primary={entry.primary} secondary={entry.secondary} size={28} />
      <div className="min-w-0 flex-1">
        <span className="text-sm text-chrome-100">{entry.name}</span>
        <span className="text-xs text-chrome-500 ml-2 hidden sm:inline">
          {entry.teamName} · {classificationLabel(entry.classification)}
        </span>
      </div>
      <div className="text-sm font-display shrink-0">
        {showExtra && (
          <>
            <span className="text-chrome-100">
              {formatValue(entry[category], category)} {POSITION_META[pos].units[category]}
            </span>
            <span className="text-chrome-500"> · </span>
          </>
        )}
        <span className={category === "yds" ? "text-chrome-100" : "text-chrome-500"}>
          {entry.yds.toLocaleString()} YDS
        </span>
        <span className="text-chrome-500"> · </span>
        <span className={category === "td" ? "text-chrome-100" : "text-chrome-500"}>
          {entry.td} TD
        </span>
      </div>
    </Link>
  );
}

function DefenseSection({ heading, defenses }: { heading: string; defenses: DefenseEntry[] }) {
  return (
    <div>
      <h2 className="font-display text-2xl mb-3">{heading}</h2>
      {defenses.length === 0 ? (
        <p className="text-chrome-500 text-sm">No data yet.</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            {defenses.slice(0, 3).map((d, i) => (
              <Link key={d.slug} href={`/teams/${d.slug}` as any}>
                <div className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 hover:border-crimson-500 p-5 h-full">
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-display text-3xl text-crimson-500">#{i + 1}</span>
                    <TeamLogo src={d.logoUrl} size={36} />
                  </div>
                  <div className="font-display text-xl leading-tight mb-2">{d.name}</div>
                  <div className="font-display text-4xl">{d.ppg.toFixed(1)}</div>
                  <div className="text-xs text-chrome-500 mt-1">PTS ALLOWED / GAME</div>
                  <div className="text-xs text-chrome-500">
                    {classificationLabel(d.classification)} · {d.wins}–{d.losses}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {defenses.length > 3 && (
            <div className="mt-3 rounded-2xl border border-chrome-500/15 bg-navy-700/40 divide-y divide-chrome-500/10">
              {defenses.slice(3).map((d, i) => (
                <Link
                  key={d.slug}
                  href={`/teams/${d.slug}` as any}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-navy-700/60"
                >
                  <span className="font-display text-lg text-crimson-500 w-8 shrink-0">#{i + 4}</span>
                  <TeamLogo src={d.logoUrl} size={28} />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-chrome-100">{d.name}</span>
                    <span className="text-xs text-chrome-500 ml-2 hidden sm:inline">
                      {classificationLabel(d.classification)} · {d.wins}–{d.losses}
                    </span>
                  </div>
                  <span className="text-sm font-display text-chrome-100 shrink-0">
                    {d.ppg.toFixed(1)} PA/G
                  </span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
