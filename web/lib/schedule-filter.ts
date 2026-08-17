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
 */
export function classOptionsFor<C extends FilterableCard>(
  leagues: FilterableLeague<C>[],
  league: string,
): string[] {
  const present = new Set<string>();
  for (const l of leagues) {
    if (league && l.league !== league) continue;
    for (const d of l.days) for (const g of d.games) for (const c of g.classes) present.add(c);
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
