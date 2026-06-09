import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Editorial, Game, Player, Team } from "./types";
import { buildDataset, type Dataset } from "./data";

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
  const [teams, players, games] = await Promise.all([
    readJson<Team[]>(`${season}/teams.json`, []),
    readJson<Player[]>(`${season}/players.json`, []),
    readJson<Game[]>(`${season}/games.json`, []),
  ]);
  return buildDataset({ teams, players, games }, season);
}

export async function loadEditorial(): Promise<Editorial | null> {
  return readJson<Editorial | null>("editorial.json", null);
}
