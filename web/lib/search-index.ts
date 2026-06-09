import Fuse, { type IFuseOptions } from "fuse.js";
import type { Player, Team } from "./types";
import { displaySlug } from "./display-slug";

export interface SearchEntry {
  id: string;
  kind: "team" | "player";
  label: string;
  subtitle: string;
  href: string;
}

const OPTIONS: IFuseOptions<SearchEntry> = {
  keys: [
    { name: "label", weight: 0.7 },
    { name: "subtitle", weight: 0.3 },
  ],
  threshold: 0.35,
  distance: 80,
  ignoreLocation: true,
};

export function buildSearchIndex(teams: Team[], players: Player[]) {
  const entries: SearchEntry[] = [];
  for (const t of teams) {
    entries.push({
      id: t.id,
      kind: "team",
      label: t.mascot ? `${t.name} ${t.mascot}` : t.name,
      subtitle: `${t.city ?? ""} · ${t.classification}`,
      href: `/teams/${displaySlug(t)}`,
    });
  }
  for (const p of players) {
    entries.push({
      id: p.id,
      kind: "player",
      label: `${p.name} #${p.jersey ?? "?"}`,
      subtitle: `${p.position} · ${p.class}`,
      href: `/players/${p.id}`,
    });
  }
  return new Fuse(entries, OPTIONS);
}

export type SearchIndex = ReturnType<typeof buildSearchIndex>;
