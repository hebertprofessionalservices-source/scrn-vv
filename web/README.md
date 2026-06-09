# Varsity Voices Dashboard

Next.js 15 dashboard for Mississippi HS varsity football. Reads JSON output of the Phase 1 scraper.

## Stack

- Next.js 15 (App Router, static-friendly)
- React 19
- Tailwind CSS v4
- shadcn/ui primitives
- Fuse.js (cmd-K search)
- Recharts (charts)
- jose (signed cookies)
- pnpm

## Setup

```bash
cd web
pnpm install
cp .env.example .env.local
# Fill in SITE_PASSWORD, ADMIN_PASSWORD, COOKIE_SECRET, GITHUB_PAT, GITHUB_REPO
```

Generate a strong `COOKIE_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

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

Opens at http://localhost:3000. The site password gate redirects you to `/unlock` first.

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

### 2. Environment Variables

In **Vercel project settings → Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `SITE_PASSWORD` | Shared password for all viewers |
| `ADMIN_PASSWORD` | Host-only password for `/admin/editorial` |
| `COOKIE_SECRET` | 32-byte hex string (see Setup above) |
| `GITHUB_PAT` | Fine-grained PAT with `Contents: read+write` on this repo |
| `GITHUB_REPO` | e.g. `garret/varsity-voices-dashboard` |

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
| `/admin/editorial` | Host-only editorial controls |
| `/unlock` | Site password form |

## On-Air Broadcast Checklist

1. **Set editorial content** — Open `/admin/editorial`, set the current week, Game of the Week, and storyline. Click **PUBLISH**.
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
- **Authentication**: Site-wide password gate via edge middleware (`middleware.ts`). Every route except `/unlock`, `/api/unlock`, and static assets requires a signed cookie.
- **Admin layer**: Editorial route (`/admin/editorial`) has a second cookie scope (`"admin"`) for host-only access.
- **Search**: cmd-K search palette uses Fuse.js, fully client-side, no external API calls.
- **Publishing**: Only external call is `api/admin/editorial` → GitHub Contents API when the host publishes editorial updates.

## Troubleshooting

**Build fails with "cannot find module"**
- Ensure `.env.local` has all required variables (see Setup).
- Check that team logo directory exists: `web/public/team-logos/`.

**404 page always shows**
- Verify you're logged in (check `/unlock` if needed).
- Check middleware redirects in `middleware.ts`.

**Editorial updates don't appear**
- Verify `GITHUB_PAT` has `Contents: read+write` scope.
- Check that `GITHUB_REPO` is in format `owner/repo`.
- Wait ~60 sec for Vercel rebuild after publish.

**Search (cmd-K) is slow or empty**
- Search indexes all teams and players at runtime — first load may take a moment.
- Check that JSON files in `public/data/` are populated.
