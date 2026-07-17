import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import type { Editorial, Game, Player, Team } from "./types";
import { buildDataset, type Dataset } from "./data";
import { buildPowerRankings, type PowerRank } from "./power";
import { adjustPriorRatings, returningShares } from "./returning";

const PUBLIC_DATA = path.join(process.cwd(), "public", "data");

async function readJson<T>(rel: string, fallback: T): Promise<T> {
  try {
    const buf = await fs.readFile(path.join(PUBLIC_DATA, rel), "utf-8");
    return JSON.parse(buf) as T;
  } catch {
    return fallback;
  }
}

export async function loadDataset(season: string): Promise<Dataset> {
  const [teams, players, games, prior] = await Promise.all([
    readJson<Team[]>(`${season}/teams.json`, []),
    readJson<Player[]>(`${season}/players.json`, []),
    readJson<Game[]>(`${season}/games.json`, []),
    loadPriorSeasonInfo(season),
  ]);
  const priorRatings = prior
    ? adjustPriorRatings(prior.power, prior.returning)
    : null;
  return buildDataset({ teams, players, games }, season, priorRatings);
}

/** "2026-27" -> "2025-26". */
function previousSeason(season: string): string {
  const y = Number(season.slice(0, 4)) - 1;
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

export interface PriorSeasonInfo {
  season: string;
  /** Final power ranks of the previous season (undiscounted). */
  power: Map<string, PowerRank>;
  /** teamId -> returning-production share (0..1), null when unknown. */
  returning: Map<string, number | null>;
}

/** Previous season's final ratings + returning production (no recursion). */
export async function loadPriorSeasonInfo(
  season: string,
): Promise<PriorSeasonInfo | null> {
  const prev = previousSeason(season);
  const [teams, players, games] = await Promise.all([
    readJson<Team[]>(`${prev}/teams.json`, []),
    readJson<Player[]>(`${prev}/players.json`, []),
    readJson<Game[]>(`${prev}/games.json`, []),
  ]);
  if (teams.length === 0 || games.length === 0) return null;
  const power = buildPowerRankings(buildDataset({ teams, players: [], games }, prev));
  if (power.size === 0) return null;
  return { season: prev, power, returning: returningShares(players) };
}

export async function loadEditorial(): Promise<Editorial | null> {
  return readJson<Editorial | null>("editorial.json", null);
}

export async function availableSeasons(): Promise<string[]> {
  try {
    const entries = await fs.readdir(PUBLIC_DATA, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && /^\d{4}-\d{2}$/.test(e.name))
      .map((e) => e.name)
      .sort()
      .reverse();
  } catch {
    return ["2025-26"];
  }
}

export async function currentSeason(): Promise<string> {
  const c = await cookies();
  const fromCookie = c.get("season")?.value;
  const all = await availableSeasons();
  if (fromCookie && all.includes(fromCookie)) return fromCookie;
  // Default to the newest season that actually has data, so an empty
  // placeholder season (preseason) doesn't take over the home page.
  for (const season of all) {
    const teams = await readJson<Team[]>(`${season}/teams.json`, []);
    if (teams.length > 0) return season;
  }
  return all[0] ?? "2025-26";
}
