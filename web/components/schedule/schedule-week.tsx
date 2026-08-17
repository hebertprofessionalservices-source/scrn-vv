"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { TeamLogo } from "@/components/brand/team-logo";
import { classificationLabel, leagueOf } from "@/lib/team-format";
import {
  activeClassification,
  classOptionsFor,
  filterSchedule,
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

export interface ScheduleLeague {
  league: string;
  days: ScheduleDay[];
}

const CONTROL_CLASSES =
  "bg-navy-700 border border-chrome-500/20 rounded-lg px-3 py-2 text-sm text-chrome-100 hover:border-crimson-500 focus:outline-none focus:border-crimson-500";

/** One week of games, filtered by league, classification and team name. */
export function ScheduleWeek({ leagues }: { leagues: ScheduleLeague[] }) {
  const [query, setQuery] = useState("");
  const [league, setLeague] = useState("");
  const [cls, setCls] = useState("");

  const classOptions = useMemo(() => classOptionsFor(leagues, league), [leagues, league]);
  const activeCls = activeClassification(cls, classOptions);
  const filtered = useMemo(
    () => filterSchedule(leagues, { league, cls, query }),
    [leagues, league, cls, query],
  );

  const filtersActive = Boolean(query.trim() || league || activeCls);

  return (
    <div>
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
