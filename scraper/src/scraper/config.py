"""Tunable constants and paths for the scraper."""
from __future__ import annotations

from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = PACKAGE_ROOT.parent.parent  # scraper/

OUTPUT_DIR = PROJECT_ROOT / "output"
DATA_DIR = OUTPUT_DIR / "data"
LOGOS_DIR = OUTPUT_DIR / "logos"
CACHE_DIR = PROJECT_ROOT / ".cache"
CACHE_DB_PATH = CACHE_DIR / "crawl.db"
RUN_REPORT_PATH = OUTPUT_DIR / "run-report.md"
ERRORS_LOG_PATH = OUTPUT_DIR / "errors.jsonl"

MAXPREPS_BASE = "https://www.maxpreps.com"
MS_FOOTBALL_LANDING = f"{MAXPREPS_BASE}/ms/football/"
LANDING_URL_TEMPLATE = f"{MAXPREPS_BASE}/ms/football/{{season}}/"

SUPPORTED_SEASONS: tuple[str, ...] = ("2024-25", "2025-26")

CHROMIUM_EXTRA_LAUNCH_ARGS: tuple[str, ...] = (
    "--disable-blink-features=AutomationControlled",
)

CHROMIUM_INIT_SCRIPT = (
    "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
)

PAGE_CONCURRENCY = 3
BROWSER_CONTEXTS = 1
JITTER_MIN_SECONDS = 1.5
JITTER_MAX_SECONDS = 3.5
MAX_BACKOFF_SECONDS = 300
HTTP_TIMEOUT_SECONDS = 30

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/127.0.0.0 Safari/537.36"
)

POSITIONS: tuple[str, ...] = (
    "QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P", "ATH",
)
CLASSES: tuple[str, ...] = ("FR", "SO", "JR", "SR")
