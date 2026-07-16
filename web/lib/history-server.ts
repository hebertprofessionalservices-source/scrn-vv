import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { HistoryData } from "./history";

const HISTORY_DIR = path.join(process.cwd(), "public", "data", "history");

let cached: HistoryData | null | undefined;

/**
 * AFHS historical dataset, loaded once per server process. Returns null when
 * the history files haven't been generated yet — callers render n/a.
 */
export async function loadHistory(): Promise<HistoryData | null> {
  if (cached !== undefined) return cached;
  try {
    const [games, coachPages, teamMap] = await Promise.all([
      fs.readFile(path.join(HISTORY_DIR, "afhs-games.json"), "utf-8"),
      fs.readFile(path.join(HISTORY_DIR, "afhs-coaches.json"), "utf-8"),
      fs.readFile(path.join(HISTORY_DIR, "afhs-team-map.json"), "utf-8"),
    ]);
    cached = {
      games: JSON.parse(games),
      coachPages: JSON.parse(coachPages),
      teamMap: JSON.parse(teamMap),
    };
  } catch {
    cached = null;
  }
  return cached;
}
