# Varsity Voices Dashboard — Design Spec

**Date:** 2026-06-07
**Owner:** Garret (SCRN / Varsity Voices)
**Status:** Approved design — pending implementation plan

## 1. Purpose

A branded, broadcast-grade interactive dashboard of Mississippi High School varsity football stats for the **Varsity Voices** podcast on **State Championships Radio Network (scrn.live)**.

The dashboard is the on-air visual companion for a weekly statewide podcast and live game broadcasts. It must:

- Look like an ESPN-grade product (clean, broadcast-safe, professional).
- Be readable on any device (1080p stream, 1440p control monitor, phone-on-set).
- Be gated to authorized network staff only.
- Surface the top stats and storylines for the week instantly, with zero on-air friction.

## 2. Scope (this spec)

Two seasons of MS HS football data — **2024–25 and 2025–26** — across **all MHSAA classes 1A–7A plus MAIS divisions**, scraped from MaxPreps. Dashboard renders the resulting JSON statically.

Historical seasons (2021–22 through 2023–24) and live in-game updates are explicitly out of scope for v1.

## 3. Phasing

Two distinct projects sharing one repo and one data contract.

| Phase | Deliverable | When |
|---|---|---|
| **1. Scraper** | Python + Playwright crawler that produces canonical JSON for two seasons | First implementation session |
| **2. Dashboard** | Next.js dashboard reading that JSON | Second implementation session |
| **3. Automation** | GitHub Actions cron + Vercel deploy | Folded into Phase 2 |

This spec covers both phases. Phase 1 must ship working JSON before Phase 2 can be meaningfully built.

## 4. Architecture

```
varsity-voices-dashboard/
├── scraper/                  # Phase 1 — Python + Playwright
│   ├── pyproject.toml
│   ├── src/
│   │   ├── crawl_teams.py
│   │   ├── crawl_roster.py
│   │   ├── crawl_schedule.py
│   │   ├── crawl_stats.py
│   │   ├── normalize.py
│   │   └── pipeline.py
│   ├── .cache/crawl.db        # SQLite resumability cache (gitignored)
│   └── output/
│       ├── data/2024-25/
│       ├── data/2025-26/
│       ├── logos/
│       └── run-report.md
├── web/                      # Phase 2 — Next.js dashboard
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   │   ├── data/{season}/...
│   │   ├── team-logos/
│   │   └── editorial.json
│   └── middleware.ts          # site-wide password gate
├── assets/                   # SCRN + Varsity Voices brand assets (existing)
├── docs/superpowers/specs/
└── .github/workflows/scrape.yml
```

**Data flow:**

1. Scraper writes JSON + downloaded logos to `scraper/output/`.
2. `web-sync` step copies output → `web/public/data/{season}/` and `web/public/team-logos/`.
3. Next.js statically generates all dashboard pages from those files at build time.
4. Vercel deploys on every git push; cron-driven scrapes commit changes back to the repo to trigger redeploys.

No runtime database, no API server. The JSON files **are** the API.

## 5. Data Contract

Three JSON files per season + one cross-season editorial file. Files live at `web/public/data/{season}/{name}.json`.

### 5.1 `teams.json`

One record per team per season.

```json
{
  "id": "starkville-yellowjackets",
  "name": "Starkville",
  "mascot": "Yellowjackets",
  "city": "Starkville, MS",
  "classification": "7A",
  "district": "District 2-7A",
  "logoUrl": "/team-logos/starkville-yellowjackets.png",
  "colors": { "primary": "#FFC72C", "secondary": "#000000" },
  "season": "2025-26",
  "record": { "wins": 8, "losses": 2 },
  "rankings": { "stateOverall": 3, "stateClass": 1, "national": null },
  "stats": {
    "pointsFor": 412, "pointsAgainst": 178,
    "yardsFor": 4210, "yardsAgainst": 2890,
    "passYdsFor": 1820, "rushYdsFor": 2390,
    "passYdsAgainst": 1410, "rushYdsAgainst": 1480,
    "turnoversForced": 18, "turnoversLost": 9
  },
  "headCoach": "Chris Chambless",
  "maxprepsUrl": "..."
}
```

### 5.2 `players.json`

One record per player per season. All stat groups present and zeroed where N/A so the dashboard never null-checks.

```json
{
  "id": "starkville-yellowjackets-12-jdoe",
  "teamId": "starkville-yellowjackets",
  "season": "2025-26",
  "name": "Jordan Doe",
  "jersey": "12",
  "position": "QB",
  "class": "SR",
  "height": "6-2",
  "weight": 195,
  "stats": {
    "passing":   { "att": 280, "cmp": 192, "yds": 2840, "td": 31, "int": 6, "rating": 142.1 },
    "rushing":   { "att": 95,  "yds": 612,  "td": 9,    "ypc": 6.4 },
    "receiving": { "rec": 0,   "yds": 0,    "td": 0 },
    "defense":   { "tackles": 0, "sacks": 0, "int": 0, "ff": 0 },
    "kicking":   { "fgm": 0, "fga": 0, "xpm": 0, "xpa": 0 }
  },
  "gamesPlayed": 10
}
```

Positions: `QB, RB, WR, TE, OL, DL, LB, DB, K, P, ATH`.
Classes: `FR, SO, JR, SR`.

### 5.3 `games.json`

One record per game.

```json
{
  "id": "2025-09-12-starkville-at-tupelo",
  "season": "2025-26",
  "week": 3,
  "date": "2025-09-12",
  "homeTeamId": "tupelo-golden-wave",
  "awayTeamId": "starkville-yellowjackets",
  "homeScore": 17,
  "awayScore": 34,
  "quarterScores": { "home": [3,7,0,7], "away": [14,7,7,6] },
  "status": "final",
  "dataStatus": "complete",
  "venue": "Renasant Stadium",
  "boxScore": {
    "passing":   [ { "playerId": "...", "cmp": 22, "att": 30, "yds": 312, "td": 4, "int": 0 } ],
    "rushing":   [ ],
    "receiving": [ ],
    "defense":   [ ]
  },
  "maxprepsUrl": "..."
}
```

`status`: `final | scheduled | in_progress | postponed`
`dataStatus`: `complete | incomplete | missing` — drives "Box score unavailable" UI badging.
`boxScore` is `null` when `dataStatus !== "complete"`.

### 5.4 `editorial.json` (cross-season)

```json
{
  "currentSeason": "2025-26",
  "currentWeek": 11,
  "gameOfTheWeek": {
    "gameId": "2025-11-07-oxford-at-tupelo",
    "storyline": "Rivalry rematch — Oxford looking for revenge after last year's overtime loss.",
    "pickedBy": "Host Name",
    "pickedAt": "2026-06-05T14:00:00Z"
  },
  "topPerformerNotes": {
    "QB":  "Doe quietly putting up the best senior year in 7A.",
    "RB":  "...",
    "WR":  "...",
    "DEF": "..."
  },
  "featuredQuote": "..."
}
```

### 5.5 Data conventions

- **IDs** are stable slug-style strings derived from team name and (for players) jersey + last name. Survives MaxPreps internal-ID changes.
- **`season`** denormalized onto every record so the dashboard holds multi-season state without joining files.
- **Schema validated by pydantic** in the scraper; any record failing validation goes to `errors.jsonl`, not the JSON output.

## 6. Scraper Design (Phase 1)

### 6.1 Stack

- Python 3.11
- Playwright (Chromium) for JS-rendered pages
- `httpx` for static asset fetches (logos)
- `pydantic` for schema validation
- `sqlite-utils` for the resumability cache
- `typer` for CLI ergonomics

### 6.2 Crawl strategy

```
1. SEED:    MaxPreps MS football landing → list of classes (1A–7A, MAIS divisions)
2. CLASS:   Per class → paginated team directory → ~250 team URLs total
3. TEAM:    Per team, capped concurrency:
              a. Team home  → name, mascot, city, coach, logo, record, ranking
              b. Roster     → players (jersey, name, position, class, height/weight)
              c. Schedule   → games list (date, opponent, score, box-score link)
              d. Stats      → per-player season totals
              e. Per completed game → box score → per-player game stats
4. NORMALIZE: Raw scrape → pydantic models → teams.json, players.json, games.json
5. LOGOS:    Download every team logo to /output/logos/{teamId}.png
```

### 6.3 Resumability

SQLite cache at `scraper/.cache/crawl.db` records every URL fetched, response hash, and timestamp. Each step checks the cache before fetching. Crashes resume cleanly. `--force` bypasses cache.

### 6.4 Politeness / anti-bot

- 1 browser context, 3 concurrent pages, configurable.
- Random 1.5–3.5s jitter per request.
- Realistic user agent, full viewport, normal navigation flow.
- Exponential backoff on 429/403, max 5 min.
- `--headed` flag for debugging DOM changes.

### 6.5 Per-season runtime budget

- First full crawl: **45–90 min** (matches user's prior experience for season totals; adds ~30 min for game-by-game box scores).
- Weekly refresh runs (post-Friday): **5–10 min** thanks to cache.

### 6.6 Failure handling

- Per-team failures → `scraper/output/errors.jsonl` (url, step, traceback). Crawl continues.
- Each run emits `scraper/output/run-report.md`: teams scraped, players found, games found, error count, top missing-field counts. This is the "did the run succeed?" view.
- Games with no box score get `dataStatus: "missing"`; partial → `"incomplete"`. Final score still recorded.

### 6.7 CLI

```
python -m scraper.pipeline --season 2025-26                # full crawl
python -m scraper.pipeline --season 2025-26 --week 11      # current-week only
python -m scraper.pipeline --season 2024-25 --teams-only   # discovery + team home
python -m scraper.pipeline --season 2025-26 --force        # bypass cache
```

## 7. Automation (Phase 2)

### 7.1 Schedule

GitHub Actions workflow `.github/workflows/scrape.yml` triggers:

| Trigger | Cron (UTC) | CT equivalent | Purpose |
|---|---|---|---|
| Sunday late | `0 4 * * MON` | Sun 11pm CDT / 10pm CST | Catch most Friday game data |
| Tuesday late | `0 4 * * WED` | Tue 11pm CDT / 10pm CST | Pick up late coach submissions |
| `workflow_dispatch` | manual | any time | Host-triggered audit/rerun |

Cron is always UTC on GitHub Actions. We anchor to CDT (the football regular season is mostly in CDT — September through early November); during the CST tail (late November–January) the triggers fire one hour earlier, which is acceptable.

Each run scrapes the current week, runs `web-sync`, commits any data changes, pushes → Vercel auto-rebuilds. Run report posted as workflow summary for phone-friendly review.

### 7.2 Secrets

GitHub Actions secrets:
- `VERCEL_DEPLOY_HOOK` (optional — only if we move off git-triggered deploys)
- `GH_PAT` for `editorial.json` write-back from the admin page

## 8. Dashboard Design (Phase 2)

### 8.1 Stack

- Next.js 15 (App Router, static generation)
- Tailwind CSS + shadcn/ui
- Lucide icons
- Recharts for charts
- Fuse.js for client-side fuzzy search
- `next/image` AVIF/WebP for logos

### 8.2 Branding

- **Primary navy:** `#0B1F3A`
- **Accent crimson:** `#C8102E`
- **Chrome / text:** `#E8E8EA`
- **Hero panel near-black:** `#050810`
- **LED-dot background image:** overlaid at 8% opacity on hero sections only
- **Lead identity:** Varsity Voices logo top-left
- **Secondary mark:** SCRN shield in the footer with link to scrn.live
- **Type:** Inter for UI, a condensed display face (e.g., Oswald or Barlow Condensed) for headline numbers and broadcast-style team names

### 8.3 Global chrome

- **Top bar:** Varsity Voices logo (left) → cmd-K search (center) → season switcher + class filter (right).
- **Footer:** "Powered by State Championships Radio Network" + SCRN shield + scrn.live link.

### 8.4 Pages

**Home — `/`**
On-air summary page, single scroll:
- Hero: "Week N · Mississippi High School Football"
- Game of the Week: two side-by-side cards — *Host's Pick* (from `editorial.json`) and *Algorithm's Pick* (computed from rankings + matchup tightness)
- Top 3 QBs, Top 3 RBs, Top 3 WRs, Top 3 Defenses — four rows of three cards each. Defenses ranked by points allowed per game + yards allowed per game
- **Last Week's Scores** — condensed strip grouped by class; click → matchup page
- Top Rising Teams — week-over-week rank movement

**Matchup — `/matchup/[awayTeamId]-vs-[homeTeamId]?week=N`**
- Two team headers joined by giant "VS"
- "Tale of the Tape" 12-row × 3-col comparison table with green/red leader highlighting
- Head-to-head history (when present in dataset)
- Common opponents strip
- Last 5 games form guide each
- Key players column each side
- "Open in presentation mode" button

**Teams — `/teams`**
- Left rail filters (sheet on mobile): class, district, sort
- Grid of team cards: logo, name, record, rank, class badge

**Team detail — `/teams/[teamId]`**
- Hero with logo + team colors as accent
- Record, ranking, district standing
- Stats panel with offense/defense splits, PPG trend chart, yardage breakdown
- Schedule + results table
- Roster grouped by position with stats columns
- 2024-25 vs 2025-26 split comparison when both seasons present
- "Open in presentation mode" button

**Players — `/players`**
- Filters: position, class (FR/SO/JR/SR), team classification, sort by any stat
- Table view (sortable) + card view toggle
- Inline search

**Player detail — `/players/[playerId]`**
- Jersey-number avatar in team colors (no photo)
- Team logo
- Name, position, class, height/weight
- Season totals stat grid
- Game-by-game log table
- Season-over-season trend when multi-year data exists

**Presentation mode — `/present/*`**
Stripped chrome, larger type, 16:9-safe layouts. Available on:
- Home (`/present`)
- Matchup (`/present/matchup/...`)
- Team detail (`/present/teams/[teamId]`)
- Player detail (`/present/players/[playerId]`)

**Admin — `/admin/editorial`**
Password-gated (separate `ADMIN_PASSWORD`). Form fields write to `editorial.json` via a Next.js Route Handler that commits to git using a GitHub PAT → Vercel rebuilds.

Fields:
- Game of the Week pick (game selector)
- 1-line storyline per top-performer slot
- Featured quote

### 8.5 Player avatars

No player photos anywhere. Universal pattern: **jersey number on a circle filled with the team's primary color**, jersey number rendered in the secondary color. Used on home top-3 cards, player browser, and player detail.

### 8.6 Search

cmd-K global palette. Fuse.js index over team names, mascots, cities, and player names. Weighted toward exact-prefix matches. Recent searches in localStorage.

### 8.7 Performance budget

- Total page weight < 250KB gzip
- Lighthouse perf ≥ 95 on home and matchup
- Tested at 1080p, 1440p, and iPhone 13 widths

## 9. Authentication

Two layers, both env-var-based, no auth provider.

### 9.1 Site-wide gate

- Env var: `SITE_PASSWORD`
- Next.js edge middleware checks every request for a signed HttpOnly cookie.
- No cookie → redirect to `/unlock` (single-input page on the LED-dot hero).
- Correct password → signed cookie issued (30-day expiry, refresh-on-visit).
- Throttle: 3 wrong attempts → 60s IP lockout.
- Password rotation: change the env var in Vercel; no redeploy needed.

### 9.2 Admin layer

- Env var: `ADMIN_PASSWORD`
- Additional check on `/admin/*` routes.
- Independent of the site password — even site-authorized users can't edit editorial picks without it.

### 9.3 Cookie secret

- Env var: `COOKIE_SECRET` — HMAC key for signing the unlock cookie. Rotated as needed; rotation logs out all users.

## 10. Hosting

- Vercel project, free tier sufficient.
- Custom domain candidate: `dashboard.scrn.live` (user to configure DNS).
- Build command: `cd web && npm run build`.
- Auto-deploy on push to `main`.

## 11. Out of Scope (v1)

- Seasons before 2024–25
- Live in-game stat updates
- Per-user accounts / audit logs
- Mobile app (the responsive web build is the mobile experience)
- Public unauthenticated access
- Stat ingestion from sources other than MaxPreps

## 12. Open Risks

| Risk | Mitigation |
|---|---|
| MaxPreps DOM changes break scraper | `--headed` debug flag; per-step selectors isolated in `normalize.py`; resumable cache means repair-and-resume not start-over |
| MaxPreps anti-bot escalates | Polite rate limits already in place; if blocked, fall back to manual data entry via admin page (out of v1 scope, future work) |
| 1A–2A box scores frequently missing | `dataStatus` field + UI badge surfaces this honestly |
| Cron run misses Friday games | Two triggers (Sun + Tue) plus manual workflow_dispatch |
| Coach-submitted stats wrong | Out of scope to fix; surface MaxPreps as source of record |

## 13. Success Criteria

- Phase 1: both seasons of JSON validate against the pydantic schema; run-report shows <5% per-team error rate; logos downloaded for ≥90% of teams.
- Phase 2: dashboard deployed to Vercel behind site password; Lighthouse perf ≥95 on home and matchup; all six page types render with real scraped data; presentation mode legible at 1080p.
- On-air: host can find any team or player within 5 seconds via cmd-K; matchup page generates in one click from a score on the home page.
