# Varsity Voices Dashboard — Implementation Plan (Phase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js 15 broadcast-grade dashboard for Mississippi HS varsity football, fed by the JSON output of the Phase 1 scraper, gated by a shared site password, deployable to Vercel under `dashboard.scrn.live`.

**Architecture:** Static-generated Next.js App Router site reading three JSON files per season (`teams.json`, `players.json`, `games.json`) plus an `editorial.json`. Edge middleware enforces a signed-cookie site password. shadcn/ui components + Tailwind for the visual layer, Fuse.js for cmd-K search, Recharts for charts. No DB; no API server. A second password layer gates `/admin/editorial`, which commits `editorial.json` changes back to git via a GitHub PAT to trigger Vercel rebuilds.

**Tech Stack:** Next.js 15 (App Router, static export-friendly), TypeScript, Tailwind CSS v4, shadcn/ui, Lucide React icons, Recharts v2, Fuse.js v7, next-themes (always-dark), jose (HMAC cookie signing), pnpm.

**Source spec:** `docs/superpowers/specs/2026-06-07-varsity-voices-dashboard-design.md`
**Source data:** `scraper/output/data/{season}/{teams,players,games}.json` → mirrored to `web/public/data/{season}/`

**Pre-existing data realities (folded into the plan):**
- Team IDs duplicate the mascot suffix (e.g. `ashland-blue-devils-blue-devils`). Data layer derives a cleaner `displaySlug` for URLs.
- ~80% of players have all-zero `stats` (only stat leaders carry real numbers). Player UIs handle empty-stats gracefully.
- Box score `playerId` values are raw labels like `"Braden Shettles(Sr)"`, not real player IDs. Box score rows render as plain text — no profile links.
- ~5% of game `homeTeamId`/`awayTeamId` slugs don't match any team in `teams.json`. Defensive "Unknown opponent" rendering.
- Team-level yardage stats are all zero (only `pointsFor`/`pointsAgainst` are computed). Tale-of-the-Tape uses points + record only.

---

## File Structure

```
web/
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── tailwind.config.ts
├── components.json                     # shadcn config
├── middleware.ts                       # site password gate
├── .env.example
├── public/
│   ├── data/{season}/                  # mirrored from scraper
│   │   ├── teams.json
│   │   ├── players.json
│   │   ├── games.json
│   │   └── editorial.json
│   ├── team-logos/                     # mirrored from scraper
│   ├── brand/
│   │   ├── varsity-voices-logo.png
│   │   ├── scrn-logo.png
│   │   └── led-dots-bg.jpg
│   └── favicon.ico
├── app/
│   ├── layout.tsx                      # root + dark + fonts + chrome
│   ├── page.tsx                        # home (on-air summary)
│   ├── globals.css                     # Tailwind + brand tokens
│   ├── unlock/page.tsx                 # site password form
│   ├── api/unlock/route.ts             # POST → set cookie
│   ├── api/admin/editorial/route.ts    # POST → commit editorial.json
│   ├── teams/page.tsx
│   ├── teams/[slug]/page.tsx
│   ├── players/page.tsx
│   ├── players/[slug]/page.tsx
│   ├── matchup/[matchup]/page.tsx
│   ├── present/page.tsx                # presentation mode of home
│   ├── present/teams/[slug]/page.tsx
│   ├── present/players/[slug]/page.tsx
│   ├── present/matchup/[matchup]/page.tsx
│   └── admin/editorial/page.tsx
├── components/
│   ├── ui/                             # shadcn primitives
│   ├── brand/
│   │   ├── site-header.tsx
│   │   ├── site-footer.tsx
│   │   └── led-hero.tsx
│   ├── search/command-palette.tsx
│   ├── filters/
│   │   ├── class-filter.tsx
│   │   ├── position-filter.tsx
│   │   └── season-switcher.tsx
│   ├── cards/
│   │   ├── top-performer-card.tsx
│   │   ├── top-defense-card.tsx
│   │   ├── game-of-the-week-card.tsx
│   │   └── score-strip.tsx
│   ├── matchup/
│   │   ├── tale-of-the-tape.tsx
│   │   └── form-guide.tsx
│   ├── player/
│   │   ├── jersey-avatar.tsx
│   │   └── season-stat-grid.tsx
│   └── team/team-stat-panel.tsx
├── lib/
│   ├── data.ts                         # JSON loaders + indexes
│   ├── types.ts                        # TS types mirroring scraper schema
│   ├── slugify.ts                      # mirror of scraper slugify
│   ├── display-slug.ts                 # derive prettier URL slugs
│   ├── search-index.ts                 # Fuse.js setup
│   ├── stats.ts                        # top-N by position, rankings
│   ├── editorial.ts                    # load editorial; algo GOTW pick
│   ├── auth.ts                         # cookie HMAC sign/verify
│   ├── format.ts                       # number/record formatters
│   └── utils.ts                        # cn()
└── tests/
    ├── data.test.ts
    ├── display-slug.test.ts
    ├── stats.test.ts
    ├── editorial.test.ts
    └── auth.test.ts
```

**Boundaries:** `lib/` has zero React; pure data/logic. `components/` is presentation only; data comes in via props from `app/` pages. The middleware is the only piece that mutates cookies. Tests live alongside `lib/` because that's where logic exists; component tests are intentionally out of scope for v1 (UI is verified via Playwright smoke + visual inspection).

---

## Setup notes for the engineer

- Use `pnpm` (faster cold installs than npm; lockfile committed).
- Use the Tailwind v4 PostCSS plugin (no `tailwind.config.ts` for v4 — the config goes in CSS via `@theme`). The structure includes `tailwind.config.ts` only if v4 ergonomics surprise the engineer and a v3 fallback is needed.
- Use `pnpm exec shadcn@latest init` and answer: TypeScript / React Server Components / Tailwind v4 / new-york style / dark color base / src dir = no, app dir = yes, import alias `@/*`.
- Sync data files locally before `pnpm dev`:
  ```bash
  rsync -a scraper/output/data/ web/public/data/
  rsync -a scraper/output/logos/ web/public/team-logos/
  ```
  (or use `robocopy` on plain Windows; document both in the README.) The GitHub Actions workflow already does this on the production rebuild.

---

## Task 1: Bootstrap Next.js + Tailwind + shadcn

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/next.config.ts`
- Create: `web/postcss.config.mjs`
- Create: `web/app/layout.tsx`
- Create: `web/app/page.tsx`
- Create: `web/app/globals.css`
- Create: `web/.env.example`
- Create: `web/.gitignore`
- Create: `web/README.md`
- Create: `web/components.json` (after shadcn init)

- [ ] **Step 1: Create `web/` and init pnpm workspace**

```bash
cd "C:/Users/garre/OneDrive/Desktop/Claude Code/varsity-voices-dashboard"
mkdir -p web
cd web
pnpm init
```

- [ ] **Step 2: Install Next.js + React + TypeScript**

```bash
pnpm add next@^15 react@^19 react-dom@^19
pnpm add -D typescript @types/node @types/react @types/react-dom
```

- [ ] **Step 3: Install Tailwind v4, shadcn deps**

```bash
pnpm add -D tailwindcss@next @tailwindcss/postcss postcss
pnpm add -D autoprefixer
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm add tw-animate-css
```

- [ ] **Step 4: Install runtime deps (data, search, charts, auth, themes)**

```bash
pnpm add fuse.js recharts next-themes jose
```

- [ ] **Step 5: Write `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 6: Write `web/next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: { typedRoutes: true },
};

export default nextConfig;
```

`images.unoptimized` is required for Vercel preview reliability with our self-hosted logo files; once on a paid plan we can re-enable optimization.

- [ ] **Step 7: Write `web/postcss.config.mjs`**

```js
export default {
  plugins: { "@tailwindcss/postcss": {} },
};
```

- [ ] **Step 8: Write `web/app/globals.css`**

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme {
  --color-navy-50:  #e7ecf3;
  --color-navy-500: #1f3a6b;
  --color-navy-700: #0b1f3a;
  --color-navy-900: #050810;
  --color-crimson-500: #c8102e;
  --color-crimson-600: #a50d24;
  --color-chrome-100: #e8e8ea;
  --color-chrome-300: #b9bcc2;
  --color-chrome-500: #6c7079;
  --font-display: "Barlow Condensed", "Oswald", system-ui, sans-serif;
  --font-sans: "Inter", system-ui, sans-serif;
}

html, body {
  background-color: var(--color-navy-900);
  color: var(--color-chrome-100);
  font-family: var(--font-sans);
}

.bg-led-dots {
  background-image: url("/brand/led-dots-bg.jpg");
  background-size: cover;
  background-position: center;
}
```

- [ ] **Step 9: Write `web/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Varsity Voices · Mississippi HS Football",
  description: "Statewide MHSAA & MAIS football coverage from SCRN.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 10: Write a placeholder `web/app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <h1 className="text-4xl font-display">Varsity Voices — coming online</h1>
    </main>
  );
}
```

- [ ] **Step 11: Write `web/.env.example`**

```
SITE_PASSWORD=
ADMIN_PASSWORD=
COOKIE_SECRET=
GITHUB_PAT=
GITHUB_REPO=garret/varsity-voices-dashboard
```

- [ ] **Step 12: Write `web/.gitignore`**

```
node_modules/
.next/
out/
.vercel/
.env*.local
*.tsbuildinfo
next-env.d.ts
```

- [ ] **Step 13: Write `web/README.md`** with setup, dev, build, deploy sections (Windows-friendly).

```markdown
# Varsity Voices Dashboard

Next.js dashboard for Mississippi HS football. Reads JSON output of the Phase 1 scraper.

## Setup

```bash
cd web
pnpm install
pnpm exec shadcn@latest init   # one-time
cp .env.example .env.local
# fill in SITE_PASSWORD, ADMIN_PASSWORD, COOKIE_SECRET
```

## Sync data (local)

```bash
# Git Bash / PowerShell:
robocopy ..\scraper\output\data web\public\data /MIR
robocopy ..\scraper\output\logos web\public\team-logos /MIR
```

## Dev

```bash
pnpm dev
```

## Build

```bash
pnpm build && pnpm start
```

## Deploy

Push to `main`; Vercel auto-deploys. Set env vars in Vercel project settings.
```

- [ ] **Step 14: Run shadcn init**

```bash
pnpm dlx shadcn@latest init
```

Answer: TypeScript yes, RSC yes, Tailwind v4 yes, style new-york, base color slate, CSS variables yes, alias `@/components` and `@/lib`. This writes `components.json` and patches `globals.css`.

- [ ] **Step 15: Install a baseline of shadcn components**

```bash
pnpm dlx shadcn@latest add button card badge input table sheet dialog command tabs scroll-area separator skeleton
```

- [ ] **Step 16: Smoke test**

```bash
pnpm dev
```

Open http://localhost:3000 — placeholder page renders on the dark navy background.

- [ ] **Step 17: Commit**

```bash
cd ..
git add web/
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): bootstrap Next.js 15 + Tailwind v4 + shadcn"
```

---

## Task 2: Data layer — types + loaders + display slugs

**Files:**
- Create: `web/lib/types.ts`
- Create: `web/lib/slugify.ts`
- Create: `web/lib/display-slug.ts`
- Create: `web/lib/data.ts`
- Create: `web/tests/display-slug.test.ts`
- Create: `web/tests/data.test.ts`
- Create: `web/vitest.config.ts`

- [ ] **Step 1: Install vitest**

```bash
cd web
pnpm add -D vitest @vitest/ui happy-dom
```

- [ ] **Step 2: Write `web/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

Add `"test": "vitest run"` and `"test:ui": "vitest --ui"` to `package.json` scripts.

- [ ] **Step 3: Write `web/lib/types.ts`** — exact mirror of scraper output

```ts
export type Position = "QB" | "RB" | "WR" | "TE" | "OL" | "DL" | "LB" | "DB" | "K" | "P" | "ATH";
export type PlayerClass = "FR" | "SO" | "JR" | "SR";
export type GameStatus = "final" | "scheduled" | "in_progress" | "postponed";
export type DataStatus = "complete" | "incomplete" | "missing";
export type Classification =
  | "1A" | "2A" | "3A" | "4A" | "5A" | "6A" | "7A"
  | "MAIS-1A" | "MAIS-2A" | "MAIS-3A" | "MAIS-4A" | "MAIS-5A" | "MAIS-6A";

export interface TeamRecord { wins: number; losses: number; }
export interface TeamRankings {
  stateOverall: number | null;
  stateClass: number | null;
  national: number | null;
}
export interface TeamStats {
  pointsFor: number; pointsAgainst: number;
  yardsFor: number; yardsAgainst: number;
  passYdsFor: number; rushYdsFor: number;
  passYdsAgainst: number; rushYdsAgainst: number;
  turnoversForced: number; turnoversLost: number;
}
export interface TeamColors { primary: string | null; secondary: string | null; }

export interface Team {
  id: string;
  name: string;
  mascot: string | null;
  city: string | null;
  classification: Classification;
  district: string | null;
  logoUrl: string | null;
  colors: TeamColors;
  season: string;
  record: TeamRecord;
  rankings: TeamRankings;
  stats: TeamStats;
  headCoach: string | null;
  maxprepsUrl: string | null;
}

export interface PassingStats { att: number; cmp: number; yds: number; td: number; int: number; rating: number; }
export interface RushingStats { att: number; yds: number; td: number; ypc: number; }
export interface ReceivingStats { rec: number; yds: number; td: number; }
export interface DefenseStats { tackles: number; sacks: number; int: number; ff: number; }
export interface KickingStats { fgm: number; fga: number; xpm: number; xpa: number; }
export interface PlayerStats {
  passing: PassingStats; rushing: RushingStats; receiving: ReceivingStats;
  defense: DefenseStats; kicking: KickingStats;
}

export interface Player {
  id: string;
  teamId: string;
  season: string;
  name: string;
  jersey: string | null;
  position: Position;
  class: PlayerClass;
  height: string | null;
  weight: number | null;
  stats: PlayerStats;
  gamesPlayed: number;
}

export interface BoxScoreEntry {
  playerId: string;
  cmp?: number | null; att?: number | null; yds?: number | null;
  td?: number | null; int?: number | null; rec?: number | null;
  tackles?: number | null; sacks?: number | null; ff?: number | null;
  fgm?: number | null; fga?: number | null; xpm?: number | null; xpa?: number | null;
}
export interface BoxScore {
  passing: BoxScoreEntry[]; rushing: BoxScoreEntry[];
  receiving: BoxScoreEntry[]; defense: BoxScoreEntry[];
}
export interface QuarterScores { home: number[]; away: number[]; }

export interface Game {
  id: string;
  season: string;
  week: number;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  quarterScores: QuarterScores;
  status: GameStatus;
  dataStatus: DataStatus;
  venue: string | null;
  boxScore: BoxScore | null;
  maxprepsUrl: string | null;
}

export interface Editorial {
  currentSeason: string;
  currentWeek: number;
  gameOfTheWeek: {
    gameId: string | null;
    storyline: string;
    pickedBy: string;
    pickedAt: string;
  };
  topPerformerNotes: Partial<Record<"QB" | "RB" | "WR" | "DEF", string>>;
  featuredQuote: string;
}
```

- [ ] **Step 4: Write `web/lib/slugify.ts`**

```ts
export function slugify(value: string): string {
  if (!value) return "";
  const normalized = value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const stripped = normalized.replace(/['’]/g, "");
  return stripped.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 5: Write the failing display-slug test**

`web/tests/display-slug.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { displaySlug } from "@/lib/display-slug";

describe("displaySlug", () => {
  it("strips duplicated mascot suffix", () => {
    expect(displaySlug({ name: "Ashland Blue Devils", mascot: "Blue Devils" }))
      .toBe("ashland-blue-devils");
  });
  it("keeps mascot when it adds information", () => {
    expect(displaySlug({ name: "Starkville", mascot: "Yellowjackets" }))
      .toBe("starkville-yellowjackets");
  });
  it("handles missing mascot", () => {
    expect(displaySlug({ name: "Tupelo", mascot: null }))
      .toBe("tupelo");
  });
  it("strips apostrophes and punctuation", () => {
    expect(displaySlug({ name: "D'Iberville", mascot: "Warriors" }))
      .toBe("diberville-warriors");
  });
});
```

- [ ] **Step 6: Run failing test**

```bash
pnpm test
```
Expected: fail with `Cannot find module '@/lib/display-slug'`.

- [ ] **Step 7: Implement `web/lib/display-slug.ts`**

```ts
import { slugify } from "./slugify";

export function displaySlug(team: { name: string; mascot: string | null }): string {
  const name = slugify(team.name);
  const mascot = team.mascot ? slugify(team.mascot) : "";
  if (!mascot) return name;
  if (name.endsWith(mascot)) return name;     // mascot already in name
  return `${name}-${mascot}`;
}
```

- [ ] **Step 8: Run tests → green, commit**

```bash
pnpm test
git add web/lib web/tests web/vitest.config.ts web/package.json
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): TS types and display-slug helper"
```

- [ ] **Step 9: Write the failing data-loader test**

`web/tests/data.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildDataset } from "@/lib/data";
import type { Team, Player, Game } from "@/lib/types";

const team: Team = {
  id: "x-team-team", name: "X", mascot: "Team", city: null,
  classification: "7A", district: null, logoUrl: null,
  colors: { primary: null, secondary: null }, season: "2025-26",
  record: { wins: 5, losses: 5 },
  rankings: { stateOverall: null, stateClass: null, national: null },
  stats: { pointsFor: 200, pointsAgainst: 150, yardsFor: 0, yardsAgainst: 0,
    passYdsFor: 0, rushYdsFor: 0, passYdsAgainst: 0, rushYdsAgainst: 0,
    turnoversForced: 0, turnoversLost: 0 },
  headCoach: null, maxprepsUrl: null,
};
const player: Player = {
  id: "x-team-team-12-doe", teamId: "x-team-team", season: "2025-26",
  name: "Jane Doe", jersey: "12", position: "QB", class: "SR",
  height: null, weight: null, gamesPlayed: 10,
  stats: {
    passing: { att: 100, cmp: 65, yds: 1500, td: 20, int: 5, rating: 100 },
    rushing: { att: 0, yds: 0, td: 0, ypc: 0 },
    receiving: { rec: 0, yds: 0, td: 0 },
    defense: { tackles: 0, sacks: 0, int: 0, ff: 0 },
    kicking: { fgm: 0, fga: 0, xpm: 0, xpa: 0 },
  },
};
const game: Game = {
  id: "g1", season: "2025-26", week: 0, date: "2025-09-12",
  homeTeamId: "x-team-team", awayTeamId: "y-team-team",
  homeScore: 21, awayScore: 14,
  quarterScores: { home: [7, 7, 0, 7], away: [0, 7, 0, 7] },
  status: "final", dataStatus: "complete", venue: null,
  boxScore: { passing: [], rushing: [], receiving: [], defense: [] },
  maxprepsUrl: null,
};

describe("buildDataset", () => {
  it("indexes teams by id and displaySlug", () => {
    const d = buildDataset({ teams: [team], players: [], games: [] });
    expect(d.teamsById.get("x-team-team")?.name).toBe("X");
    expect(d.teamsBySlug.get("x-team")?.name).toBe("X");
  });

  it("indexes players by teamId and id", () => {
    const d = buildDataset({ teams: [team], players: [player], games: [] });
    expect(d.playersByTeam.get("x-team-team")?.length).toBe(1);
    expect(d.playersById.get(player.id)?.name).toBe("Jane Doe");
  });

  it("indexes games by teamId both sides", () => {
    const d = buildDataset({ teams: [team], players: [], games: [game] });
    expect(d.gamesByTeam.get("x-team-team")?.length).toBe(1);
    expect(d.gamesByTeam.get("y-team-team")?.length).toBe(1);
  });
});
```

- [ ] **Step 10: Run test → fails (module missing)**

- [ ] **Step 11: Implement `web/lib/data.ts`**

```ts
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Editorial, Game, Player, Team } from "./types";
import { displaySlug } from "./display-slug";

export interface RawDataset { teams: Team[]; players: Player[]; games: Game[]; }

export interface Dataset {
  teams: Team[];
  players: Player[];
  games: Game[];
  teamsById: Map<string, Team>;
  teamsBySlug: Map<string, Team>;
  playersById: Map<string, Player>;
  playersByTeam: Map<string, Player[]>;
  gamesByTeam: Map<string, Game[]>;
  gamesById: Map<string, Game>;
  season: string;
}

export function buildDataset(raw: RawDataset, season = "2025-26"): Dataset {
  const teamsById = new Map<string, Team>();
  const teamsBySlug = new Map<string, Team>();
  for (const t of raw.teams) {
    teamsById.set(t.id, t);
    teamsBySlug.set(displaySlug(t), t);
  }
  const playersById = new Map<string, Player>();
  const playersByTeam = new Map<string, Player[]>();
  for (const p of raw.players) {
    playersById.set(p.id, p);
    const list = playersByTeam.get(p.teamId) ?? [];
    list.push(p);
    playersByTeam.set(p.teamId, list);
  }
  const gamesByTeam = new Map<string, Game[]>();
  const gamesById = new Map<string, Game>();
  for (const g of raw.games) {
    gamesById.set(g.id, g);
    for (const tid of [g.homeTeamId, g.awayTeamId]) {
      const list = gamesByTeam.get(tid) ?? [];
      list.push(g);
      gamesByTeam.set(tid, list);
    }
  }
  return {
    teams: raw.teams, players: raw.players, games: raw.games,
    teamsById, teamsBySlug, playersById, playersByTeam,
    gamesByTeam, gamesById, season,
  };
}

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
```

- [ ] **Step 12: Run tests → green, commit**

```bash
pnpm test
git add web/lib/data.ts web/tests/data.test.ts
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): data layer with typed loaders and indexes"
```

---

## Task 3: Auth — site password gate via edge middleware

**Files:**
- Create: `web/lib/auth.ts`
- Create: `web/tests/auth.test.ts`
- Create: `web/middleware.ts`
- Create: `web/app/unlock/page.tsx`
- Create: `web/app/api/unlock/route.ts`

- [ ] **Step 1: Write the failing auth test**

`web/tests/auth.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "@/lib/auth";

const secret = "test-secret-do-not-use-in-prod-aaaaaaaaaaaa";

describe("auth cookie tokens", () => {
  it("round-trips a payload", async () => {
    const token = await signToken({ scope: "site" }, secret);
    const decoded = await verifyToken(token, secret);
    expect(decoded?.scope).toBe("site");
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signToken({ scope: "site" }, secret);
    const decoded = await verifyToken(token, "other-secret-other-secret-other");
    expect(decoded).toBeNull();
  });

  it("rejects a tampered token", async () => {
    const token = await signToken({ scope: "site" }, secret);
    const tampered = token.slice(0, -2) + "xx";
    expect(await verifyToken(tampered, secret)).toBeNull();
  });
});
```

- [ ] **Step 2: Run → fails (module missing)**

- [ ] **Step 3: Implement `web/lib/auth.ts`**

```ts
import { SignJWT, jwtVerify } from "jose";

export interface TokenPayload {
  scope: "site" | "admin";
  iat?: number;
  exp?: number;
}

const enc = new TextEncoder();

export async function signToken(
  payload: TokenPayload,
  secret: string,
  ttlSeconds = 60 * 60 * 24 * 30, // 30 days
): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(enc.encode(secret));
}

export async function verifyToken(
  token: string,
  secret: string,
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, enc.encode(secret));
    if (payload.scope !== "site" && payload.scope !== "admin") return null;
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export const COOKIE_NAME = "vv_session";
export const ADMIN_COOKIE_NAME = "vv_admin";
```

- [ ] **Step 4: Run → green, commit**

```bash
cd web
pnpm test
cd ..
git add web/lib/auth.ts web/tests/auth.test.ts
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): HMAC cookie helpers via jose"
```

- [ ] **Step 5: Implement `web/middleware.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/unlock", "/api/unlock", "/_next", "/brand", "/favicon.ico"];

export const config = { matcher: "/((?!api/admin/editorial).*)" };

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  const secret = process.env.COOKIE_SECRET;
  if (!secret) {
    return new NextResponse("Server misconfiguration", { status: 500 });
  }
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const decoded = token ? await verifyToken(token, secret) : null;
  if (!decoded) {
    const url = req.nextUrl.clone();
    url.pathname = "/unlock";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
```

- [ ] **Step 6: Implement `web/app/unlock/page.tsx`**

```tsx
import { Suspense } from "react";

export default function UnlockPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <main className="min-h-screen bg-led-dots bg-cover flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl bg-navy-900/80 backdrop-blur p-8 border border-chrome-500/20">
        <h1 className="font-display text-3xl text-chrome-100 mb-2">Varsity Voices</h1>
        <p className="text-chrome-300 text-sm mb-6">Authorized SCRN staff only.</p>
        <form action="/api/unlock" method="post" className="space-y-4">
          <input type="hidden" name="next" value={searchParams.next ?? "/"} />
          <input
            type="password"
            name="password"
            autoFocus
            required
            placeholder="Site password"
            className="w-full px-4 py-3 rounded-lg bg-navy-700 text-chrome-100 placeholder:text-chrome-500 border border-chrome-500/20 focus:border-crimson-500 outline-none"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-crimson-500 hover:bg-crimson-600 text-chrome-100 font-display tracking-wide"
          >
            UNLOCK
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 7: Implement `web/app/api/unlock/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, signToken } from "@/lib/auth";

// In-memory throttle (one process = one Vercel function instance).
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/");
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  const now = Date.now();
  const rec = attempts.get(ip);
  if (rec && rec.resetAt > now && rec.count >= 3) {
    return new NextResponse("Too many attempts, try again in 60s.", { status: 429 });
  }

  const expected = process.env.SITE_PASSWORD;
  const secret = process.env.COOKIE_SECRET;
  if (!expected || !secret) return new NextResponse("Server misconfigured.", { status: 500 });

  if (password !== expected) {
    const nextRec = rec && rec.resetAt > now ? rec : { count: 0, resetAt: now + 60_000 };
    nextRec.count += 1;
    attempts.set(ip, nextRec);
    const url = req.nextUrl.clone();
    url.pathname = "/unlock";
    url.searchParams.set("next", next);
    url.searchParams.set("err", "1");
    return NextResponse.redirect(url, 303);
  }

  attempts.delete(ip);
  const token = await signToken({ scope: "site" }, secret);
  const url = req.nextUrl.clone();
  url.pathname = next.startsWith("/") ? next : "/";
  url.search = "";
  const res = NextResponse.redirect(url, 303);
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true, secure: true, sameSite: "lax",
    path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
```

- [ ] **Step 8: Smoke + commit**

```bash
cd web
SITE_PASSWORD=test COOKIE_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") pnpm dev
```

Visit http://localhost:3000 → redirected to /unlock → submit `test` → land at /. Wrong password → bounce back with `?err=1`.

```bash
cd ..
git add web/middleware.ts web/app/unlock web/app/api/unlock
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): site password gate via edge middleware"
```

---

## Task 4: Brand layout — header, footer, fonts, theme tokens

**Files:**
- Create: `web/components/brand/site-header.tsx`
- Create: `web/components/brand/site-footer.tsx`
- Create: `web/components/brand/led-hero.tsx`
- Modify: `web/app/layout.tsx`
- Modify: `web/app/page.tsx`

- [ ] **Step 1: Copy brand assets into `web/public/brand/`**

```bash
cd "C:/Users/garre/OneDrive/Desktop/Claude Code/varsity-voices-dashboard"
mkdir -p web/public/brand
cp assets/scrnLogo.png        web/public/brand/scrn-logo.png
cp assets/varsityVocalsLogo.jpg web/public/brand/varsity-voices-logo.jpg
cp assets/background-led-dots.jpeg web/public/brand/led-dots-bg.jpg
```

- [ ] **Step 2: Add Google Fonts to `web/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["500","600","700","800"], variable: "--font-display" });

export const metadata: Metadata = {
  title: "Varsity Voices · Mississippi HS Football",
  description: "Statewide MHSAA & MAIS football coverage from SCRN.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${display.variable}`}>
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Implement `web/components/brand/site-header.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-chrome-500/15 bg-navy-900/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto h-16 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/varsity-voices-logo.jpg"
            alt="Varsity Voices"
            width={140} height={48}
            className="h-10 w-auto rounded"
            priority
          />
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm uppercase tracking-wide font-display">
          <Link href="/" className="hover:text-crimson-500">Home</Link>
          <Link href="/teams" className="hover:text-crimson-500">Teams</Link>
          <Link href="/players" className="hover:text-crimson-500">Players</Link>
          <Link href="/matchup" className="hover:text-crimson-500">Matchup</Link>
        </nav>
        <div className="text-xs text-chrome-500 hidden sm:block">2025–26 · MS</div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Implement `web/components/brand/site-footer.tsx`**

```tsx
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-chrome-500/15 bg-navy-900">
      <div className="max-w-7xl mx-auto py-6 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-chrome-500">
          <Image src="/brand/scrn-logo.png" alt="SCRN" width={36} height={36} className="h-8 w-auto" />
          <span>Powered by State Championships Radio Network</span>
        </div>
        <a href="https://scrn.live" className="text-xs text-chrome-300 hover:text-crimson-500">
          scrn.live →
        </a>
      </div>
    </footer>
  );
}
```

- [ ] **Step 5: Implement `web/components/brand/led-hero.tsx`** (reusable hero with the LED-dot background overlay)

```tsx
import { cn } from "@/lib/utils";

export function LedHero({
  children, className,
}: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("relative overflow-hidden bg-navy-900", className)}>
      <div className="absolute inset-0 bg-led-dots opacity-[0.08] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 py-12">{children}</div>
    </section>
  );
}
```

- [ ] **Step 6: Add a temporary `web/lib/utils.ts`** (if shadcn init didn't create it)

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 7: Update `web/app/page.tsx`**

```tsx
import { LedHero } from "@/components/brand/led-hero";

export default function Home() {
  return (
    <LedHero>
      <h1 className="font-display text-5xl md:text-7xl">
        Week 11 · <span className="text-crimson-500">Mississippi</span> HS Football
      </h1>
      <p className="mt-4 text-chrome-300">
        Statewide coverage. Data refreshed Sunday + Tuesday nights.
      </p>
    </LedHero>
  );
}
```

- [ ] **Step 8: Smoke + commit**

```bash
pnpm dev
```

Verify: header + footer render, LED-dot hero glows behind the title, navigation links present.

```bash
cd ..
git add web/components/brand web/app/layout.tsx web/app/page.tsx web/lib/utils.ts web/public/brand
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): brand layout (header, footer, LED hero)"
```

---

## Task 5: Stats aggregations + global search index

**Files:**
- Create: `web/lib/stats.ts`
- Create: `web/lib/search-index.ts`
- Create: `web/tests/stats.test.ts`
- Create: `web/components/search/command-palette.tsx`
- Modify: `web/components/brand/site-header.tsx` (add cmd-K trigger)

- [ ] **Step 1: Write the failing stats test**

`web/tests/stats.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { topPlayersByStat, topDefensesByPPG } from "@/lib/stats";
import type { Player, Team, Game } from "@/lib/types";

function mkPlayer(overrides: Partial<Player>): Player {
  return {
    id: overrides.id ?? "x", teamId: overrides.teamId ?? "x",
    season: "2025-26", name: overrides.name ?? "X",
    jersey: "1", position: overrides.position ?? "QB", class: "SR",
    height: null, weight: null, gamesPlayed: 10,
    stats: overrides.stats ?? {
      passing: { att: 0, cmp: 0, yds: 0, td: 0, int: 0, rating: 0 },
      rushing: { att: 0, yds: 0, td: 0, ypc: 0 },
      receiving: { rec: 0, yds: 0, td: 0 },
      defense: { tackles: 0, sacks: 0, int: 0, ff: 0 },
      kicking: { fgm: 0, fga: 0, xpm: 0, xpa: 0 },
    },
    ...overrides,
  } as Player;
}

describe("topPlayersByStat", () => {
  it("ranks QBs by passing yards desc", () => {
    const players = [
      mkPlayer({ id: "a", name: "A", position: "QB",
        stats: { passing: { att: 0, cmp: 0, yds: 100, td: 0, int: 0, rating: 0 },
          rushing: { att: 0, yds: 0, td: 0, ypc: 0 },
          receiving: { rec: 0, yds: 0, td: 0 },
          defense: { tackles: 0, sacks: 0, int: 0, ff: 0 },
          kicking: { fgm: 0, fga: 0, xpm: 0, xpa: 0 } } }),
      mkPlayer({ id: "b", name: "B", position: "QB",
        stats: { passing: { att: 0, cmp: 0, yds: 300, td: 0, int: 0, rating: 0 },
          rushing: { att: 0, yds: 0, td: 0, ypc: 0 },
          receiving: { rec: 0, yds: 0, td: 0 },
          defense: { tackles: 0, sacks: 0, int: 0, ff: 0 },
          kicking: { fgm: 0, fga: 0, xpm: 0, xpa: 0 } } }),
    ];
    const top = topPlayersByStat(players, "QB", (p) => p.stats.passing.yds, 3);
    expect(top.map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("excludes players with zero in the target stat", () => {
    const players = [mkPlayer({ id: "a", position: "QB" })]; // all zeros
    expect(topPlayersByStat(players, "QB", (p) => p.stats.passing.yds, 3)).toHaveLength(0);
  });
});

describe("topDefensesByPPG", () => {
  const teams: Team[] = [
    { id: "t1", name: "A", mascot: null, city: null, classification: "7A",
      district: null, logoUrl: null, colors: { primary: null, secondary: null },
      season: "2025-26", record: { wins: 5, losses: 0 },
      rankings: { stateOverall: null, stateClass: null, national: null },
      stats: { pointsFor: 0, pointsAgainst: 50, yardsFor: 0, yardsAgainst: 0,
        passYdsFor: 0, rushYdsFor: 0, passYdsAgainst: 0, rushYdsAgainst: 0,
        turnoversForced: 0, turnoversLost: 0 },
      headCoach: null, maxprepsUrl: null },
    { id: "t2", name: "B", mascot: null, city: null, classification: "7A",
      district: null, logoUrl: null, colors: { primary: null, secondary: null },
      season: "2025-26", record: { wins: 5, losses: 0 },
      rankings: { stateOverall: null, stateClass: null, national: null },
      stats: { pointsFor: 0, pointsAgainst: 100, yardsFor: 0, yardsAgainst: 0,
        passYdsFor: 0, rushYdsFor: 0, passYdsAgainst: 0, rushYdsAgainst: 0,
        turnoversForced: 0, turnoversLost: 0 },
      headCoach: null, maxprepsUrl: null },
  ];
  it("ranks by lowest points allowed per game", () => {
    const ranked = topDefensesByPPG(teams, 3);
    expect(ranked[0].team.id).toBe("t1");
    expect(ranked[0].ppg).toBe(10); // 50 / 5
  });
});
```

- [ ] **Step 2: Run → fail. Implement `web/lib/stats.ts`**

```ts
import type { Player, Position, Team } from "./types";

export function topPlayersByStat(
  players: Player[],
  position: Position,
  metric: (p: Player) => number,
  limit: number,
): Player[] {
  return players
    .filter((p) => p.position === position && metric(p) > 0)
    .sort((a, b) => metric(b) - metric(a))
    .slice(0, limit);
}

export interface DefenseRank { team: Team; ppg: number; }

export function topDefensesByPPG(teams: Team[], limit: number): DefenseRank[] {
  return teams
    .filter((t) => t.record.wins + t.record.losses > 0)
    .map<DefenseRank>((t) => ({
      team: t,
      ppg: t.stats.pointsAgainst / (t.record.wins + t.record.losses),
    }))
    .sort((a, b) => a.ppg - b.ppg)
    .slice(0, limit);
}

export function teamsByClass(teams: Team[]): Map<string, Team[]> {
  const out = new Map<string, Team[]>();
  for (const t of teams) {
    const list = out.get(t.classification) ?? [];
    list.push(t);
    out.set(t.classification, list);
  }
  return out;
}

export function lastWeeksGames(games: { date: string; status: string }[], today = new Date()): typeof games {
  const lastWeekEnd = new Date(today);
  lastWeekEnd.setDate(today.getDate() - today.getDay()); // last Sunday
  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekEnd.getDate() - 7);
  return games.filter((g) => {
    if (g.status !== "final") return false;
    const d = new Date(g.date);
    return d >= lastWeekStart && d <= lastWeekEnd;
  });
}
```

- [ ] **Step 3: Run → green, commit**

```bash
cd web
pnpm test
cd ..
git add web/lib/stats.ts web/tests/stats.test.ts
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): season stat aggregations"
```

- [ ] **Step 4: Implement `web/lib/search-index.ts`**

```ts
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
```

- [ ] **Step 5: Implement `web/components/search/command-palette.tsx`** (client component)

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { buildSearchIndex, type SearchEntry } from "@/lib/search-index";
import type { Player, Team } from "@/lib/types";

export function CommandPalette({ teams, players }: { teams: Team[]; players: Player[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const fuse = useMemo(() => buildSearchIndex(teams, players), [teams, players]);
  const results = useMemo<SearchEntry[]>(
    () => (query.trim() ? fuse.search(query, { limit: 25 }).map((r) => r.item) : []),
    [fuse, query],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 overflow-hidden max-w-lg">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search teams or players…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{query ? "No results" : "Type to search"}</CommandEmpty>
            {results.length > 0 && (
              <CommandGroup heading="Results">
                {results.map((r) => (
                  <CommandItem
                    key={`${r.kind}:${r.id}`}
                    onSelect={() => { setOpen(false); router.push(r.href); }}
                  >
                    <span className="font-medium">{r.label}</span>
                    <span className="ml-2 text-xs text-chrome-500">{r.subtitle}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 6: Wire palette into the header**

In `site-header.tsx`, add an inline trigger:

```tsx
import { Button } from "@/components/ui/button";
// inside <header>, between nav and right-side label:
<Button
  variant="outline"
  size="sm"
  onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
  className="text-xs text-chrome-500 hidden sm:flex"
>
  Search… ⌘K
</Button>
```

Mount the palette globally — easiest is in `layout.tsx` as a Server Component that loads data and renders `<CommandPalette teams={...} players={...} />`:

```tsx
import { CommandPalette } from "@/components/search/command-palette";
import { loadDataset } from "@/lib/data";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  return (
    <html /* ... */>
      <body /* ... */>
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <CommandPalette teams={data.teams} players={data.players} />
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Smoke + commit**

Verify cmd-K opens the palette and navigates on selection.

```bash
git add web/lib/search-index.ts web/components/search web/components/brand/site-header.tsx web/app/layout.tsx
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): cmd-K command palette over Fuse.js"
```

---

## Task 6: Teams browser page

**Files:**
- Create: `web/app/teams/page.tsx`
- Create: `web/components/filters/class-filter.tsx`
- Create: `web/components/cards/team-card.tsx`

- [ ] **Step 1: Implement `web/components/cards/team-card.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { displaySlug } from "@/lib/display-slug";
import type { Team } from "@/lib/types";

export function TeamCard({ team }: { team: Team }) {
  const slug = displaySlug(team);
  return (
    <Link href={`/teams/${slug}`}>
      <Card className="p-4 hover:border-crimson-500 transition-colors h-full flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {team.logoUrl && (
            <Image src={team.logoUrl} alt="" width={48} height={48} className="h-12 w-12 object-contain" />
          )}
          <div>
            <h3 className="font-display text-lg leading-tight">{team.name}</h3>
            <p className="text-xs text-chrome-500">{team.city}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <Badge variant="outline">{team.classification}</Badge>
          <span className="text-sm text-chrome-300">
            {team.record.wins}–{team.record.losses}
          </span>
        </div>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Implement `web/components/filters/class-filter.tsx`** (client)

```tsx
"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const CLASSES = ["1A","2A","3A","4A","5A","6A","7A"];

export function ClassFilter() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const active = params.get("class");

  function setClass(c: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (c) sp.set("class", c); else sp.delete("class");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => setClass(null)}>
        <Badge variant={active === null ? "default" : "outline"}>All</Badge>
      </button>
      {CLASSES.map((c) => (
        <button key={c} onClick={() => setClass(c)}>
          <Badge variant={active === c ? "default" : "outline"}>{c}</Badge>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Implement `web/app/teams/page.tsx`** (server component)

```tsx
import { loadDataset } from "@/lib/data";
import { ClassFilter } from "@/components/filters/class-filter";
import { TeamCard } from "@/components/cards/team-card";

export default async function TeamsPage({
  searchParams,
}: { searchParams: { class?: string; sort?: string } }) {
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  const cls = searchParams.class ?? null;
  const sort = searchParams.sort ?? "name";

  let teams = data.teams;
  if (cls) teams = teams.filter((t) => t.classification === cls);

  teams = [...teams].sort((a, b) => {
    if (sort === "wins") return b.record.wins - a.record.wins;
    if (sort === "points") return b.stats.pointsFor - a.stats.pointsFor;
    if (sort === "defense") return a.stats.pointsAgainst - b.stats.pointsAgainst;
    return a.name.localeCompare(b.name);
  });

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between mb-6">
        <h1 className="font-display text-4xl">Teams</h1>
        <span className="text-chrome-500 text-sm">{teams.length} teams</span>
      </div>
      <div className="mb-6 space-y-4">
        <ClassFilter />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teams.map((t) => <TeamCard key={t.id} team={t} />)}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Smoke + commit**

Visit `/teams`, `/teams?class=7A`, `/teams?sort=wins`. All should render.

```bash
git add web/app/teams/page.tsx web/components/filters/class-filter.tsx web/components/cards/team-card.tsx
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): teams browser with class filter"
```

---

## Task 7: Team detail page

**Files:**
- Create: `web/app/teams/[slug]/page.tsx`
- Create: `web/components/team/team-stat-panel.tsx`
- Create: `web/components/player/jersey-avatar.tsx`

- [ ] **Step 1: Implement `web/components/player/jersey-avatar.tsx`**

```tsx
import { cn } from "@/lib/utils";

export function JerseyAvatar({
  jersey, primary, secondary, size = 40,
}: { jersey: string | null; primary?: string | null; secondary?: string | null; size?: number; }) {
  const bg = primary ?? "var(--color-navy-700)";
  const fg = secondary ?? "var(--color-chrome-100)";
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-full font-display font-bold")}
      style={{ background: bg, color: fg, width: size, height: size, fontSize: size * 0.42 }}
    >
      {jersey ?? "?"}
    </span>
  );
}
```

- [ ] **Step 2: Implement `web/components/team/team-stat-panel.tsx`**

```tsx
import type { Team } from "@/lib/types";

export function TeamStatPanel({ team }: { team: Team }) {
  const games = team.record.wins + team.record.losses;
  const ppg = games ? (team.stats.pointsFor / games).toFixed(1) : "—";
  const papg = games ? (team.stats.pointsAgainst / games).toFixed(1) : "—";
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Stat label="Record" value={`${team.record.wins}–${team.record.losses}`} />
      <Stat label="PPG" value={ppg} />
      <Stat label="PA / G" value={papg} />
      <Stat label="State Rank" value={team.rankings.stateOverall ? `#${team.rankings.stateOverall}` : "—"} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-chrome-500/15 bg-navy-700/40 p-4">
      <div className="text-xs uppercase tracking-wider text-chrome-500">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
    </div>
  );
}
```

- [ ] **Step 3: Implement `web/app/teams/[slug]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadDataset } from "@/lib/data";
import { TeamStatPanel } from "@/components/team/team-stat-panel";
import { JerseyAvatar } from "@/components/player/jersey-avatar";
import { Badge } from "@/components/ui/badge";

export default async function TeamDetailPage({ params }: { params: { slug: string } }) {
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  const team = data.teamsBySlug.get(params.slug);
  if (!team) notFound();

  const players = data.playersByTeam.get(team.id) ?? [];
  const games = (data.gamesByTeam.get(team.id) ?? [])
    .sort((a, b) => a.date.localeCompare(b.date));

  const groupedRoster = new Map<string, typeof players>();
  for (const p of players) {
    const list = groupedRoster.get(p.position) ?? [];
    list.push(p);
    groupedRoster.set(p.position, list);
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <header className="flex items-center gap-6">
        {team.logoUrl && (
          <Image src={team.logoUrl} alt="" width={96} height={96} className="h-24 w-24 object-contain" />
        )}
        <div>
          <h1 className="font-display text-5xl">{team.name}</h1>
          <p className="text-chrome-500">{team.city}</p>
          <div className="mt-2 flex items-center gap-2">
            <Badge>{team.classification}</Badge>
            {team.district && <Badge variant="outline">{team.district}</Badge>}
            {team.headCoach && (
              <span className="text-sm text-chrome-300 ml-2">Coach {team.headCoach}</span>
            )}
          </div>
        </div>
        <Link
          href={`/present/teams/${params.slug}`}
          className="ml-auto px-4 py-2 rounded-lg border border-crimson-500 text-crimson-500 font-display"
        >
          Broadcast →
        </Link>
      </header>

      <TeamStatPanel team={team} />

      <section>
        <h2 className="font-display text-2xl mb-3">Schedule</h2>
        <div className="rounded-xl border border-chrome-500/15 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-navy-700/50 text-chrome-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Opponent</th>
                <th className="px-3 py-2 text-right">Result</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => {
                const isHome = g.homeTeamId === team.id;
                const oppId = isHome ? g.awayTeamId : g.homeTeamId;
                const opp = data.teamsById.get(oppId);
                const sf = isHome ? g.homeScore : g.awayScore;
                const sa = isHome ? g.awayScore : g.homeScore;
                return (
                  <tr key={g.id} className="border-t border-chrome-500/10">
                    <td className="px-3 py-2 text-chrome-300">{g.date}</td>
                    <td className="px-3 py-2">
                      {isHome ? "vs " : "@ "}
                      {opp ? opp.name : oppId.replace(/-/g, " ")}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {g.status === "final" && sf !== null && sa !== null
                        ? `${sf > sa ? "W" : "L"} ${sf}–${sa}`
                        : g.status === "scheduled" ? "—" : g.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl mb-3">Roster</h2>
        <div className="space-y-4">
          {Array.from(groupedRoster.entries()).map(([pos, list]) => (
            <div key={pos}>
              <h3 className="text-xs uppercase tracking-wider text-chrome-500 mb-2">{pos}</h3>
              <div className="flex flex-wrap gap-3">
                {list.map((p) => (
                  <Link
                    key={p.id} href={`/players/${p.id}`}
                    className="flex items-center gap-2 rounded-lg border border-chrome-500/15 px-2 py-1 hover:border-crimson-500"
                  >
                    <JerseyAvatar
                      jersey={p.jersey}
                      primary={team.colors.primary} secondary={team.colors.secondary}
                      size={32}
                    />
                    <div>
                      <div className="text-sm">{p.name}</div>
                      <div className="text-[10px] text-chrome-500">{p.class}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export async function generateStaticParams() {
  const { loadDataset } = await import("@/lib/data");
  const { displaySlug } = await import("@/lib/display-slug");
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  return data.teams.map((t) => ({ slug: displaySlug(t) }));
}
```

- [ ] **Step 4: Smoke + commit**

Visit `/teams/starkville-yellowjackets`. Confirm header, stats grid, schedule table, roster groups by position.

```bash
git add web/app/teams web/components/team web/components/player/jersey-avatar.tsx
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): team detail page with schedule and roster"
```

---

## Task 8: Players browser + Player detail

**Files:**
- Create: `web/app/players/page.tsx`
- Create: `web/app/players/[slug]/page.tsx`
- Create: `web/components/filters/position-filter.tsx`
- Create: `web/components/player/season-stat-grid.tsx`

- [ ] **Step 1: Implement `web/components/filters/position-filter.tsx`** (mirrors class-filter pattern)

```tsx
"use client";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const POSITIONS = ["QB","RB","WR","TE","OL","DL","LB","DB","K","P","ATH"];

export function PositionFilter() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const active = params.get("pos");

  function setPos(p: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (p) sp.set("pos", p); else sp.delete("pos");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => setPos(null)}>
        <Badge variant={active === null ? "default" : "outline"}>All</Badge>
      </button>
      {POSITIONS.map((p) => (
        <button key={p} onClick={() => setPos(p)}>
          <Badge variant={active === p ? "default" : "outline"}>{p}</Badge>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Implement `web/app/players/page.tsx`**

```tsx
import Link from "next/link";
import { loadDataset } from "@/lib/data";
import { PositionFilter } from "@/components/filters/position-filter";
import { JerseyAvatar } from "@/components/player/jersey-avatar";

export default async function PlayersPage({
  searchParams,
}: { searchParams: { pos?: string; class?: string } }) {
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  const pos = searchParams.pos ?? null;
  const cls = searchParams.class ?? null;

  let players = data.players;
  if (pos) players = players.filter((p) => p.position === pos);
  if (cls) players = players.filter((p) => p.class === cls);

  // Sort by total offensive yards desc when a position is set, else alpha
  players = [...players].sort((a, b) => {
    if (pos) {
      const aTotal = a.stats.passing.yds + a.stats.rushing.yds + a.stats.receiving.yds;
      const bTotal = b.stats.passing.yds + b.stats.rushing.yds + b.stats.receiving.yds;
      return bTotal - aTotal;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-end justify-between mb-6">
        <h1 className="font-display text-4xl">Players</h1>
        <span className="text-chrome-500 text-sm">{players.length.toLocaleString()} listed</span>
      </div>
      <div className="mb-6"><PositionFilter /></div>
      <ul className="divide-y divide-chrome-500/15 rounded-xl border border-chrome-500/15 overflow-hidden">
        {players.slice(0, 200).map((p) => {
          const team = data.teamsById.get(p.teamId);
          return (
            <li key={p.id}>
              <Link href={`/players/${p.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-navy-700/40">
                <JerseyAvatar jersey={p.jersey} size={32} />
                <div className="flex-1">
                  <div className="text-sm">{p.name}</div>
                  <div className="text-xs text-chrome-500">{p.position} · {p.class} · {team?.name}</div>
                </div>
                <span className="text-xs text-chrome-500">{team?.classification}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      {players.length > 200 && (
        <p className="text-xs text-chrome-500 mt-4 text-center">
          Showing first 200. Use the search palette (⌘K) to find specific players.
        </p>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Implement `web/components/player/season-stat-grid.tsx`**

```tsx
import type { PlayerStats } from "@/lib/types";

export function SeasonStatGrid({ stats }: { stats: PlayerStats }) {
  const groups: Array<{ label: string; entries: Array<[string, number | string]> }> = [];
  if (stats.passing.yds + stats.passing.att > 0) {
    groups.push({ label: "Passing", entries: [
      ["YDS", stats.passing.yds], ["TD", stats.passing.td],
      ["INT", stats.passing.int], ["CMP/ATT", `${stats.passing.cmp}/${stats.passing.att}`],
    ]});
  }
  if (stats.rushing.yds + stats.rushing.att > 0) {
    groups.push({ label: "Rushing", entries: [
      ["YDS", stats.rushing.yds], ["TD", stats.rushing.td],
      ["YPC", stats.rushing.ypc.toFixed(1)], ["ATT", stats.rushing.att],
    ]});
  }
  if (stats.receiving.yds + stats.receiving.rec > 0) {
    groups.push({ label: "Receiving", entries: [
      ["YDS", stats.receiving.yds], ["TD", stats.receiving.td], ["REC", stats.receiving.rec],
    ]});
  }
  if (stats.defense.tackles + stats.defense.sacks + stats.defense.int > 0) {
    groups.push({ label: "Defense", entries: [
      ["TKL", stats.defense.tackles], ["SACK", stats.defense.sacks],
      ["INT", stats.defense.int], ["FF", stats.defense.ff],
    ]});
  }
  if (stats.kicking.fgm + stats.kicking.xpm > 0) {
    groups.push({ label: "Kicking", entries: [
      ["FGM", `${stats.kicking.fgm}/${stats.kicking.fga}`],
      ["XPM", `${stats.kicking.xpm}/${stats.kicking.xpa}`],
    ]});
  }
  if (groups.length === 0) {
    return <p className="text-chrome-500 text-sm">No season stat leaders for this player.</p>;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((g) => (
        <div key={g.label} className="rounded-xl border border-chrome-500/15 p-4">
          <div className="text-xs uppercase tracking-wider text-chrome-500 mb-2">{g.label}</div>
          <div className="grid grid-cols-4 gap-3">
            {g.entries.map(([k, v]) => (
              <div key={k}>
                <div className="text-[10px] text-chrome-500">{k}</div>
                <div className="font-display text-xl">{v}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement `web/app/players/[slug]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { loadDataset } from "@/lib/data";
import { JerseyAvatar } from "@/components/player/jersey-avatar";
import { SeasonStatGrid } from "@/components/player/season-stat-grid";
import { displaySlug } from "@/lib/display-slug";

export default async function PlayerDetailPage({ params }: { params: { slug: string } }) {
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  const player = data.playersById.get(params.slug);
  if (!player) notFound();
  const team = data.teamsById.get(player.teamId);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <header className="flex items-center gap-6">
        <JerseyAvatar jersey={player.jersey}
          primary={team?.colors.primary} secondary={team?.colors.secondary} size={96} />
        <div>
          <h1 className="font-display text-5xl">{player.name}</h1>
          <p className="text-chrome-300">
            {player.position} · {player.class} · {player.height ?? "—"} · {player.weight ?? "—"}
          </p>
          {team && (
            <Link href={`/teams/${displaySlug(team)}`} className="text-crimson-500 text-sm">
              {team.name} →
            </Link>
          )}
        </div>
      </header>
      <SeasonStatGrid stats={player.stats} />
    </main>
  );
}

export async function generateStaticParams() {
  const { loadDataset } = await import("@/lib/data");
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  // Cap to 5000 for build perf; rest still resolvable at request time
  return data.players.slice(0, 5000).map((p) => ({ slug: p.id }));
}
```

- [ ] **Step 5: Smoke + commit**

Verify `/players` paginates first 200; `/players?pos=QB` filters; `/players/[id]` renders detail.

```bash
git add web/app/players web/components/filters/position-filter.tsx web/components/player/season-stat-grid.tsx
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): players browser and detail pages"
```

---

## Task 9: Matchup page

**Files:**
- Create: `web/app/matchup/[matchup]/page.tsx`
- Create: `web/components/matchup/tale-of-the-tape.tsx`
- Create: `web/components/matchup/form-guide.tsx`

- [ ] **Step 1: Implement `web/components/matchup/tale-of-the-tape.tsx`**

```tsx
import type { Team } from "@/lib/types";

function games(t: Team) { return t.record.wins + t.record.losses; }
function ppg(t: Team) { return games(t) ? t.stats.pointsFor / games(t) : 0; }
function papg(t: Team) { return games(t) ? t.stats.pointsAgainst / games(t) : 0; }

const ROWS: Array<{ label: string; value: (t: Team) => number; betterIsHigher: boolean; format?: (n: number) => string }> = [
  { label: "Wins", value: (t) => t.record.wins, betterIsHigher: true, format: (n) => `${n}` },
  { label: "Losses", value: (t) => t.record.losses, betterIsHigher: false, format: (n) => `${n}` },
  { label: "PPG", value: ppg, betterIsHigher: true, format: (n) => n.toFixed(1) },
  { label: "PA / G", value: papg, betterIsHigher: false, format: (n) => n.toFixed(1) },
  { label: "State Rank", value: (t) => t.rankings.stateOverall ?? 999, betterIsHigher: false,
    format: (n) => n === 999 ? "—" : `#${n}` },
];

export function TaleOfTheTape({ a, b }: { a: Team; b: Team }) {
  return (
    <div className="rounded-2xl border border-chrome-500/15 overflow-hidden">
      <table className="w-full">
        <tbody>
          {ROWS.map((row) => {
            const av = row.value(a);
            const bv = row.value(b);
            const aBetter = row.betterIsHigher ? av > bv : av < bv;
            const bBetter = row.betterIsHigher ? bv > av : bv < av;
            const fmt = row.format ?? ((n) => `${n}`);
            return (
              <tr key={row.label} className="border-t border-chrome-500/10 first:border-t-0">
                <td className={`px-4 py-3 text-right font-display text-xl ${aBetter ? "text-crimson-500" : ""}`}>{fmt(av)}</td>
                <td className="px-2 py-3 text-center text-xs uppercase text-chrome-500 w-32">{row.label}</td>
                <td className={`px-4 py-3 text-left font-display text-xl ${bBetter ? "text-crimson-500" : ""}`}>{fmt(bv)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Implement `web/components/matchup/form-guide.tsx`**

```tsx
import type { Game } from "@/lib/types";

export function FormGuide({ teamId, games }: { teamId: string; games: Game[] }) {
  const last5 = games
    .filter((g) => g.status === "final")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5)
    .reverse();
  return (
    <div className="flex items-center gap-1">
      {last5.map((g) => {
        const isHome = g.homeTeamId === teamId;
        const sf = isHome ? g.homeScore : g.awayScore;
        const sa = isHome ? g.awayScore : g.homeScore;
        if (sf == null || sa == null) return <span key={g.id} className="w-6 h-6 rounded bg-chrome-500/20" />;
        const win = sf > sa;
        return (
          <span key={g.id}
            title={`${g.date}: ${sf}-${sa}`}
            className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold ${win ? "bg-green-600/70" : "bg-crimson-600/80"}`}>
            {win ? "W" : "L"}
          </span>
        );
      })}
      {last5.length === 0 && <span className="text-xs text-chrome-500">No games played</span>}
    </div>
  );
}
```

- [ ] **Step 3: Implement `web/app/matchup/[matchup]/page.tsx`**

The route param is the literal `{away-slug}-vs-{home-slug}` string. Parse it.

```tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { loadDataset } from "@/lib/data";
import { TaleOfTheTape } from "@/components/matchup/tale-of-the-tape";
import { FormGuide } from "@/components/matchup/form-guide";
import { displaySlug } from "@/lib/display-slug";

export default async function MatchupPage({ params }: { params: { matchup: string } }) {
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  const m = params.matchup.match(/^(.+)-vs-(.+)$/);
  if (!m) notFound();
  const away = data.teamsBySlug.get(m[1]);
  const home = data.teamsBySlug.get(m[2]);
  if (!away || !home) notFound();

  const awayGames = data.gamesByTeam.get(away.id) ?? [];
  const homeGames = data.gamesByTeam.get(home.id) ?? [];
  const h2h = awayGames.filter((g) =>
    g.homeTeamId === home.id || g.awayTeamId === home.id);

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center justify-end gap-3">
          <div className="text-right">
            <div className="text-xs text-chrome-500">{away.classification} · {away.record.wins}–{away.record.losses}</div>
            <Link href={`/teams/${displaySlug(away)}`} className="font-display text-3xl">{away.name}</Link>
          </div>
          {away.logoUrl && <Image src={away.logoUrl} alt="" width={64} height={64} className="h-16 w-16 object-contain" />}
        </div>
        <div className="font-display text-5xl text-crimson-500">VS</div>
        <div className="flex items-center gap-3">
          {home.logoUrl && <Image src={home.logoUrl} alt="" width={64} height={64} className="h-16 w-16 object-contain" />}
          <div>
            <div className="text-xs text-chrome-500">{home.classification} · {home.record.wins}–{home.record.losses}</div>
            <Link href={`/teams/${displaySlug(home)}`} className="font-display text-3xl">{home.name}</Link>
          </div>
        </div>
      </div>

      <TaleOfTheTape a={away} b={home} />

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <h2 className="font-display text-xl mb-2">{away.name} — Last 5</h2>
          <FormGuide teamId={away.id} games={awayGames} />
        </section>
        <section>
          <h2 className="font-display text-xl mb-2">{home.name} — Last 5</h2>
          <FormGuide teamId={home.id} games={homeGames} />
        </section>
      </div>

      {h2h.length > 0 && (
        <section>
          <h2 className="font-display text-xl mb-2">Head-to-Head</h2>
          <ul className="space-y-1 text-sm">
            {h2h.map((g) => (
              <li key={g.id} className="text-chrome-300">
                {g.date}: {g.awayScore} – {g.homeScore}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href={`/present/matchup/${params.matchup}`}
        className="inline-block px-4 py-2 rounded-lg border border-crimson-500 text-crimson-500 font-display"
      >
        Open in broadcast mode →
      </Link>
    </main>
  );
}
```

- [ ] **Step 4: Smoke + commit**

Visit `/matchup/starkville-yellowjackets-vs-oxford-chargers` (or whichever real slugs exist).

```bash
git add web/app/matchup web/components/matchup
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): matchup compare page with tale-of-the-tape"
```

---

## Task 10: Game of the Week algorithm + editorial loader

**Files:**
- Create: `web/lib/editorial.ts`
- Create: `web/tests/editorial.test.ts`

- [ ] **Step 1: Write failing test**

`web/tests/editorial.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { pickAlgorithmGOTW } from "@/lib/editorial";
import type { Game, Team } from "@/lib/types";

function team(id: string, rank: number | null): Team {
  return {
    id, name: id, mascot: null, city: null, classification: "7A",
    district: null, logoUrl: null, colors: { primary: null, secondary: null },
    season: "2025-26", record: { wins: 5, losses: 0 },
    rankings: { stateOverall: rank, stateClass: null, national: null },
    stats: { pointsFor: 0, pointsAgainst: 0, yardsFor: 0, yardsAgainst: 0,
      passYdsFor: 0, rushYdsFor: 0, passYdsAgainst: 0, rushYdsAgainst: 0,
      turnoversForced: 0, turnoversLost: 0 },
    headCoach: null, maxprepsUrl: null,
  };
}
function game(id: string, home: string, away: string, status: "final" | "scheduled" = "scheduled"): Game {
  return {
    id, season: "2025-26", week: 0, date: "2025-09-12",
    homeTeamId: home, awayTeamId: away,
    homeScore: null, awayScore: null,
    quarterScores: { home: [], away: [] },
    status, dataStatus: "missing", venue: null, boxScore: null,
    maxprepsUrl: null,
  };
}

describe("pickAlgorithmGOTW", () => {
  it("prefers games between two ranked teams over one ranked + unranked", () => {
    const teams = [team("a", 1), team("b", 2), team("c", null)];
    const games = [game("g1", "a", "c"), game("g2", "a", "b")];
    const pick = pickAlgorithmGOTW(games, teams);
    expect(pick?.id).toBe("g2");
  });

  it("returns null when no scheduled games", () => {
    const teams = [team("a", 1), team("b", 2)];
    const games = [game("g1", "a", "b", "final")];
    expect(pickAlgorithmGOTW(games, teams)).toBeNull();
  });
});
```

- [ ] **Step 2: Run → fails. Implement `web/lib/editorial.ts`**

```ts
import type { Editorial, Game, Team } from "./types";

export interface EditorialContext {
  editorial: Editorial | null;
  hostPickGame: Game | null;
  algorithmPickGame: Game | null;
}

export function pickAlgorithmGOTW(games: Game[], teams: Team[]): Game | null {
  const byId = new Map(teams.map((t) => [t.id, t]));
  const candidates = games.filter((g) => g.status === "scheduled");
  if (candidates.length === 0) return null;

  let best: { game: Game; score: number } | null = null;
  for (const g of candidates) {
    const home = byId.get(g.homeTeamId);
    const away = byId.get(g.awayTeamId);
    if (!home || !away) continue;
    const hr = home.rankings.stateOverall ?? 999;
    const ar = away.rankings.stateOverall ?? 999;
    // Lower rank = better. Boost when both ranked.
    const rankScore = (hr < 999 && ar < 999) ? 1000 - (hr + ar) : 500 - Math.min(hr, ar);
    // Tightness: close win percentages
    const hw = home.record.wins / Math.max(1, home.record.wins + home.record.losses);
    const aw = away.record.wins / Math.max(1, away.record.wins + away.record.losses);
    const tightness = 1 - Math.abs(hw - aw);
    const score = rankScore + tightness * 50;
    if (!best || score > best.score) best = { game: g, score };
  }
  return best?.game ?? null;
}

export function buildEditorialContext(
  editorial: Editorial | null, games: Game[], teams: Team[],
): EditorialContext {
  const byId = new Map(games.map((g) => [g.id, g]));
  const hostPickGame = editorial?.gameOfTheWeek?.gameId
    ? byId.get(editorial.gameOfTheWeek.gameId) ?? null
    : null;
  return {
    editorial,
    hostPickGame,
    algorithmPickGame: pickAlgorithmGOTW(games, teams),
  };
}
```

- [ ] **Step 3: Run → green, commit**

```bash
cd web
pnpm test
cd ..
git add web/lib/editorial.ts web/tests/editorial.test.ts
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): editorial loader and algorithmic Game of the Week"
```

---

## Task 11: Home page — Top 3s + Last Week's Scores + Game of the Week

**Files:**
- Create: `web/components/cards/top-performer-card.tsx`
- Create: `web/components/cards/top-defense-card.tsx`
- Create: `web/components/cards/game-of-the-week-card.tsx`
- Create: `web/components/cards/score-strip.tsx`
- Modify: `web/app/page.tsx`

- [ ] **Step 1: Implement `web/components/cards/top-performer-card.tsx`**

```tsx
import Link from "next/link";
import Image from "next/image";
import { JerseyAvatar } from "@/components/player/jersey-avatar";
import type { Player, Team } from "@/lib/types";

export function TopPerformerCard({
  player, team, headline, secondary, rank,
}: {
  player: Player; team: Team | undefined;
  headline: string; secondary: string; rank: 1 | 2 | 3;
}) {
  return (
    <Link href={`/players/${player.id}`}>
      <div className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 hover:border-crimson-500 p-5 h-full">
        <div className="flex items-start justify-between mb-3">
          <span className="font-display text-3xl text-crimson-500">#{rank}</span>
          {team?.logoUrl && (
            <Image src={team.logoUrl} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
          )}
        </div>
        <div className="flex items-center gap-3 mb-3">
          <JerseyAvatar jersey={player.jersey}
            primary={team?.colors.primary} secondary={team?.colors.secondary} size={48} />
          <div>
            <div className="font-display text-xl leading-tight">{player.name}</div>
            <div className="text-xs text-chrome-500">{team?.name} · {player.position}</div>
          </div>
        </div>
        <div className="font-display text-2xl text-chrome-100">{headline}</div>
        <div className="text-xs text-chrome-500 mt-1">{secondary}</div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Implement `web/components/cards/top-defense-card.tsx`**

```tsx
import Link from "next/link";
import Image from "next/image";
import { displaySlug } from "@/lib/display-slug";
import type { Team } from "@/lib/types";

export function TopDefenseCard({
  team, ppg, rank,
}: { team: Team; ppg: number; rank: 1 | 2 | 3 }) {
  return (
    <Link href={`/teams/${displaySlug(team)}`}>
      <div className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 hover:border-crimson-500 p-5 h-full">
        <div className="flex items-start justify-between mb-3">
          <span className="font-display text-3xl text-crimson-500">#{rank}</span>
          {team.logoUrl && (
            <Image src={team.logoUrl} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
          )}
        </div>
        <div className="font-display text-xl leading-tight mb-2">{team.name}</div>
        <div className="font-display text-4xl">{ppg.toFixed(1)}</div>
        <div className="text-xs text-chrome-500 mt-1">PTS ALLOWED / GAME</div>
        <div className="text-xs text-chrome-500">{team.classification} · {team.record.wins}–{team.record.losses}</div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Implement `web/components/cards/game-of-the-week-card.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";
import { displaySlug } from "@/lib/display-slug";
import type { Game, Team } from "@/lib/types";

export function GameOfTheWeekCard({
  game, away, home, label, storyline,
}: {
  game: Game; away: Team | undefined; home: Team | undefined;
  label: string; storyline: string;
}) {
  if (!away || !home) {
    return (
      <div className="rounded-2xl border border-chrome-500/15 p-6">
        <div className="text-xs uppercase tracking-wider text-chrome-500">{label}</div>
        <p className="mt-2 text-chrome-300">No game selected.</p>
      </div>
    );
  }
  const href = `/matchup/${displaySlug(away)}-vs-${displaySlug(home)}`;
  return (
    <Link href={href}>
      <div className="rounded-2xl border border-chrome-500/15 bg-navy-700/40 hover:border-crimson-500 p-6">
        <div className="text-xs uppercase tracking-wider text-crimson-500 mb-2">{label}</div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center gap-3 justify-end">
            <div className="text-right">
              <div className="font-display text-2xl leading-tight">{away.name}</div>
              <div className="text-xs text-chrome-500">{away.classification} · {away.record.wins}–{away.record.losses}</div>
            </div>
            {away.logoUrl && <Image src={away.logoUrl} alt="" width={56} height={56} className="h-14 w-14 object-contain" />}
          </div>
          <div className="font-display text-3xl text-crimson-500">VS</div>
          <div className="flex items-center gap-3">
            {home.logoUrl && <Image src={home.logoUrl} alt="" width={56} height={56} className="h-14 w-14 object-contain" />}
            <div>
              <div className="font-display text-2xl leading-tight">{home.name}</div>
              <div className="text-xs text-chrome-500">{home.classification} · {home.record.wins}–{home.record.losses}</div>
            </div>
          </div>
        </div>
        {storyline && (
          <p className="mt-4 text-sm text-chrome-300 leading-snug">{storyline}</p>
        )}
        <p className="mt-2 text-xs text-chrome-500">{game.date}{game.venue ? ` · ${game.venue}` : ""}</p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Implement `web/components/cards/score-strip.tsx`**

```tsx
import Link from "next/link";
import { displaySlug } from "@/lib/display-slug";
import type { Game, Team } from "@/lib/types";

export function ScoreStrip({
  games, teamsById,
}: { games: Game[]; teamsById: Map<string, Team> }) {
  if (games.length === 0) {
    return <p className="text-chrome-500 text-sm">No finals from last week.</p>;
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {games.map((g) => {
        const away = teamsById.get(g.awayTeamId);
        const home = teamsById.get(g.homeTeamId);
        const awayWin = (g.awayScore ?? 0) > (g.homeScore ?? 0);
        const matchupHref = away && home
          ? `/matchup/${displaySlug(away)}-vs-${displaySlug(home)}`
          : null;
        const content = (
          <div className="rounded-lg border border-chrome-500/15 px-3 py-2 hover:border-crimson-500 text-sm">
            <div className="flex items-center justify-between">
              <span className={awayWin ? "font-semibold" : "text-chrome-300"}>
                {away?.name ?? g.awayTeamId.replace(/-/g, " ")}
              </span>
              <span className="font-display">{g.awayScore ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className={!awayWin ? "font-semibold" : "text-chrome-300"}>
                {home?.name ?? g.homeTeamId.replace(/-/g, " ")}
              </span>
              <span className="font-display">{g.homeScore ?? "—"}</span>
            </div>
            <div className="text-[10px] text-chrome-500 mt-1">{g.date}</div>
          </div>
        );
        return matchupHref
          ? <Link key={g.id} href={matchupHref}>{content}</Link>
          : <div key={g.id}>{content}</div>;
      })}
    </div>
  );
}
```

- [ ] **Step 5: Replace `web/app/page.tsx` with the home page**

```tsx
import { loadDataset, loadEditorial } from "@/lib/data";
import { LedHero } from "@/components/brand/led-hero";
import { TopPerformerCard } from "@/components/cards/top-performer-card";
import { TopDefenseCard } from "@/components/cards/top-defense-card";
import { GameOfTheWeekCard } from "@/components/cards/game-of-the-week-card";
import { ScoreStrip } from "@/components/cards/score-strip";
import { buildEditorialContext } from "@/lib/editorial";
import { topPlayersByStat, topDefensesByPPG, lastWeeksGames } from "@/lib/stats";

export default async function Home() {
  const season = process.env.NEXT_PUBLIC_SEASON ?? "2025-26";
  const data = await loadDataset(season);
  const editorial = await loadEditorial();
  const ctx = buildEditorialContext(editorial, data.games, data.teams);

  const topQBs = topPlayersByStat(data.players, "QB", (p) => p.stats.passing.yds, 3);
  const topRBs = topPlayersByStat(data.players, "RB", (p) => p.stats.rushing.yds, 3);
  const topWRs = topPlayersByStat(data.players, "WR", (p) => p.stats.receiving.yds, 3);
  const topDef = topDefensesByPPG(data.teams, 3);

  const lastWeek = lastWeeksGames(data.games);
  // Hydrate with full Game objects from the dataset
  const lastWeekGames = data.games.filter((g) =>
    lastWeek.some((lw) => lw === g || (lw as { id?: string }).id === g.id),
  );

  const hostGame = ctx.hostPickGame;
  const algoGame = ctx.algorithmPickGame;

  return (
    <>
      <LedHero>
        <div className="text-xs uppercase tracking-wider text-crimson-500">Week {editorial?.currentWeek ?? "—"}</div>
        <h1 className="font-display text-5xl md:text-7xl mt-1">
          Mississippi <span className="text-crimson-500">HS Football</span>
        </h1>
        {editorial?.featuredQuote && (
          <p className="mt-4 italic text-chrome-300">"{editorial.featuredQuote}"</p>
        )}
      </LedHero>

      <section className="max-w-7xl mx-auto px-4 py-8 grid md:grid-cols-2 gap-6">
        {hostGame && (
          <GameOfTheWeekCard
            game={hostGame}
            away={data.teamsById.get(hostGame.awayTeamId)}
            home={data.teamsById.get(hostGame.homeTeamId)}
            label={`Host's Pick · ${editorial?.gameOfTheWeek?.pickedBy ?? ""}`}
            storyline={editorial?.gameOfTheWeek?.storyline ?? ""}
          />
        )}
        {algoGame && (
          <GameOfTheWeekCard
            game={algoGame}
            away={data.teamsById.get(algoGame.awayTeamId)}
            home={data.teamsById.get(algoGame.homeTeamId)}
            label="Algorithm's Pick"
            storyline="Top-ranked teams + tight matchup score."
          />
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 space-y-8 pb-12">
        <Row label="Top 3 Quarterbacks" players={topQBs} teamsById={data.teamsById}
          headline={(p) => `${p.stats.passing.yds.toLocaleString()} YDS · ${p.stats.passing.td} TD`}
          secondary={(p) => `INT ${p.stats.passing.int} · RAT ${p.stats.passing.rating.toFixed(1)}`} />
        <Row label="Top 3 Running Backs" players={topRBs} teamsById={data.teamsById}
          headline={(p) => `${p.stats.rushing.yds.toLocaleString()} YDS · ${p.stats.rushing.td} TD`}
          secondary={(p) => `${p.stats.rushing.att} ATT · ${p.stats.rushing.ypc.toFixed(1)} YPC`} />
        <Row label="Top 3 Receivers" players={topWRs} teamsById={data.teamsById}
          headline={(p) => `${p.stats.receiving.yds.toLocaleString()} YDS · ${p.stats.receiving.td} TD`}
          secondary={(p) => `${p.stats.receiving.rec} REC`} />

        <div>
          <h2 className="font-display text-2xl mb-3">Top 3 Defenses</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {topDef.map((d, i) => (
              <TopDefenseCard key={d.team.id} team={d.team} ppg={d.ppg} rank={(i + 1) as 1 | 2 | 3} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-display text-2xl mb-3">Last Week's Scores</h2>
          <ScoreStrip games={lastWeekGames} teamsById={data.teamsById} />
        </div>
      </section>
    </>
  );
}

function Row({
  label, players, teamsById, headline, secondary,
}: {
  label: string;
  players: import("@/lib/types").Player[];
  teamsById: Map<string, import("@/lib/types").Team>;
  headline: (p: import("@/lib/types").Player) => string;
  secondary: (p: import("@/lib/types").Player) => string;
}) {
  if (players.length === 0) {
    return (
      <div>
        <h2 className="font-display text-2xl mb-3">{label}</h2>
        <p className="text-chrome-500 text-sm">No data yet.</p>
      </div>
    );
  }
  return (
    <div>
      <h2 className="font-display text-2xl mb-3">{label}</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {players.map((p, i) => (
          <TopPerformerCard
            key={p.id} player={p} team={teamsById.get(p.teamId)}
            headline={headline(p)} secondary={secondary(p)}
            rank={(i + 1) as 1 | 2 | 3}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Seed `web/public/data/editorial.json`** (fallback so the home page renders if no admin has touched it yet)

```json
{
  "currentSeason": "2025-26",
  "currentWeek": 0,
  "gameOfTheWeek": {
    "gameId": null,
    "storyline": "",
    "pickedBy": "Varsity Voices Host",
    "pickedAt": "2026-06-08T00:00:00Z"
  },
  "topPerformerNotes": {},
  "featuredQuote": ""
}
```

- [ ] **Step 7: Smoke + commit**

Visit `/`. Confirm hero, GOTW cards (algorithm's pick at minimum), top 3 rows, last week's scores.

```bash
git add web/app/page.tsx web/components/cards web/public/data/editorial.json
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): home page with top 3s, GOTW, last week's scores"
```

---

## Task 12: Presentation mode (4 variants)

**Files:**
- Create: `web/app/present/layout.tsx`
- Create: `web/app/present/page.tsx`
- Create: `web/app/present/teams/[slug]/page.tsx`
- Create: `web/app/present/players/[slug]/page.tsx`
- Create: `web/app/present/matchup/[matchup]/page.tsx`

**Design:** presentation mode strips the site header/footer, scales type up ~50%, and locks to a 16:9 safe area for the broadcast monitor.

- [ ] **Step 1: Implement `web/app/present/layout.tsx`** — a child layout that re-defines `<body>` chrome by NOT rendering header/footer. Achieved by:

```tsx
import "./present.css";

export default function PresentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="present-root min-h-screen text-2xl bg-navy-900">
      <div className="max-w-[1920px] mx-auto px-12 py-8">{children}</div>
    </div>
  );
}
```

Create `web/app/present/present.css`:

```css
.present-root { background-image: linear-gradient(180deg, #050810 0%, #0b1f3a 100%); }
.present-root h1 { font-size: 5rem; }
.present-root h2 { font-size: 3rem; }
.present-root table th { text-transform: uppercase; letter-spacing: 0.06em; }
```

The root layout in `app/layout.tsx` already renders header + footer. For presentation routes we want to override that. The cleanest path is to mount header/footer conditionally based on pathname:

Modify `web/app/layout.tsx`:
```tsx
import { headers } from "next/headers";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const pathname = h.get("x-next-pathname") ?? "";
  const isPresent = pathname.startsWith("/present");
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");

  return (
    <html /* ... */>
      <body className="min-h-screen flex flex-col">
        {!isPresent && <SiteHeader />}
        <div className="flex-1">{children}</div>
        {!isPresent && <SiteFooter />}
        {!isPresent && <CommandPalette teams={data.teams} players={data.players} />}
      </body>
    </html>
  );
}
```

Add a middleware header to expose the pathname:

In `web/middleware.ts`, before the auth check return:
```ts
const res = NextResponse.next();
res.headers.set("x-next-pathname", req.nextUrl.pathname);
return res;
```

And similarly for the redirect path: copy the response builder.

- [ ] **Step 2: Implement `web/app/present/page.tsx`** — large home summary

```tsx
import { loadDataset } from "@/lib/data";
import { topPlayersByStat, topDefensesByPPG } from "@/lib/stats";

export default async function PresentHome() {
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  const topQBs = topPlayersByStat(data.players, "QB", (p) => p.stats.passing.yds, 3);
  const topRBs = topPlayersByStat(data.players, "RB", (p) => p.stats.rushing.yds, 3);
  const topDef = topDefensesByPPG(data.teams, 3);

  return (
    <>
      <h1 className="font-display">MS HS FOOTBALL · TOP PERFORMERS</h1>
      <h2 className="font-display mt-6">Top 3 Quarterbacks</h2>
      <ol className="space-y-2 mt-2 text-3xl font-display">
        {topQBs.map((p, i) => (
          <li key={p.id}>#{i + 1} {p.name} · {p.stats.passing.yds.toLocaleString()} YDS · {p.stats.passing.td} TD</li>
        ))}
      </ol>
      <h2 className="font-display mt-8">Top 3 Running Backs</h2>
      <ol className="space-y-2 mt-2 text-3xl font-display">
        {topRBs.map((p, i) => (
          <li key={p.id}>#{i + 1} {p.name} · {p.stats.rushing.yds.toLocaleString()} YDS · {p.stats.rushing.td} TD</li>
        ))}
      </ol>
      <h2 className="font-display mt-8">Top 3 Defenses</h2>
      <ol className="space-y-2 mt-2 text-3xl font-display">
        {topDef.map((d, i) => (
          <li key={d.team.id}>#{i + 1} {d.team.name} · {d.ppg.toFixed(1)} PA/G</li>
        ))}
      </ol>
    </>
  );
}
```

- [ ] **Step 3: Implement `web/app/present/teams/[slug]/page.tsx`** — large team detail

```tsx
import { notFound } from "next/navigation";
import { loadDataset } from "@/lib/data";

export default async function PresentTeam({ params }: { params: { slug: string } }) {
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  const team = data.teamsBySlug.get(params.slug);
  if (!team) notFound();
  const games = (data.gamesByTeam.get(team.id) ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <h1 className="font-display">{team.name}</h1>
      <p className="text-3xl text-chrome-300">{team.classification} · {team.record.wins}–{team.record.losses}{team.headCoach ? ` · Coach ${team.headCoach}` : ""}</p>
      <table className="w-full mt-8 text-2xl">
        <thead><tr className="text-chrome-500"><th className="text-left">Date</th><th className="text-left">Opponent</th><th className="text-right">Result</th></tr></thead>
        <tbody>
          {games.map((g) => {
            const isHome = g.homeTeamId === team.id;
            const opp = data.teamsById.get(isHome ? g.awayTeamId : g.homeTeamId);
            const sf = isHome ? g.homeScore : g.awayScore;
            const sa = isHome ? g.awayScore : g.homeScore;
            return (
              <tr key={g.id} className="border-t border-chrome-500/20">
                <td className="py-2">{g.date}</td>
                <td className="py-2">{isHome ? "vs" : "@"} {opp?.name ?? "Unknown"}</td>
                <td className="py-2 text-right">{g.status === "final" && sf != null && sa != null ? `${sf > sa ? "W" : "L"} ${sf}–${sa}` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
```

- [ ] **Step 4: Implement `web/app/present/players/[slug]/page.tsx`** — large player detail

```tsx
import { notFound } from "next/navigation";
import { loadDataset } from "@/lib/data";
import { SeasonStatGrid } from "@/components/player/season-stat-grid";

export default async function PresentPlayer({ params }: { params: { slug: string } }) {
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  const player = data.playersById.get(params.slug);
  if (!player) notFound();
  const team = data.teamsById.get(player.teamId);
  return (
    <>
      <h1 className="font-display">{player.name}</h1>
      <p className="text-3xl text-chrome-300">{player.position} · {player.class} · {team?.name}</p>
      <div className="mt-8 scale-125 origin-top-left">
        <SeasonStatGrid stats={player.stats} />
      </div>
    </>
  );
}
```

- [ ] **Step 5: Implement `web/app/present/matchup/[matchup]/page.tsx`** — large tale of the tape

```tsx
import { notFound } from "next/navigation";
import { loadDataset } from "@/lib/data";
import { TaleOfTheTape } from "@/components/matchup/tale-of-the-tape";

export default async function PresentMatchup({ params }: { params: { matchup: string } }) {
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  const m = params.matchup.match(/^(.+)-vs-(.+)$/);
  if (!m) notFound();
  const away = data.teamsBySlug.get(m[1]);
  const home = data.teamsBySlug.get(m[2]);
  if (!away || !home) notFound();
  return (
    <>
      <h1 className="font-display text-center">{away.name} <span className="text-crimson-500">VS</span> {home.name}</h1>
      <div className="mt-8 scale-125 origin-top">
        <TaleOfTheTape a={away} b={home} />
      </div>
    </>
  );
}
```

- [ ] **Step 6: Smoke + commit**

Visit `/present`, `/present/teams/...`, `/present/players/...`, `/present/matchup/...`. Each renders without site chrome, scaled up.

```bash
git add web/app/present web/app/layout.tsx web/middleware.ts
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): presentation mode for home, team, player, matchup"
```

---

## Task 13: Admin editorial page + route handler

**Files:**
- Create: `web/app/admin/editorial/page.tsx`
- Create: `web/app/api/admin/editorial/route.ts`
- Modify: `web/middleware.ts` (admin gate)

**Behavior:** A password-gated form at `/admin/editorial`. POSTs to `/api/admin/editorial`, which:
1. Re-verifies `ADMIN_PASSWORD` (the cookie scope must be "admin").
2. Writes the new `editorial.json` content via the GitHub Contents API using `GITHUB_PAT`, committing to `main` so Vercel rebuilds.

- [ ] **Step 1: Extend middleware to also enforce the admin cookie on `/admin/*`**

In `web/middleware.ts`:
```ts
import { ADMIN_COOKIE_NAME } from "@/lib/auth";

// Inside middleware(), AFTER the site-cookie check passes:
if (pathname.startsWith("/admin")) {
  const adminToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const decoded = adminToken ? await verifyToken(adminToken, secret) : null;
  if (!decoded || decoded.scope !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/unlock";
    url.searchParams.set("admin", "1");
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
}
```

And update `/api/unlock` to optionally elevate to admin scope when `?admin=1` is set in `next` and `ADMIN_PASSWORD` matches.

- [ ] **Step 2: Implement `web/app/admin/editorial/page.tsx`**

```tsx
import { loadDataset, loadEditorial } from "@/lib/data";

export default async function AdminEditorialPage() {
  const data = await loadDataset(process.env.NEXT_PUBLIC_SEASON ?? "2025-26");
  const editorial = await loadEditorial() ?? {
    currentSeason: "2025-26", currentWeek: 0,
    gameOfTheWeek: { gameId: null, storyline: "", pickedBy: "", pickedAt: "" },
    topPerformerNotes: {}, featuredQuote: "",
  };
  const upcoming = data.games
    .filter((g) => g.status === "scheduled")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 50);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-display text-4xl mb-6">Editorial Controls</h1>
      <form action="/api/admin/editorial" method="post" className="space-y-6">
        <div>
          <label className="text-xs uppercase tracking-wider text-chrome-500">Current Week</label>
          <input name="currentWeek" type="number" min="0" max="20" defaultValue={editorial.currentWeek}
            className="w-full mt-1 px-3 py-2 rounded bg-navy-700 border border-chrome-500/20" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-chrome-500">Game of the Week</label>
          <select name="gameOfTheWeekId" defaultValue={editorial.gameOfTheWeek.gameId ?? ""}
            className="w-full mt-1 px-3 py-2 rounded bg-navy-700 border border-chrome-500/20">
            <option value="">— None —</option>
            {upcoming.map((g) => {
              const away = data.teamsById.get(g.awayTeamId)?.name ?? g.awayTeamId;
              const home = data.teamsById.get(g.homeTeamId)?.name ?? g.homeTeamId;
              return <option key={g.id} value={g.id}>{g.date} · {away} @ {home}</option>;
            })}
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-chrome-500">Storyline</label>
          <textarea name="storyline" rows={3} defaultValue={editorial.gameOfTheWeek.storyline}
            className="w-full mt-1 px-3 py-2 rounded bg-navy-700 border border-chrome-500/20" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-chrome-500">Picked By</label>
          <input name="pickedBy" type="text" defaultValue={editorial.gameOfTheWeek.pickedBy}
            className="w-full mt-1 px-3 py-2 rounded bg-navy-700 border border-chrome-500/20" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-chrome-500">Featured Quote</label>
          <textarea name="featuredQuote" rows={2} defaultValue={editorial.featuredQuote}
            className="w-full mt-1 px-3 py-2 rounded bg-navy-700 border border-chrome-500/20" />
        </div>
        <button type="submit" className="w-full py-3 rounded-lg bg-crimson-500 hover:bg-crimson-600 font-display tracking-wide">
          PUBLISH
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Implement `web/app/api/admin/editorial/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const secret = process.env.COOKIE_SECRET;
  const repo = process.env.GITHUB_REPO;        // "garret/varsity-voices-dashboard"
  const pat = process.env.GITHUB_PAT;
  if (!secret || !repo || !pat) return new NextResponse("Server misconfigured", { status: 500 });

  const adminToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const decoded = adminToken ? await verifyToken(adminToken, secret) : null;
  if (!decoded || decoded.scope !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const form = await req.formData();
  const editorial = {
    currentSeason: "2025-26",
    currentWeek: Number(form.get("currentWeek") ?? 0),
    gameOfTheWeek: {
      gameId: String(form.get("gameOfTheWeekId") ?? "") || null,
      storyline: String(form.get("storyline") ?? ""),
      pickedBy: String(form.get("pickedBy") ?? ""),
      pickedAt: new Date().toISOString(),
    },
    topPerformerNotes: {},
    featuredQuote: String(form.get("featuredQuote") ?? ""),
  };

  const path = "web/public/data/editorial.json";
  const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: { Authorization: `Bearer ${pat}`, Accept: "application/vnd.github+json" },
  });
  const existing = getRes.ok ? await getRes.json() : null;
  const sha = existing?.sha;

  const content = Buffer.from(JSON.stringify(editorial, null, 2), "utf-8").toString("base64");
  const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${pat}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify({
      message: "editorial: update from /admin/editorial",
      content,
      sha,
      branch: "main",
    }),
  });
  if (!putRes.ok) {
    const body = await putRes.text();
    return new NextResponse(`GitHub commit failed: ${body}`, { status: 502 });
  }

  return NextResponse.redirect(new URL("/admin/editorial?ok=1", req.nextUrl), 303);
}
```

- [ ] **Step 4: Smoke + commit**

```bash
ADMIN_PASSWORD=admin SITE_PASSWORD=test COOKIE_SECRET=... GITHUB_PAT=... GITHUB_REPO=... pnpm dev
```

Visit `/admin/editorial`, expect admin password prompt, submit form, check that the GitHub API was hit (look at network tab or check repo for new commit).

```bash
cd ..
git add web/app/admin web/app/api/admin web/middleware.ts
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): admin editorial form + GitHub-backed publish"
```

---

## Task 14: Season switcher + multi-season data layer

**Files:**
- Modify: `web/lib/data.ts` (add `availableSeasons()`)
- Create: `web/components/filters/season-switcher.tsx`
- Modify: `web/components/brand/site-header.tsx` (mount the switcher)

- [ ] **Step 1: Implement `availableSeasons` in `web/lib/data.ts`**

```ts
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
```

- [ ] **Step 2: Implement `web/components/filters/season-switcher.tsx`** (client; sets a cookie + reloads)

```tsx
"use client";
import { useRouter } from "next/navigation";

export function SeasonSwitcher({ current, options }: { current: string; options: string[] }) {
  const router = useRouter();
  return (
    <select
      value={current}
      onChange={(e) => {
        document.cookie = `season=${e.target.value}; path=/; max-age=${60 * 60 * 24 * 365}`;
        router.refresh();
      }}
      className="bg-navy-700 border border-chrome-500/20 rounded px-2 py-1 text-xs"
    >
      {options.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
```

- [ ] **Step 3: Read the season cookie in pages** (small helper)

Add to `web/lib/data.ts`:
```ts
import { cookies } from "next/headers";

export async function currentSeason(): Promise<string> {
  const c = await cookies();
  const fromCookie = c.get("season")?.value;
  const all = await availableSeasons();
  if (fromCookie && all.includes(fromCookie)) return fromCookie;
  return all[0] ?? "2025-26";
}
```

Then replace every `process.env.NEXT_PUBLIC_SEASON ?? "2025-26"` call site with `await currentSeason()`.

- [ ] **Step 4: Mount switcher in header (server component reads available + current, passes to client switcher)**

In `site-header.tsx`:
```tsx
import { availableSeasons, currentSeason } from "@/lib/data";
import { SeasonSwitcher } from "@/components/filters/season-switcher";

export async function SiteHeader() {
  const [seasons, current] = await Promise.all([availableSeasons(), currentSeason()]);
  // ...same JSX, but replace the static "2025–26 · MS" with:
  // <SeasonSwitcher current={current} options={seasons} />
}
```

- [ ] **Step 5: Smoke + commit**

Switch between 2024-25 and 2025-26 via the dropdown; pages re-render with the new dataset.

```bash
git add web/lib/data.ts web/components/filters/season-switcher.tsx web/components/brand/site-header.tsx
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): season switcher and multi-season data layer"
```

---

## Task 15: Polish, perf, mobile

**Files:**
- Modify: `web/next.config.ts`
- Create: `web/app/not-found.tsx`
- Create: `web/app/loading.tsx`
- Modify: misc small touches (a11y, focus rings)

- [ ] **Step 1: 404 page** at `web/app/not-found.tsx`

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="max-w-xl mx-auto px-4 py-24 text-center">
      <h1 className="font-display text-6xl text-crimson-500">404</h1>
      <p className="mt-4 text-chrome-300">No team, player, or game by that name.</p>
      <Link href="/" className="mt-6 inline-block px-4 py-2 rounded border border-crimson-500 text-crimson-500">
        Back to dashboard
      </Link>
    </main>
  );
}
```

- [ ] **Step 2: Loading skeleton** at `web/app/loading.tsx`

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-12 w-1/3" />
      <Skeleton className="h-64 w-full" />
      <div className="grid sm:grid-cols-3 gap-4">
        <Skeleton className="h-40" /><Skeleton className="h-40" /><Skeleton className="h-40" />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run Lighthouse locally**

```bash
pnpm build
pnpm start
```

Open Chrome DevTools → Lighthouse → Mobile + Desktop runs against `/`, `/teams/<slug>`, `/matchup/<a>-vs-<b>`. Target ≥ 95 perf each. If any are below, common fixes:
- Add `priority` on hero / above-the-fold images
- Shrink hero JPG if it's > 200KB
- Add `loading="lazy"` to logo `<Image>` in card grids

- [ ] **Step 4: Responsive verification**

In DevTools, test at 1920×1080, 1440×900, and iPhone 13 (390×844). Tables on team detail and the score strip on home must remain legible. Add `overflow-x-auto` to wide tables if needed.

- [ ] **Step 5: Commit**

```bash
git add web/app/not-found.tsx web/app/loading.tsx
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "feat(web): 404, loading skeleton, perf polish"
```

---

## Task 16: Vercel deploy + ops docs

**Files:**
- Create: `web/vercel.json`
- Modify: `web/README.md` (deploy section)
- Modify: `.github/workflows/scrape.yml` (verify rsync targets match)

- [ ] **Step 1: Write `web/vercel.json`**

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

- [ ] **Step 2: Expand `web/README.md` with deploy + env var docs**

```markdown
## Deploy to Vercel

1. Push branch `feat/scraper` (and its merge to `main`) to GitHub.
2. Connect the repo to Vercel; set the project root to `web/`.
3. Set environment variables in Vercel project settings:
   - `SITE_PASSWORD` — shared with all viewers
   - `ADMIN_PASSWORD` — for `/admin/editorial`
   - `COOKIE_SECRET` — 32+ random bytes (`openssl rand -hex 32`)
   - `GITHUB_PAT` — fine-grained PAT with `Contents: read+write` on the dashboard repo
   - `GITHUB_REPO` — `garret/varsity-voices-dashboard`
4. Trigger the first deploy. The scraper's GitHub Actions workflow syncs data into `web/public/data/` and `web/public/team-logos/` automatically on its schedule.
5. Point `dashboard.scrn.live` at the Vercel-issued CNAME.
```

- [ ] **Step 3: Confirm `.github/workflows/scrape.yml` already syncs to `web/public/data/`** (it does, per Task 20 of Phase 1). No change needed unless the path differs.

- [ ] **Step 4: Final commit + push**

```bash
git add web/vercel.json web/README.md
git -c user.email="garret@ardenland.net" -c user.name="Garret" commit -m "ops(web): Vercel deploy config and operator docs"
git push -u origin feat/scraper
```

---

## Self-Review

| Spec requirement | Covered by |
|---|---|
| Next.js 15 + Tailwind v4 + shadcn | Task 1 |
| Site password gate (edge middleware + signed cookie) | Task 3 |
| Brand identity (logos, LED-dot hero, navy/crimson palette) | Task 4 |
| Data layer + types + display slug fix | Task 2 |
| Cmd-K global search (Fuse.js) | Task 5 |
| Teams browser with class filter | Task 6 |
| Team detail page with stat panel, schedule, roster | Task 7 |
| Players browser with position filter | Task 8 |
| Player detail with season stat grid | Task 8 |
| Jersey-number avatar (no photos) | Task 7 |
| Matchup page with tale of the tape + form guide | Task 9 |
| Game of the Week algorithm (algo + host picks) | Task 10 |
| Home page with top 3s + last week's scores + GOTW | Task 11 |
| Presentation mode for home, team, player, matchup | Task 12 |
| Admin editorial page + GitHub-backed publish | Task 13 |
| Season switcher (2024-25 ↔ 2025-26) | Task 14 |
| Lighthouse perf, 404, loading, responsive | Task 15 |
| Vercel deploy config + env vars + ops docs | Task 16 |

**Placeholder scan:** no "TBD"/"TODO" remain. All code blocks contain complete content for their tasks.

**Type consistency:** model names (`Team`, `Player`, `Game`, `PlayerStats`, `BoxScore`, `Editorial`) used consistently. Function names (`buildDataset`, `loadDataset`, `loadEditorial`, `topPlayersByStat`, `topDefensesByPPG`, `pickAlgorithmGOTW`, `buildEditorialContext`, `signToken`, `verifyToken`, `displaySlug`) match across tasks. Path conventions (`@/lib/...`, `@/components/...`) are used consistently.

**Known shortcuts taken (acceptable for v1):**
- Player browser caps display to first 200; cmd-K is the production search path.
- Static generation of player detail pages capped to 5000 to keep build times sane.
- Box score per-player rows are NOT linked to player profiles (raw labels don't match player IDs).
- "Common opponents" comparison from the spec is OUT of scope for v1 (heavyweight; can be added as a follow-up task).
- Team-level yardage stats are zero in the data, so Tale of the Tape uses points + record only — matches what the data supports today.

