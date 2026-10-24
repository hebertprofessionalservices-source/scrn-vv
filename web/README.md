# Varsity Voices Dashboard

Next.js 15 dashboard for Mississippi HS varsity football. Reads JSON output of the Phase 1 scraper.

## Stack

- Next.js 15 (App Router, static-friendly)
- React 19
- Tailwind CSS v4
- shadcn/ui primitives
- Fuse.js (cmd-K search)
- Recharts (charts)
- pnpm

## Setup

```bash
cd web
pnpm install
```

No environment variables are required.

## Sync data (local development)

The scraper writes JSON files to `scraper/output/data/`. Copy them into the dashboard's public folder:

```bash
# Git Bash:
mkdir -p web/public/data web/public/team-logos
cp -r scraper/output/data/* web/public/data/
cp -r scraper/output/logos/* web/public/team-logos/

# PowerShell / robocopy alternative:
robocopy ..\scraper\output\data web\public\data /MIR
robocopy ..\scraper\output\logos web\public\team-logos /MIR
```

The GitHub Actions scraper workflow does this automatically on every scheduled run, so production stays fresh without manual steps.

## Dev

```bash
pnpm dev
```

Opens at http://localhost:3000.

## Build

```bash
pnpm build && pnpm start
```

## Test

```bash
pnpm test
```

## Deploy to Vercel

### 1. Initial Setup

Push the repo to GitHub and create a new Vercel project:

1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **New Project** → select the repository.
3. Set **Root Directory** to `web/` (important!).
4. Click **Deploy**.

The first build takes ~3–5 minutes and generates ~250 static pages.

### 3. Custom Domain

Point a custom domain (e.g. `dashboard.scrn.live`) at the Vercel CNAME in project settings.

### 4. Automatic Rebuilds

The GitHub Actions scraper workflow (`../.github/workflows/scraper.yml`) automatically:
- Runs on a schedule
- Refreshes JSON data in `scraper/output/data/`
- Pushes updates to `main`
- Vercel detects the push and rebuilds

No manual intervention needed — the site stays fresh automatically.

## Routes

| Path | What |
|---|---|
| `/` | Home — Top 3s + GOTW + last week's scores |
| `/teams` | Team browser with class filter |
| `/teams/[slug]` | Team detail (schedule + roster) |
| `/players` | Player browser with position filter |
| `/players/[id]` | Player detail |
| `/matchup/[a-vs-b]` | Side-by-side comparison |
| `/present/*` | Broadcast-mode variants (no chrome, larger type) |

## On-Air Broadcast Checklist

1. **Set editorial content** — Edit `public/data/editorial.json` (current week, Game of the Week, storyline) and push.
2. **Wait for rebuild** — Vercel rebuilds within 60 seconds.
3. **Verify on home page** — Open `/` in broadcast view to confirm the host pick appears.
4. **Navigate segments** — For each on-air segment, open the relevant `/present/...` path in a full-screen browser window:
   - `/present/` — home page (scores, rankings, GOTW)
   - `/present/teams` — all teams with filter
   - `/present/teams/[slug]` — individual team schedule
   - `/present/players/[slug]` — player profile
   - `/present/matchup/[a-vs-b]` — head-to-head comparison

## Architecture

- **Data loading**: All data is loaded server-side at request time (or build time for static pages) from `public/data/<season>/*.json`.
- **Access**: The site is public; there are no logins. `middleware.ts` only blocks direct requests for `/data/*`.
- **Search**: cmd-K search palette uses Fuse.js, fully client-side, no external API calls.

## Troubleshooting

**Build fails with "cannot find module"**
- Check that team logo directory exists: `web/public/team-logos/`.

**404 page always shows**
- Check middleware redirects in `middleware.ts`.

**Editorial updates don't appear**
- Wait ~60 sec for the rebuild after pushing `editorial.json`.

**Search (cmd-K) is slow or empty**
- Search indexes all teams and players at runtime — first load may take a moment.
- Check that JSON files in `public/data/` are populated.
