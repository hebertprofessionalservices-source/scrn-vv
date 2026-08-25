import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import type { Editorial, Game, Player, Team } from "./types";
import { buildDataset, type Dataset } from "./data";
import { buildPowerRankings, type PowerRank } from "./power";
import { adjustPriorRatings } from "./returning";
import {
  buildPriorSeasonInfo,
  previousSeason,
  type PriorSeasonInfo,
} from "./prior";
import { computeRankDeltas, type RankDelta, type RankHistory } from "./rank-history";

export type { PriorSeasonInfo } from "./prior";

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
  const [teams, players, games, opponentLogos, prior] = await Promise.all([
    readJson<Team[]>(`${season}/teams.json`, []),
    readJson<Player[]>(`${season}/players.json`, []),
    readJson<Game[]>(`${season}/games.json`, []),
    readJson<Record<string, string>>(`${season}/opponent-logos.json`, {}),
    loadPriorSeasonInfo(season),
  ]);
  const priorRatings = prior
    ? adjustPriorRatings(prior.power, prior.returning)
    : null;
  return buildDataset(
    { teams, players, games, opponentLogos },
    season,
    priorRatings,
    prior?.stateRanks ?? null,
  );
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
  return buildPriorSeasonInfo(prev, teams, players, games);
}

/** Week-over-week rank movement from the season's snapshot history. */
export async function loadRankDeltas(
  season: string,
  power: Map<string, PowerRank>,
): Promise<Map<string, RankDelta>> {
  const history = await readJson<RankHistory>(`${season}/rank-history.json`, {});
  return computeRankDeltas(power, history, new Date().toISOString().slice(0, 10));
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
