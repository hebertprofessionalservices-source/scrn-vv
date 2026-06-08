# Varsity Voices Scraper

Python + Playwright scraper for MaxPreps Mississippi HS football → canonical JSON.

## Setup

```bash
cd scraper
python -m venv .venv
.venv/Scripts/activate           # Windows (Git Bash)
# or: source .venv/bin/activate  # macOS/Linux
pip install -e ".[dev]"
playwright install chromium
```

## Run

```bash
scrape --season 2025-26
scrape --season 2025-26 --week 11
scrape --season 2024-25 --teams-only
scrape --season 2025-26 --force
```

## Test

```bash
pytest
ruff check src tests
ruff format src tests
```

Output lands in `output/data/{season}/{teams,players,games}.json` plus `output/run-report.md`.
