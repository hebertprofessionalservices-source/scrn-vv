"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { TeamLogo } from "@/components/brand/team-logo";
import { classificationLabel, leagueOf } from "@/lib/team-format";
import {
  activeClassification,
  classOptionsFor,
  filterSchedule,
  weekLabel,
  weekLabelParts,
  weekOptionsFor,
  type WeekOption,
} from "@/lib/schedule-filter";

export interface ScheduleCard {
  id: string;
  href: string | null;
  /** Both teams' classifications, so cross-class games match either filter. */
  classes: string[];
  away: { name: string; logo: string | null; sub: string };
  home: { name: string; logo: string | null; sub: string };
  awayBold: boolean;
  homeBold: boolean;
  footer: string;
}

export interface ScheduleDay {
  day: string;
  weekday: string;
  dateLabel: string;
  games: ScheduleCard[];
}

export type { WeekOption };

export interface ScheduleLeague {
  league: string;
  days: ScheduleDay[];
}

const CONTROL_CLASSES =
  "bg-navy-700 border border-chrome-500/20 rounded-lg px-3 py-2 text-sm text-chrome-100 hover:border-crimson-500 focus:outline-none focus:border-crimson-500";

/** One week of games, filtered by league, classification and team name. */
export function ScheduleWeek({
  leagues,
  weeks,
  weekIndex,
  initialLeague = "",
  initialCls = "",
}: {
  leagues: ScheduleLeague[];
  weeks: WeekOption[];
  weekIndex: number;
  initialLeague?: string;
  initialCls?: string;
}) {
  const [query, setQuery] = useState("");
  const [league, setLeague] = useState(initialLeague);
  const [cls, setCls] = useState(initialCls);

  const classOptions = useMemo(() => classOptionsFor(leagues, league), [leagues, league]);
  const activeCls = activeClassification(cls, classOptions);
  const filtered = useMemo(
    () => filterSchedule(leagues, { league, cls, query }),
    [leagues, league, cls, query],
  );

  const filtersActive = Boolean(query.trim() || league || activeCls);

  /*
   * Week changes are navigations, so the filters ride along in the URL and
   * come back as initialLeague/initialCls. Leaving the page — including the
   * nav bar's own Schedules link, which points at a bare /upcoming — drops
   * them, which is the reset Garret asked for.
   */
  const hrefFor = (i: number) => {
    const sp = new URLSearchParams({ week: String(i + 1) });
    if (league) sp.set("league", league);
    if (activeCls) sp.set("cls", activeCls);
    return `/upcoming?${sp.toString()}`;
  };

  const current = weeks[weekIndex];

  return (
    <div>
      {/* One line per league, named — a bare "Week 4" means different things
          to the two audiences. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-8">
        <div>
          {weekIndex > 0 && (
            <a
              href={hrefFor(weekIndex - 1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-chrome-500/30 font-display hover:border-crimson-500"
            >
              <span aria-hidden>←</span>
              <WeekLines week={weeks[weekIndex - 1]} league={league} className="text-sm leading-tight" />
            </a>
          )}
        </div>
        <h1 className="font-display text-4xl text-center leading-tight">
          {current ? (
            <WeekLines week={current} league={league} />
          ) : (
            "Schedules"
          )}
        </h1>
        <div className="text-right">
          {weekIndex < weeks.length - 1 && (
            <a
              href={hrefFor(weekIndex + 1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-chrome-500/30 font-display hover:border-crimson-500"
            >
              <WeekLines week={weeks[weekIndex + 1]} league={league} className="text-sm leading-tight" />
              <span aria-hidden>→</span>
            </a>
          )}
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <select
          className={CONTROL_CLASSES}
          value={league}
          onChange={(e) => setLeague(e.target.value)}
          aria-label="Filter by league"
        >
          <option value="">All Leagues</option>
          <option value="MHSAA">MHSAA</option>
          <option value="MAIS">MAIS</option>
        </select>

        {/* Filter order is League > Week > Classification: the league decides
            which weeks and which classes are even on offer. */}
        <select
          className={CONTROL_CLASSES}
          value={String(weekIndex)}
          onChange={(e) => {
            window.location.assign(hrefFor(Number(e.target.value)));
          }}
          aria-label="Jump to week"
        >
          {weekOptionsFor(weeks, league, weekIndex).map(({ week: w, index }) => (
            <option key={w.key} value={index}>
              {weekLabel(w, league)}
            </option>
          ))}
        </select>

        <select
          className={CONTROL_CLASSES}
          value={activeCls}
          onChange={(e) => setCls(e.target.value)}
          aria-label="Filter by classification"
        >
          <option value="">All Classifications</option>
          {league
            ? classOptions.map((c) => (
                <option key={c} value={c}>
                  {classificationLabel(c)}
                </option>
              ))
            : (["MHSAA", "MAIS"] as const).map((lg) => {
                const opts = classOptions.filter((c) => leagueOf(c) === lg);
                return opts.length === 0 ? null : (
                  <optgroup key={lg} label={lg}>
                    {opts.map((c) => (
                      <option key={c} value={c}>
                        {classificationLabel(c)}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
        </select>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search teams…"
          aria-label="Search teams"
          className={`${CONTROL_CLASSES} w-full max-w-sm placeholder:text-chrome-500`}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-chrome-500/15 p-12 text-center">
          <p className="font-display text-2xl mb-2">No games found</p>
          <p className="text-chrome-500 text-sm">
            {filtersActive
              ? "No games this week match those filters."
              : "Check back when the season is underway."}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {filtered.map(({ league, days }) => (
            <section key={league}>
              <h2 className="font-display text-3xl mb-4 border-b border-chrome-500/15 pb-2">
                {league}
              </h2>
              <div className="space-y-8">
                {days.map((d) => (
                  <section key={d.day}>
                    <h3 className="font-display text-2xl mb-3">
                      {d.weekday}
                      <span className="ml-3 text-base text-chrome-500">{d.dateLabel}</span>
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {d.games.map((g) => (
                        <GameCard key={g.id} card={g} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** The week, one named line per league in play. */
function WeekLines({
  week,
  league,
  className = "",
}: {
  week: WeekOption;
  league: string;
  className?: string;
}) {
  const parts = weekLabelParts(week, league);
  if (parts.length === 0) return <span className={className}>Off week</span>;
  return (
    <span className={`inline-block ${className}`}>
      {parts.map((p) => (
        <span key={p} className="block whitespace-nowrap">
          {p}
        </span>
      ))}
    </span>
  );
}

function GameCard({ card }: { card: ScheduleCard }) {
  const subClass = (bold: boolean) =>
    bold ? "text-sm font-display text-chrome-100" : "text-xs text-chrome-500";
  const inner = (
    <div className="rounded-xl border border-chrome-500/15 bg-navy-700/30 px-4 py-3 hover:border-crimson-500 h-full">
      <div className="flex items-center gap-2">
        <TeamLogo src={card.away.logo} size={28} />
        <span className="text-sm flex-1">{card.away.name}</span>
        <span className={subClass(card.awayBold)}>{card.away.sub}</span>
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <TeamLogo src={card.home.logo} size={28} />
        <span className="text-sm flex-1">@ {card.home.name}</span>
        <span className={subClass(card.homeBold)}>{card.home.sub}</span>
      </div>
      <div className="text-xs text-chrome-500 mt-2">{card.footer}</div>
    </div>
  );
  return card.href ? <Link href={card.href as any}>{inner}</Link> : <div>{inner}</div>;
}
