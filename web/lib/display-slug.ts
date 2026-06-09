import { slugify } from "./slugify";

export function displaySlug(team: { name: string; mascot: string | null }): string {
  const name = slugify(team.name);
  const mascot = team.mascot ? slugify(team.mascot) : "";
  if (!mascot) return name;
  if (name.endsWith(mascot)) return name;
  return `${name}-${mascot}`;
}
