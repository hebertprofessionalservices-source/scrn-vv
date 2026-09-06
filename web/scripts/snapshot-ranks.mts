/**
 * Snapshot today's MaxPreps rankings into
 * public/data/<season>/rank-history.json.
 *
 * Run after every data update (`pnpm snapshot-ranks` from web/): the site
 * shows rank movement by comparing live rankings against the newest
 * snapshot from an earlier day. Re-running on the same day replaces that
 * day's entry; earlier snapshots stay frozen.
 *
 * TIMING MATTERS, AND IT IS EASY TO GET WRONG. Both shows read the arrows:
 * MHSAA records Sunday, MAIS records Monday. Both need to see the movement
 * the weekend's games caused, which means the baseline has to predate the
 * slate and must NOT be replaced until both shows are done.
 *
 *   Mon (after the MAIS show) or Tue — take the snapshot. Pre-slate baseline.
 *   Thu-Sat — games; refresh results and rankings, but DO NOT snapshot.
 *   Sun — MHSAA show reads movement vs Monday's snapshot.
 *   Mon — MAIS show reads the same movement, still vs that snapshot.
 *
 * Snapshotting on the Saturday after the games, or on Sunday morning, makes
 * the fresh snapshot its own baseline and every arrow silently goes to zero.
 *
 * Snapshots must all be on the same footing. When the rank SOURCE changes,
 * old entries are not comparable and the file has to be cleared — mixing a
 * power-model snapshot with a MaxPreps one reports the switch as movement.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildDataset } from "../lib/data";
import { buildPowerRankings } from "../lib/power";
import { mondayOf, todayISO, type RankHistory } from "../lib/rank-history";
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
// No prior-season inputs: ranks are MaxPreps' current list and nothing is
// carried over from last season.
const data = buildDataset({ teams, players, games }, season);
const power = buildPowerRankings(data);

const today = todayISO();
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
// Only teams MaxPreps actually ranks; a null would make the next run's
// subtraction produce a bogus delta.
const ranked = [...power].filter(
  ([, r]) => r.overallRank !== null && r.classRank !== null,
);
history[today] = Object.fromEntries(
  ranked.map(([id, r]) => [id, { o: r.overallRank!, c: r.classRank! }]),
);

await fs.writeFile(historyPath, JSON.stringify(history, null, 1), "utf-8");
console.log(
  `snapshot ${today}: ${ranked.length} ranked teams -> ${historyPath} ` +
  `(${Object.keys(history).length} snapshots)`,
);
