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

/** Fallback display for opponents we don't carry: "brother-martin" -> "Brother Martin". */
export function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
