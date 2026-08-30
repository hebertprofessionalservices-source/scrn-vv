/**
 * Snapshot today's SCRN Power Rankings into
 * public/data/<season>/rank-history.json.
 *
 * Run after every data update (`pnpm snapshot-ranks` from web/): the site
 * shows rank movement by comparing live rankings against the newest
 * snapshot from an earlier day. Take it early in the game week, before
 * that week's slate, so the Sunday recap reads the movement those games
 * caused. Re-running on the same day replaces that day's entry; earlier
 * snapshots stay frozen.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildDataset } from "../lib/data";
import { buildPowerRankings } from "../lib/power";
import { adjustPriorRatings } from "../lib/returning";
import { buildPriorSeasonInfo, previousSeason } from "../lib/prior";
import { mondayOf, type RankHistory } from "../lib/rank-history";
import type { Game, Player, Team } from "../lib/types";

const PUBLIC_DATA = path.join(process.cwd(), "public", "data");

async function readJson<T>(rel: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(PUBLIC_DATA, rel), "utf-8")) as T;
  } catch {
    return fallback;
  }
}

async function newestSeasonWithTeams(): Promise<string | null> {
  const entries = await fs.readdir(PUBLIC_DATA, { withFileTypes: true });
  const seasons = entries
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}$/.test(e.name))
    .map((e) => e.name)
    .sort()
    .reverse();
  for (const season of seasons) {
    const teams = await readJson<Team[]>(`${season}/teams.json`, []);
    if (teams.length > 0) return season;
  }
  return null;
}

const season = await newestSeasonWithTeams();
if (!season) {
  console.error("no season data found");
  process.exit(1);
}

const [teams, players, games] = await Promise.all([
  readJson<Team[]>(`${season}/teams.json`, []),
  readJson<Player[]>(`${season}/players.json`, []),
  readJson<Game[]>(`${season}/games.json`, []),
]);
const prev = previousSeason(season);
const prior = buildPriorSeasonInfo(
  prev,
  await readJson<Team[]>(`${prev}/teams.json`, []),
  await readJson<Player[]>(`${prev}/players.json`, []),
  await readJson<Game[]>(`${prev}/games.json`, []),
);
const data = buildDataset(
  { teams, players, games },
  season,
  prior ? adjustPriorRatings(prior.power, prior.returning) : null,
  prior?.stateRanks ?? null,
);
const power = buildPowerRankings(data);

const today = new Date().toISOString().slice(0, 10);
const historyPath = path.join(PUBLIC_DATA, season, "rank-history.json");
const history = await readJson<RankHistory>(`${season}/rank-history.json`, {});

// Replace only same-week snapshots taken today or later, so re-running on
// the same day is idempotent. A snapshot from EARLIER in this game week is
// deliberately kept: it is the pre-slate baseline the Sunday recap reads
// movement against, and deleting it would silently push the comparison back
// to the previous week.
for (const date of Object.keys(history)) {
  if (mondayOf(date) === mondayOf(today) && date >= today) delete history[date];
}
history[today] = Object.fromEntries(
  [...power].map(([id, r]) => [id, { o: r.overallRank, c: r.classRank }]),
);

await fs.writeFile(historyPath, JSON.stringify(history, null, 1), "utf-8");
console.log(
  `snapshot ${today}: ${power.size} teams -> ${historyPath} ` +
  `(${Object.keys(history).length} snapshots)`,
);
