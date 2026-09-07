import { leagueOf } from "./team-format";
import { CLASS_ORDER } from "./leaderboard";

export interface FilterableCard {
  /** Both teams' classifications, so cross-class games match either filter. */
  classes: string[];
  away: { name: string };
  home: { name: string };
}

export interface FilterableLeague<C extends FilterableCard> {
  league: string;
  days: { games: C[] }[];
}

export interface ScheduleFilters {
  league: string;
  cls: string;
  query: string;
}

/**
 * Classifications actually playing, narrowed to the selected league so the two
 * dropdowns can never be combined into an empty result.
 *
 * A card carries BOTH teams' classifications so a cross-class game matches
 * either filter, which meant a MAIS side hosting an MHSAA school put bare "5A"
 * and "4A" in the MAIS dropdown. The options are therefore filtered to the
 * selected league's own classifications; the cards still match on either.
 */
export function classOptionsFor<C extends FilterableCard>(
  leagues: FilterableLeague<C>[],
  league: string,
): string[] {
  const present = new Set<string>();
  for (const l of leagues) {
    if (league && l.league !== league) continue;
    for (const d of l.days)
      for (const g of d.games)
        for (const c of g.classes) {
          if (league && leagueOf(c) !== league) continue;
          present.add(c);
        }
  }
  return [
    ...CLASS_ORDER.filter((c) => present.has(c)),
    ...[...present].filter((c) => !CLASS_ORDER.includes(c)).sort(),
  ];
}

/**
 * Switching league can strip the chosen classification off the list; fall back
 * to "all" rather than silently showing nothing.
 */
export function activeClassification(cls: string, options: string[]): string {
  return cls && options.includes(cls) ? cls : "";
}

/** Apply league, classification and team-name filters, dropping empty groups. */
export function filterSchedule<C extends FilterableCard, L extends FilterableLeague<C>>(
  leagues: L[],
  { league, cls, query }: ScheduleFilters,
): L[] {
  const q = query.trim().toLowerCase();
  const activeCls = activeClassification(cls, classOptionsFor(leagues, league));
  const match = (g: C) =>
    (!q ||
      g.away.name.toLowerCase().includes(q) ||
      g.home.name.toLowerCase().includes(q)) &&
    (!activeCls || g.classes.includes(activeCls));

  return leagues
    .filter((l) => !league || l.league === league)
    .map((l) => ({
      ...l,
      days: l.days
        .map((d) => ({ ...d, games: d.games.filter(match) }))
        .filter((d) => d.games.length > 0),
    }))
    .filter((l) => l.days.length > 0) as L[];
}

/** One calendar week, carrying each league's own number for it. */
export interface WeekOption {
  key: string;
  mais: number | null;
  mhsaa: number | null;
}

/**
 * How a week is labelled depends on who is looking.
 *
 * The leagues do not share a count: MAIS opens two weeks before MHSAA but calls
 * its first slate Week 0, leaving its number one ahead all season — Sep 11 2026
 * is MHSAA Week 3 and MAIS Week 4. The league is always named, because a bare
 * "Week 4" means different things to the two audiences.
 *
 * Returns one part per league in play, so a caller can stack them on separate
 * lines or join them, whichever its space allows.
 */
export function weekLabelParts(w: WeekOption, league: string): string[] {
  const parts: string[] = [];
  if (league !== "MAIS" && w.mhsaa !== null) parts.push(`MHSAA Week ${w.mhsaa}`);
  if (league !== "MHSAA" && w.mais !== null) parts.push(`MAIS Week ${w.mais}`);
  return parts;
}

/** Single-line form, for a <select> option where a line break is not possible. */
export function weekLabel(w: WeekOption, league: string): string {
  const parts = weekLabelParts(w, league);
  return parts.length ? parts.join(" / ") : "Off week";
}

/**
 * The weeks worth offering for a league — one it actually plays.
 *
 * MHSAA has nothing in mid-August while MAIS is already two weeks in, so
 * listing those weeks under an MHSAA filter would offer a guaranteed empty
 * page. The current week is always kept so the select has a value to show.
 */
export function weekOptionsFor(
  weeks: WeekOption[],
  league: string,
  currentIndex: number,
): { week: WeekOption; index: number }[] {
  return weeks
    .map((week, index) => ({ week, index }))
    .filter(
      ({ week, index }) =>
        index === currentIndex || weekLabelParts(week, league).length > 0,
    );
}
