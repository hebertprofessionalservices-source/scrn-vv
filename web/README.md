# Varsity Voices — Dashboard

Mississippi HS Football coverage dashboard for SCRN. Built with Next.js 15, Tailwind v4, and shadcn/ui.

## Prerequisites

- Node 24+ (use `nvm` or `fnm`)
- pnpm 11+ (`npm install -g pnpm`)

## Setup

```powershell
cd web
pnpm install
cp .env.example .env.local
# Fill in .env.local values
```

## Sync scraper data

The dashboard reads from `../scraper/output/data/{season}/`. No extra sync step needed in dev — Next.js reads JSON at build/request time.

For a fresh scrape:
```powershell
cd ../scraper
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m scraper.cli --season 2025-26
```

## Development

```powershell
pnpm dev
# Open http://localhost:3000
```

## Build

```powershell
pnpm build
pnpm start
```

## Test

```powershell
pnpm test
pnpm test:ui   # browser-based Vitest UI
```

## Deploy

Deployed to Vercel. Push to `main` triggers automatic deploy. Set environment variables in the Vercel dashboard:

- `SITE_PASSWORD` — password gate for public visitors
- `ADMIN_PASSWORD` — editorial admin access
- `COOKIE_SECRET` — 32+ char random string for JWT signing
- `GITHUB_PAT` — token for publishing editorial data
- `GITHUB_REPO` — `owner/repo` for the data repo

## Project structure

```
web/
  app/           Next.js App Router pages
  components/    Shared React components
    ui/          shadcn/ui primitives
  lib/           Data access, utilities, type definitions
  public/        Static assets (brand images, logos)
```
