import { slugify } from "./slugify";
import type { Team } from "./types";

/** "7A Region 2" -> "Region 2" (classification already shown elsewhere). */
export function regionLabel(team: Pick<Team, "district" | "classification">): string | null {
  if (!team.district) return null;
  const stripped = team.district.replace(/^(MAIS-)?\d+A\s*/i, "").trim();
  return stripped || team.district;
}

/** "7A Region 2" — classification plus region for compact displays. */
export function classRegionLabel(
  team: Pick<Team, "district" | "classification">,
): string {
  const region = regionLabel(team);
  return region ? `${team.classification} ${region}` : team.classification;
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
