import { classificationLabel, leagueOf } from "./team-format";

/**
 * The home page's league + classification filter, shared by every section it
 * governs: the season leaderboards, the weekly performances, Outstanding
 * Performances and last week's scores. An empty string means "all".
 */

/** Does a single classification pass the filter? */
export function classInScope(classification: string, league: string, cls: string): boolean {
  if (league && leagueOf(classification) !== league) return false;
  return !cls || classification === cls;
}

/** Does an entry carrying one classification pass the filter? */
export function inScope(
  e: { classification: string },
  league: string,
  cls: string,
): boolean {
  return classInScope(e.classification, league, cls);
}

/**
 * Does anything with two sides — a game — pass the filter? Either side is
 * enough, so filtering to MAIS never hides a game a MAIS team played, even
 * when the opponent is out of class or out of league.
 */
export function anyInScope(classifications: string[], league: string, cls: string): boolean {
  return classifications.some((c) => classInScope(c, league, cls));
}

/** Heading parenthetical — " (MAIS · MAIS 3A)"; empty when unfiltered. */
export function scopeSuffix(league: string, cls: string): string {
  const parts = [league, cls && classificationLabel(cls)].filter(Boolean);
  return parts.length ? ` (${parts.join(" · ")})` : "";
}
