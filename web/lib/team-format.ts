import { slugify } from "./slugify";
import type { Team } from "./types";

/** Display form of a classification: "MAIS-8M-1A" -> "MAIS 8-Man 1A". */
export function classificationLabel(classification: string): string {
  return classification
    .replace(/^MAIS-8M-/, "MAIS 8-Man ")
    .replace(/^MAIS-/, "MAIS ");
}

/**
 * Strip the class prefix from a district so it isn't shown twice:
 * "7A Region 2" -> "Region 2", "MAIS 4A District 3" -> "District 3",
 * "MAIS 8-Man 1A District 2 (8 Man)" -> "District 2".
 */
export function regionLabel(team: Pick<Team, "district" | "classification">): string | null {
  if (!team.district) return null;
  const stripped = team.district
    .replace(/^(MAIS[\s-]*)?(8[\s-]?man\s*)?\d+A\s*/i, "")
    .replace(/\s*\(8\s*man\)\s*$/i, "")
    .trim();
  return stripped || team.district;
}

/** League a classification belongs to. */
export function leagueOf(classification: string): "MHSAA" | "MAIS" {
  return classification.startsWith("MAIS") ? "MAIS" : "MHSAA";
}

/** All classifications, display order. */
export const CLASSIFICATIONS = [
  "7A", "6A", "5A", "4A", "3A", "2A", "1A",
  "MAIS-4A", "MAIS-3A", "MAIS-2A", "MAIS-8M-2A", "MAIS-8M-1A",
];

/** "7A Region 2" / "MAIS 4A District 3" — class plus region, compact. */
export function classRegionLabel(
  team: Pick<Team, "district" | "classification">,
): string {
  const cls = classificationLabel(team.classification);
  const region = regionLabel(team);
  return region ? `${cls} ${region}` : cls;
}

/**
 * MaxPreps game/schedule slugs use the school name without the mascot
 * ("pearl" for the Pearl Pirates). Derive that slug so opponent ids in
 * games.json can be resolved back to full teams.
 */
export function opponentAliasSlug(team: Pick<Team, "name" | "mascot">): string {
  let name = team.name;
  if (team.mascot && name.toLowerCase().endsWith(team.mascot.toLowerCase())) {
    name = name.slice(0, name.length - team.mascot.length);
  }
  return slugify(name.trim());
}

/**
 * States an out-of-state opponent slug can be tagged with by the scraper's
 * disambiguation pass. Kept to the real footprint so an ordinary school name
 * ending in a two-letter word isn't mistaken for a state.
 */
const STATE_CODES = new Set([
  "ms", "tn", "ar", "la", "al", "tx", "ga", "fl", "mo", "ok",
]);

/**
 * Fallback display for opponents we don't carry: "brother-martin" -> "Brother
 * Martin". A trailing state code marks a namesake of one of our teams from
 * another state ("germantown-tn" -> "Germantown (TN)"), so it stays visible
 * rather than reading as part of the school's name.
 */
export function titleCaseSlug(slug: string): string {
  const parts = slug.split("-").filter(Boolean);
  let suffix = "";
  if (parts.length > 1 && STATE_CODES.has(parts[parts.length - 1])) {
    suffix = ` (${parts.pop()!.toUpperCase()})`;
  }
  return parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + suffix;
}
