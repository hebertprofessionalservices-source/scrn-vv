import Fuse, { type IFuseOptions } from "fuse.js";
import type { Player, Team } from "./types";
import { displaySlug } from "./display-slug";
import { classRegionLabel } from "./team-format";

export interface SearchEntry {
  id: string;
  kind: "team" | "player";
  label: string;
  subtitle: string;
  /** Extra searchable terms (city, mascot) not shown in the UI. */
  keywords: string;
  href: string;
}

const OPTIONS: IFuseOptions<SearchEntry> = {
  keys: [
    { name: "label", weight: 0.6 },
    { name: "subtitle", weight: 0.2 },
    { name: "keywords", weight: 0.2 },
  ],
  threshold: 0.35,
  distance: 80,
  ignoreLocation: true,
};

/**
 * Compact entries built server-side so only ~search-relevant strings cross
 * the client boundary — never full Team/Player objects (12MB+ per page).
 */
export function buildSearchEntries(
  teams: Team[],
  players: Player[],
  playersSeasonLabel: string | null = null,
): SearchEntry[] {
  const entries: SearchEntry[] = [];
  for (const t of teams) {
    entries.push({
      id: t.id,
      kind: "team",
      label: t.name,
      subtitle: classRegionLabel(t),
      keywords: [t.city, t.mascot].filter(Boolean).join(" "),
      href: `/teams/${displaySlug(t)}`,
    });
  }
  for (const p of players) {
    entries.push({
      id: p.id,
      kind: "player",
      label: `${p.name} #${p.jersey ?? "?"}`,
      subtitle:
        `${p.position} · ${p.class}` +
        (playersSeasonLabel ? ` · ${playersSeasonLabel}` : ""),
      keywords: "",
      href: `/players/${p.id}`,
    });
  }
  return entries;
}

export function buildFuse(entries: SearchEntry[]) {
  return new Fuse(entries, OPTIONS);
}

export type SearchIndex = ReturnType<typeof buildFuse>;
