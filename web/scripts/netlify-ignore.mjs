// Netlify "ignore" check: exit 0 skips the build, exit 1 runs it.
// Skips commits that only touch data the live site already reads from
// GitHub (the newest season folder and editorial.json, see
// lib/data-server.ts) or files outside the app entirely.
import { execFileSync } from "node:child_process";

const prev = process.env.CACHED_COMMIT_REF;
const head = process.env.COMMIT_REF;
const git = (...args) =>
  execFileSync("git", args, { encoding: "utf-8" }).split("\n").filter(Boolean);

function decide() {
  if (!prev || !head || prev === head) return "build: no previous deploy to compare";

  // Judge by the folders the deployed build has, so a brand-new season
  // folder still triggers a build (until then it isn't on disk to go live).
  const seasons = git("ls-tree", "--full-tree", "--name-only", prev, "web/public/data/")
    .map((p) => p.split("/").pop())
    .filter((name) => /^\d{4}-\d{2}$/.test(name))
    .sort()
    .reverse();
  const live = [`web/public/data/editorial.json`];
  if (seasons[0]) live.push(`web/public/data/${seasons[0]}/`);

  const changed = git("diff", "--name-only", prev, head);
  const relevant = changed.filter((f) => f.startsWith("web/") || f === "netlify.toml");
  const needsBuild = relevant.filter((f) => !live.some((l) => f === l || f.startsWith(l)));
  return needsBuild.length
    ? `build: ${needsBuild.length} app file(s) changed, e.g. ${needsBuild[0]}`
    : "skip: only live data or non-app files changed";
}

let verdict;
try {
  verdict = decide();
} catch (err) {
  verdict = `build: ignore check failed (${err.message})`;
}
console.log(`netlify-ignore ${verdict}`);
process.exit(verdict.startsWith("skip") ? 0 : 1);
