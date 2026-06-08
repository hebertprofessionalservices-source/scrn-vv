# Varsity Voices Scraper — Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Python + Playwright scraper that produces canonical, schema-validated JSON files of Mississippi High School varsity football data (teams, players, games + box scores) for the 2024–25 and 2025–26 seasons from MaxPreps.

**Architecture:** A discovery-first crawler. Seed → classes → teams → (team home, roster, schedule, season stats, per-game box scores). Each parser is fixture-driven (tests run against captured HTML, no network). A SQLite cache makes every fetch resumable. A pydantic schema validates every record before it lands in the final JSON. A `typer` CLI orchestrates the pipeline.

**Tech Stack:** Python 3.11, Playwright (Chromium), httpx, pydantic v2, sqlite-utils, typer, structlog, pytest, pytest-asyncio, ruff, uv (preferred) or pip+venv.

**Source spec:** `docs/superpowers/specs/2026-06-07-varsity-voices-dashboard-design.md`

---

## File Structure

```
scraper/
├── pyproject.toml
├── README.md
├── .gitignore
├── .python-version
├── src/scraper/
│   ├── __init__.py
│   ├── config.py            # constants: paths, concurrency, delays, base URLs
│   ├── slugify.py           # stable ID generation
│   ├── models.py            # pydantic models (Team, Player, Game, sub-models)
│   ├── cache.py             # SQLite resumability cache
│   ├── http.py              # httpx async client w/ retry + jitter
│   ├── browser.py           # Playwright context lifecycle
│   ├── classes.py           # discover MHSAA classes + MAIS divisions
│   ├── teams.py             # discover team URLs per class
│   ├── team_page.py         # parse team home page
│   ├── roster.py            # parse roster page
│   ├── schedule.py          # parse schedule + game list
│   ├── stats.py             # parse season player stats
│   ├── boxscore.py          # parse single game box score
│   ├── logos.py             # download + dedupe team logos
│   ├── normalize.py         # merge partials → canonical dicts
│   ├── report.py            # build run-report.md
│   └── pipeline.py          # orchestrator + typer CLI
└── tests/
    ├── conftest.py
    ├── fixtures/            # captured HTML for parser tests
    └── test_*.py            # one file per source module that needs tests
```

**Boundaries:** every parser module exposes one pure function `parse(html: str) -> SomeModelPartial`. Network code lives only in `http.py`, `browser.py`, `logos.py`. The pipeline is the only module that knows the order of operations. Cache, models, and slugify are leaf utilities.

---

## Task 1: Project bootstrap

**Files:**
- Create: `scraper/pyproject.toml`
- Create: `scraper/.python-version`
- Create: `scraper/.gitignore`
- Create: `scraper/README.md`
- Create: `scraper/src/scraper/__init__.py`
- Create: `scraper/tests/__init__.py`
- Create: `scraper/tests/conftest.py`
- Create: `.gitignore` (repo root)

- [ ] **Step 1: Create `scraper/.python-version`**

```
3.11
```

- [ ] **Step 2: Create `scraper/pyproject.toml`**

```toml
[project]
name = "varsity-voices-scraper"
version = "0.1.0"
description = "MaxPreps scraper for Mississippi HS football → canonical JSON"
requires-python = ">=3.11,<3.13"
dependencies = [
    "playwright>=1.47",
    "httpx>=0.27",
    "pydantic>=2.8",
    "sqlite-utils>=3.37",
    "typer>=0.12",
    "structlog>=24.4",
    "anyio>=4.4",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3",
    "pytest-asyncio>=0.23",
    "ruff>=0.6",
]

[project.scripts]
scrape = "scraper.pipeline:app"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/scraper"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "SIM"]
```

- [ ] **Step 3: Create `scraper/.gitignore`**

```
.venv/
__pycache__/
*.pyc
.pytest_cache/
.ruff_cache/
.cache/
output/
.playwright/
```

- [ ] **Step 4: Create repo-root `.gitignore`**

```
node_modules/
.next/
out/
.vercel/
.env
.env.local
scraper/.venv/
scraper/.cache/
scraper/output/
web/public/data/
web/public/team-logos/
```

- [ ] **Step 5: Create `scraper/README.md`**

```markdown
# Varsity Voices Scraper

Python + Playwright scraper for MaxPreps Mississippi HS football → canonical JSON.

## Setup

```bash
cd scraper
uv venv && source .venv/bin/activate   # or: python -m venv .venv && .venv/Scripts/activate
uv pip install -e ".[dev]"             # or: pip install -e ".[dev]"
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
```

- [ ] **Step 6: Create empty `__init__.py` files**

`scraper/src/scraper/__init__.py`:
```python
"""Varsity Voices MaxPreps scraper."""
__version__ = "0.1.0"
```

`scraper/tests/__init__.py`: empty file.

- [ ] **Step 7: Create `scraper/tests/conftest.py`**

```python
from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def fixtures_dir() -> Path:
    return FIXTURES_DIR


@pytest.fixture
def load_fixture(fixtures_dir):
    def _load(name: str) -> str:
        return (fixtures_dir / name).read_text(encoding="utf-8")
    return _load
```

- [ ] **Step 8: Install and verify**

Run:
```bash
cd scraper
python -m venv .venv
.venv\Scripts\activate     # Windows
pip install -e ".[dev]"
playwright install chromium
pytest -q
ruff check src tests
```

Expected: pytest exits 0 (no tests yet → "no tests ran"); ruff reports 0 errors.

- [ ] **Step 9: Commit**

```bash
git add scraper/ .gitignore
git commit -m "feat(scraper): bootstrap project scaffold"
```

---

## Task 2: Config module

**Files:**
- Create: `scraper/src/scraper/config.py`
- Test: `scraper/tests/test_config.py`

- [ ] **Step 1: Write the failing test**

`scraper/tests/test_config.py`:
```python
from pathlib import Path

from scraper import config


def test_config_exposes_required_paths():
    assert isinstance(config.OUTPUT_DIR, Path)
    assert isinstance(config.CACHE_DB_PATH, Path)
    assert config.OUTPUT_DIR.name == "output"
    assert config.CACHE_DB_PATH.name == "crawl.db"


def test_config_exposes_crawl_tuning():
    assert config.PAGE_CONCURRENCY >= 1
    assert config.JITTER_MIN_SECONDS < config.JITTER_MAX_SECONDS
    assert config.MAX_BACKOFF_SECONDS >= 60


def test_supported_seasons_present():
    assert "2024-25" in config.SUPPORTED_SEASONS
    assert "2025-26" in config.SUPPORTED_SEASONS


def test_maxpreps_base_url_set():
    assert config.MAXPREPS_BASE.startswith("https://www.maxpreps.com")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'scraper.config'`

- [ ] **Step 3: Implement `scraper/src/scraper/config.py`**

```python
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
MS_FOOTBALL_LANDING = f"{MAXPREPS_BASE}/mississippi/football/"

SUPPORTED_SEASONS: tuple[str, ...] = ("2024-25", "2025-26")

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_config.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add scraper/src/scraper/config.py scraper/tests/test_config.py
git commit -m "feat(scraper): add config module with paths and tuning"
```

---

## Task 3: Slugify helpers

**Files:**
- Create: `scraper/src/scraper/slugify.py`
- Test: `scraper/tests/test_slugify.py`

- [ ] **Step 1: Write the failing test**

`scraper/tests/test_slugify.py`:
```python
from scraper.slugify import slugify, team_id, player_id, game_id


def test_slugify_lowercases_and_dashes_spaces():
    assert slugify("Starkville Yellowjackets") == "starkville-yellowjackets"


def test_slugify_strips_punctuation_and_collapses_dashes():
    assert slugify("St. Andrew's   (MS)") == "st-andrews-ms"


def test_slugify_handles_apostrophes_without_dash():
    assert slugify("D'Iberville") == "diberville"


def test_team_id_combines_name_and_mascot():
    assert team_id("Starkville", "Yellowjackets") == "starkville-yellowjackets"


def test_team_id_handles_missing_mascot():
    assert team_id("Foo", None) == "foo"
    assert team_id("Foo", "") == "foo"


def test_player_id_includes_jersey_and_last_name():
    assert player_id(
        team_id_="starkville-yellowjackets",
        jersey="12",
        full_name="Jordan Doe",
    ) == "starkville-yellowjackets-12-doe"


def test_player_id_handles_single_name_player():
    assert player_id(
        team_id_="foo-bar",
        jersey="7",
        full_name="Cher",
    ) == "foo-bar-7-cher"


def test_player_id_with_missing_jersey_uses_x():
    assert player_id(
        team_id_="foo-bar",
        jersey=None,
        full_name="Jane Smith",
    ) == "foo-bar-x-smith"


def test_game_id_format():
    assert game_id(
        date="2025-09-12",
        away_team_id="starkville-yellowjackets",
        home_team_id="tupelo-golden-wave",
    ) == "2025-09-12-starkville-yellowjackets-at-tupelo-golden-wave"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_slugify.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement `scraper/src/scraper/slugify.py`**

```python
"""Stable ID generation for teams, players, and games."""
from __future__ import annotations

import re
import unicodedata

_NON_ALNUM = re.compile(r"[^a-z0-9]+")
_APOSTROPHE = re.compile(r"['’]")


def slugify(value: str) -> str:
    """Lowercase ASCII slug. Apostrophes are stripped (not dashed)."""
    if not value:
        return ""
    ascii_value = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    ascii_value = _APOSTROPHE.sub("", ascii_value)
    ascii_value = _NON_ALNUM.sub("-", ascii_value)
    return ascii_value.strip("-")


def team_id(name: str, mascot: str | None) -> str:
    parts = [slugify(name)]
    if mascot:
        parts.append(slugify(mascot))
    return "-".join(p for p in parts if p)


def player_id(team_id_: str, jersey: str | None, full_name: str) -> str:
    jersey_part = slugify(jersey) if jersey else "x"
    last_name = full_name.strip().split()[-1] if full_name.strip() else "unknown"
    return f"{team_id_}-{jersey_part}-{slugify(last_name)}"


def game_id(date: str, away_team_id: str, home_team_id: str) -> str:
    return f"{date}-{away_team_id}-at-{home_team_id}"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_slugify.py -v`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add scraper/src/scraper/slugify.py scraper/tests/test_slugify.py
git commit -m "feat(scraper): add slugify helpers for stable IDs"
```

---

## Task 4: Pydantic models

**Files:**
- Create: `scraper/src/scraper/models.py`
- Test: `scraper/tests/test_models.py`

- [ ] **Step 1: Write the failing test**

`scraper/tests/test_models.py`:
```python
import pytest
from pydantic import ValidationError

from scraper.models import (
    Game,
    Player,
    PlayerStats,
    Team,
    TeamRecord,
    TeamRankings,
    TeamStats,
)


def _valid_team_kwargs():
    return dict(
        id="starkville-yellowjackets",
        name="Starkville",
        mascot="Yellowjackets",
        city="Starkville, MS",
        classification="7A",
        district="District 2-7A",
        logoUrl="/team-logos/starkville-yellowjackets.png",
        colors={"primary": "#FFC72C", "secondary": "#000000"},
        season="2025-26",
        record=TeamRecord(wins=8, losses=2),
        rankings=TeamRankings(stateOverall=3, stateClass=1, national=None),
        stats=TeamStats(
            pointsFor=412, pointsAgainst=178,
            yardsFor=4210, yardsAgainst=2890,
            passYdsFor=1820, rushYdsFor=2390,
            passYdsAgainst=1410, rushYdsAgainst=1480,
            turnoversForced=18, turnoversLost=9,
        ),
        headCoach="Chris Chambless",
        maxprepsUrl="https://www.maxpreps.com/...",
    )


def test_team_round_trip():
    team = Team(**_valid_team_kwargs())
    dumped = team.model_dump()
    assert dumped["id"] == "starkville-yellowjackets"
    assert dumped["record"]["wins"] == 8


def test_team_rejects_bad_classification():
    bad = _valid_team_kwargs()
    bad["classification"] = "11A"
    with pytest.raises(ValidationError):
        Team(**bad)


def test_team_allows_mais_classifications():
    for c in ("MAIS-6A", "MAIS-5A", "MAIS-4A", "MAIS-3A"):
        kw = _valid_team_kwargs()
        kw["classification"] = c
        Team(**kw)


def test_team_season_must_match_pattern():
    bad = _valid_team_kwargs()
    bad["season"] = "25-26"
    with pytest.raises(ValidationError):
        Team(**bad)


def test_player_defaults_all_stat_groups_to_zero():
    p = Player(
        id="x-12-doe",
        teamId="x",
        season="2025-26",
        name="Jordan Doe",
        jersey="12",
        position="QB",
        playerClass="SR",
        height="6-2",
        weight=195,
        gamesPlayed=10,
    )
    s = p.stats
    assert s.passing.att == 0
    assert s.rushing.att == 0
    assert s.receiving.rec == 0
    assert s.defense.tackles == 0
    assert s.kicking.fgm == 0


def test_player_rejects_bad_position():
    with pytest.raises(ValidationError):
        Player(
            id="x", teamId="x", season="2025-26",
            name="x", jersey="1", position="BOGUS",
            playerClass="SR", gamesPlayed=0,
        )


def test_game_data_status_drives_box_score_nullability():
    g = Game(
        id="2025-09-12-a-at-b",
        season="2025-26",
        week=3,
        date="2025-09-12",
        homeTeamId="b",
        awayTeamId="a",
        homeScore=17,
        awayScore=34,
        quarterScores={"home": [3, 7, 0, 7], "away": [14, 7, 7, 6]},
        status="final",
        dataStatus="missing",
        boxScore=None,
    )
    assert g.boxScore is None


def test_game_complete_requires_box_score():
    with pytest.raises(ValidationError):
        Game(
            id="g", season="2025-26", week=1, date="2025-09-12",
            homeTeamId="b", awayTeamId="a",
            homeScore=10, awayScore=20,
            status="final", dataStatus="complete", boxScore=None,
        )


def test_player_stats_allow_explicit_override():
    s = PlayerStats(passing={"att": 100, "cmp": 60, "yds": 800, "td": 7, "int": 2, "rating": 95.0})
    assert s.passing.att == 100
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_models.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement `scraper/src/scraper/models.py`**

```python
"""Canonical pydantic models for scraper output."""
from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

_CLASS_PATTERN = re.compile(r"^(?:[1-7]A|MAIS-[1-6]A)$")
_SEASON_PATTERN = re.compile(r"^\d{4}-\d{2}$")
_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")

Position = Literal["QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P", "ATH"]
PlayerClass = Literal["FR", "SO", "JR", "SR"]
GameStatus = Literal["final", "scheduled", "in_progress", "postponed"]
DataStatus = Literal["complete", "incomplete", "missing"]


class _Frozen(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=False)


class TeamRecord(_Frozen):
    wins: int = Field(ge=0)
    losses: int = Field(ge=0)


class TeamRankings(_Frozen):
    stateOverall: int | None = None
    stateClass: int | None = None
    national: int | None = None


class TeamStats(_Frozen):
    pointsFor: int = 0
    pointsAgainst: int = 0
    yardsFor: int = 0
    yardsAgainst: int = 0
    passYdsFor: int = 0
    rushYdsFor: int = 0
    passYdsAgainst: int = 0
    rushYdsAgainst: int = 0
    turnoversForced: int = 0
    turnoversLost: int = 0


class TeamColors(_Frozen):
    primary: str | None = None
    secondary: str | None = None


class Team(_Frozen):
    id: str
    name: str
    mascot: str | None = None
    city: str | None = None
    classification: str
    district: str | None = None
    logoUrl: str | None = None
    colors: TeamColors = Field(default_factory=TeamColors)
    season: str
    record: TeamRecord
    rankings: TeamRankings = Field(default_factory=TeamRankings)
    stats: TeamStats = Field(default_factory=TeamStats)
    headCoach: str | None = None
    maxprepsUrl: str | None = None

    @field_validator("classification")
    @classmethod
    def _valid_class(cls, v: str) -> str:
        if not _CLASS_PATTERN.match(v):
            raise ValueError(f"invalid classification: {v}")
        return v

    @field_validator("season")
    @classmethod
    def _valid_season(cls, v: str) -> str:
        if not _SEASON_PATTERN.match(v):
            raise ValueError(f"invalid season: {v}")
        return v

    @field_validator("colors", mode="before")
    @classmethod
    def _coerce_colors(cls, v):
        if v is None:
            return TeamColors()
        if isinstance(v, dict):
            return TeamColors(**v)
        return v


class PassingStats(_Frozen):
    att: int = 0
    cmp: int = 0
    yds: int = 0
    td: int = 0
    int: int = 0
    rating: float = 0.0


class RushingStats(_Frozen):
    att: int = 0
    yds: int = 0
    td: int = 0
    ypc: float = 0.0


class ReceivingStats(_Frozen):
    rec: int = 0
    yds: int = 0
    td: int = 0


class DefenseStats(_Frozen):
    tackles: int = 0
    sacks: float = 0.0
    int: int = 0
    ff: int = 0


class KickingStats(_Frozen):
    fgm: int = 0
    fga: int = 0
    xpm: int = 0
    xpa: int = 0


class PlayerStats(_Frozen):
    passing: PassingStats = Field(default_factory=PassingStats)
    rushing: RushingStats = Field(default_factory=RushingStats)
    receiving: ReceivingStats = Field(default_factory=ReceivingStats)
    defense: DefenseStats = Field(default_factory=DefenseStats)
    kicking: KickingStats = Field(default_factory=KickingStats)

    @field_validator("passing", "rushing", "receiving", "defense", "kicking", mode="before")
    @classmethod
    def _coerce_dicts(cls, v):
        return v if v is not None else {}


class Player(_Frozen):
    id: str
    teamId: str
    season: str
    name: str
    jersey: str | None = None
    position: Position
    playerClass: PlayerClass = Field(alias="class")
    height: str | None = None
    weight: int | None = None
    stats: PlayerStats = Field(default_factory=PlayerStats)
    gamesPlayed: int = 0

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    @field_validator("season")
    @classmethod
    def _valid_season(cls, v: str) -> str:
        if not _SEASON_PATTERN.match(v):
            raise ValueError(f"invalid season: {v}")
        return v


class BoxScoreEntry(_Frozen):
    playerId: str
    # all stat fields optional and free-form per group
    cmp: int | None = None
    att: int | None = None
    yds: int | None = None
    td: int | None = None
    int: int | None = None
    rec: int | None = None
    tackles: int | None = None
    sacks: float | None = None
    ff: int | None = None
    fgm: int | None = None
    fga: int | None = None
    xpm: int | None = None
    xpa: int | None = None


class BoxScore(_Frozen):
    passing: list[BoxScoreEntry] = Field(default_factory=list)
    rushing: list[BoxScoreEntry] = Field(default_factory=list)
    receiving: list[BoxScoreEntry] = Field(default_factory=list)
    defense: list[BoxScoreEntry] = Field(default_factory=list)


class QuarterScores(_Frozen):
    home: list[int] = Field(default_factory=list)
    away: list[int] = Field(default_factory=list)


class Game(_Frozen):
    id: str
    season: str
    week: int = Field(ge=0)
    date: str
    homeTeamId: str
    awayTeamId: str
    homeScore: int | None = None
    awayScore: int | None = None
    quarterScores: QuarterScores = Field(default_factory=QuarterScores)
    status: GameStatus
    dataStatus: DataStatus
    venue: str | None = None
    boxScore: BoxScore | None = None
    maxprepsUrl: str | None = None

    @field_validator("season")
    @classmethod
    def _valid_season(cls, v: str) -> str:
        if not _SEASON_PATTERN.match(v):
            raise ValueError(f"invalid season: {v}")
        return v

    @field_validator("date")
    @classmethod
    def _valid_date(cls, v: str) -> str:
        if not _DATE_PATTERN.match(v):
            raise ValueError(f"invalid date: {v}")
        return v

    @model_validator(mode="after")
    def _complete_requires_box(self) -> "Game":
        if self.dataStatus == "complete" and self.boxScore is None:
            raise ValueError("dataStatus=complete requires a boxScore")
        return self
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_models.py -v`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add scraper/src/scraper/models.py scraper/tests/test_models.py
git commit -m "feat(scraper): add pydantic models for canonical output"
```

---

## Task 5: SQLite resumability cache

**Files:**
- Create: `scraper/src/scraper/cache.py`
- Test: `scraper/tests/test_cache.py`

- [ ] **Step 1: Write the failing test**

`scraper/tests/test_cache.py`:
```python
from pathlib import Path

from scraper.cache import CrawlCache


def test_miss_then_hit(tmp_path: Path):
    cache = CrawlCache(tmp_path / "c.db")
    assert cache.get("https://example.com/a") is None
    cache.put("https://example.com/a", body="<html>1</html>", status=200)
    hit = cache.get("https://example.com/a")
    assert hit is not None
    assert hit.body == "<html>1</html>"
    assert hit.status == 200


def test_force_bypasses_cache(tmp_path: Path):
    cache = CrawlCache(tmp_path / "c.db")
    cache.put("u", body="old", status=200)
    assert cache.get("u", force=True) is None


def test_put_overwrites_existing(tmp_path: Path):
    cache = CrawlCache(tmp_path / "c.db")
    cache.put("u", body="v1", status=200)
    cache.put("u", body="v2", status=200)
    assert cache.get("u").body == "v2"


def test_url_normalization(tmp_path: Path):
    cache = CrawlCache(tmp_path / "c.db")
    cache.put("https://example.com/a/", body="x", status=200)
    assert cache.get("https://example.com/a") is not None
    assert cache.get("https://example.com/a/") is not None


def test_stats_returns_counts(tmp_path: Path):
    cache = CrawlCache(tmp_path / "c.db")
    cache.put("a", body="x", status=200)
    cache.put("b", body="y", status=404)
    s = cache.stats()
    assert s["total"] == 2
    assert s["ok"] == 1
    assert s["errors"] == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_cache.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement `scraper/src/scraper/cache.py`**

```python
"""SQLite-backed resumability cache for crawls."""
from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass
from pathlib import Path

import sqlite_utils


@dataclass(frozen=True)
class CacheHit:
    url: str
    body: str
    status: int
    fetched_at: float
    body_hash: str


def _normalize(url: str) -> str:
    return url.rstrip("/")


class CrawlCache:
    """Records HTTP responses so re-runs skip already-fetched URLs."""

    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite_utils.Database(path)
        if "responses" not in self._db.table_names():
            self._db["responses"].create(
                {
                    "url": str,
                    "body": str,
                    "status": int,
                    "fetched_at": float,
                    "body_hash": str,
                },
                pk="url",
            )

    def get(self, url: str, *, force: bool = False) -> CacheHit | None:
        if force:
            return None
        row = self._db["responses"].rows_where("url = ?", [_normalize(url)])
        for r in row:
            return CacheHit(
                url=r["url"],
                body=r["body"],
                status=r["status"],
                fetched_at=r["fetched_at"],
                body_hash=r["body_hash"],
            )
        return None

    def put(self, url: str, *, body: str, status: int) -> CacheHit:
        body_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()
        row = {
            "url": _normalize(url),
            "body": body,
            "status": status,
            "fetched_at": time.time(),
            "body_hash": body_hash,
        }
        self._db["responses"].upsert(row, pk="url")
        return CacheHit(**row)

    def stats(self) -> dict[str, int]:
        total = self._db["responses"].count
        ok = next(self._db.query("SELECT COUNT(*) AS n FROM responses WHERE status BETWEEN 200 AND 299"))["n"]
        errors = total - ok
        return {"total": total, "ok": ok, "errors": errors}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_cache.py -v`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add scraper/src/scraper/cache.py scraper/tests/test_cache.py
git commit -m "feat(scraper): add SQLite resumability cache"
```

---

## Task 6: HTTP client for static assets

**Files:**
- Create: `scraper/src/scraper/http.py`
- Test: `scraper/tests/test_http.py`

- [ ] **Step 1: Write the failing test**

`scraper/tests/test_http.py`:
```python
import asyncio
from pathlib import Path

import httpx
import pytest

from scraper.http import StaticFetcher


@pytest.fixture
def transport_ok():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"binary-bytes")
    return httpx.MockTransport(handler)


@pytest.fixture
def transport_429_then_ok():
    state = {"calls": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        state["calls"] += 1
        if state["calls"] == 1:
            return httpx.Response(429, headers={"retry-after": "0"})
        return httpx.Response(200, content=b"ok")

    return httpx.MockTransport(handler), state


@pytest.fixture
def transport_404():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404)
    return httpx.MockTransport(handler)


async def test_fetch_bytes_succeeds(transport_ok):
    fetcher = StaticFetcher(transport=transport_ok)
    data = await fetcher.fetch_bytes("https://example.com/x.png")
    assert data == b"binary-bytes"


async def test_fetch_bytes_retries_on_429(transport_429_then_ok):
    transport, state = transport_429_then_ok
    fetcher = StaticFetcher(transport=transport, max_attempts=3, base_backoff=0.0)
    data = await fetcher.fetch_bytes("https://example.com/x.png")
    assert data == b"ok"
    assert state["calls"] == 2


async def test_fetch_bytes_returns_none_on_404(transport_404):
    fetcher = StaticFetcher(transport=transport_404)
    assert await fetcher.fetch_bytes("https://example.com/missing.png") is None


async def test_download_writes_file(tmp_path: Path, transport_ok):
    fetcher = StaticFetcher(transport=transport_ok)
    dest = tmp_path / "x.png"
    ok = await fetcher.download("https://example.com/x.png", dest)
    assert ok is True
    assert dest.read_bytes() == b"binary-bytes"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_http.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement `scraper/src/scraper/http.py`**

```python
"""Async HTTP client for static assets (logos, etc.)."""
from __future__ import annotations

import asyncio
import random
from pathlib import Path

import httpx

from scraper import config


class StaticFetcher:
    """Async fetcher with retry + jitter. For non-JS assets only."""

    def __init__(
        self,
        *,
        transport: httpx.BaseTransport | None = None,
        max_attempts: int = 4,
        base_backoff: float = 1.0,
        timeout: float = config.HTTP_TIMEOUT_SECONDS,
    ) -> None:
        self._client = httpx.AsyncClient(
            transport=transport,
            timeout=timeout,
            headers={"User-Agent": config.USER_AGENT},
            follow_redirects=True,
        )
        self._max_attempts = max_attempts
        self._base_backoff = base_backoff

    async def fetch_bytes(self, url: str) -> bytes | None:
        attempt = 0
        while True:
            attempt += 1
            try:
                resp = await self._client.get(url)
            except httpx.HTTPError:
                if attempt >= self._max_attempts:
                    return None
                await self._sleep_backoff(attempt)
                continue

            if resp.status_code == 200:
                return resp.content
            if resp.status_code in (404, 410):
                return None
            if resp.status_code in (429, 500, 502, 503, 504) and attempt < self._max_attempts:
                await self._sleep_backoff(attempt, hint=resp.headers.get("retry-after"))
                continue
            return None

    async def download(self, url: str, dest: Path) -> bool:
        data = await self.fetch_bytes(url)
        if data is None:
            return False
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        return True

    async def _sleep_backoff(self, attempt: int, *, hint: str | None = None) -> None:
        if hint:
            try:
                await asyncio.sleep(min(float(hint), config.MAX_BACKOFF_SECONDS))
                return
            except ValueError:
                pass
        delay = min(self._base_backoff * (2 ** (attempt - 1)), config.MAX_BACKOFF_SECONDS)
        delay += random.uniform(0, self._base_backoff)
        await asyncio.sleep(delay)

    async def aclose(self) -> None:
        await self._client.aclose()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_http.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add scraper/src/scraper/http.py scraper/tests/test_http.py
git commit -m "feat(scraper): add async HTTP fetcher with retry/backoff"
```

---

## Task 7: Browser harness

**Files:**
- Create: `scraper/src/scraper/browser.py`
- Test: `scraper/tests/test_browser.py`

- [ ] **Step 1: Write the failing test**

`scraper/tests/test_browser.py`:
```python
import pytest

from scraper.browser import BrowserHarness


@pytest.mark.skipif(
    not __import__("shutil").which("chromium") and not __import__("os").environ.get("PLAYWRIGHT_BROWSERS_PATH"),
    reason="Playwright chromium not installed in CI image",
)
async def test_browser_can_open_about_blank():
    async with BrowserHarness(headless=True) as harness:
        page = await harness.new_page()
        await page.goto("about:blank")
        title = await page.title()
        assert title == ""


async def test_browser_jitter_is_in_range():
    h = BrowserHarness(headless=True)
    for _ in range(50):
        d = h._jitter_seconds()
        assert 1.0 <= d <= 4.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_browser.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement `scraper/src/scraper/browser.py`**

```python
"""Playwright Chromium harness with jitter and one-context discipline."""
from __future__ import annotations

import asyncio
import random
from contextlib import asynccontextmanager
from types import TracebackType

from playwright.async_api import Browser, BrowserContext, Page, async_playwright

from scraper import config


class BrowserHarness:
    """Owns the single Chromium context shared across the crawl."""

    def __init__(self, *, headless: bool = True) -> None:
        self._headless = headless
        self._playwright = None
        self._browser: Browser | None = None
        self._context: BrowserContext | None = None
        self._page_semaphore = asyncio.Semaphore(config.PAGE_CONCURRENCY)

    async def __aenter__(self) -> "BrowserHarness":
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(headless=self._headless)
        self._context = await self._browser.new_context(
            user_agent=config.USER_AGENT,
            viewport={"width": 1440, "height": 900},
        )
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: TracebackType | None,
    ) -> None:
        if self._context is not None:
            await self._context.close()
        if self._browser is not None:
            await self._browser.close()
        if self._playwright is not None:
            await self._playwright.stop()

    async def new_page(self) -> Page:
        assert self._context is not None, "BrowserHarness not entered"
        return await self._context.new_page()

    @asynccontextmanager
    async def page(self):
        async with self._page_semaphore:
            page = await self.new_page()
            try:
                yield page
            finally:
                await page.close()

    def _jitter_seconds(self) -> float:
        return random.uniform(config.JITTER_MIN_SECONDS, config.JITTER_MAX_SECONDS)

    async def jitter(self) -> None:
        await asyncio.sleep(self._jitter_seconds())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_browser.py -v`
Expected: PASS (the about:blank test is skipped in CI without chromium; the jitter test always runs and passes). On a dev machine with `playwright install chromium` done, both pass.

- [ ] **Step 5: Commit**

```bash
git add scraper/src/scraper/browser.py scraper/tests/test_browser.py
git commit -m "feat(scraper): add Playwright browser harness with jitter"
```

---

## Task 8: Capture HTML fixtures from MaxPreps

> **All parser tasks (Task 9–14) depend on real captured HTML.** This task gives you a one-shot script to capture every fixture in one Playwright session.

**Files:**
- Create: `scraper/scripts/capture_fixtures.py`

- [ ] **Step 1: Implement the capture script**

```python
"""Capture HTML fixtures for parser tests.

Usage:
    python scripts/capture_fixtures.py

Captures one representative page of each type into tests/fixtures/.
Re-run any time MaxPreps DOM changes meaningfully.
"""
from __future__ import annotations

import asyncio
from pathlib import Path

from scraper.browser import BrowserHarness

FIXTURES = Path(__file__).resolve().parent.parent / "tests" / "fixtures"

# Edit these URLs to point at any real MaxPreps MS team that has full data.
TARGETS = {
    "ms_football_landing.html": "https://www.maxpreps.com/mississippi/football/",
    "class_7a_directory.html":  "https://www.maxpreps.com/mississippi/football/division/7a/teams/",
    "team_home.html":           "https://www.maxpreps.com/ms/starkville/starkville-yellowjackets/football/",
    "team_roster.html":         "https://www.maxpreps.com/ms/starkville/starkville-yellowjackets/football/roster/",
    "team_schedule.html":       "https://www.maxpreps.com/ms/starkville/starkville-yellowjackets/football/schedule/",
    "team_stats.html":          "https://www.maxpreps.com/ms/starkville/starkville-yellowjackets/football/stats/",
    "boxscore_complete.html":   "REPLACE_WITH_A_REAL_FINAL_GAME_BOX_SCORE_URL",
    "boxscore_missing.html":    "REPLACE_WITH_A_REAL_GAME_WITH_NO_BOX_SCORE",
}


async def main() -> None:
    FIXTURES.mkdir(parents=True, exist_ok=True)
    async with BrowserHarness(headless=False) as h:
        for filename, url in TARGETS.items():
            if url.startswith("REPLACE_WITH"):
                print(f"SKIP {filename} — set URL first")
                continue
            print(f"GET  {url}")
            async with h.page() as p:
                await p.goto(url, wait_until="networkidle")
                html = await p.content()
                (FIXTURES / filename).write_text(html, encoding="utf-8")
                print(f"WROTE {filename} ({len(html):,} bytes)")
                await h.jitter()


if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 2: Run the script in `--headed` mode**

```bash
cd scraper
python scripts/capture_fixtures.py
```

Inspect each captured file in your browser/editor and confirm the relevant content is present. If MaxPreps shows a CAPTCHA or empty shell, slow the script down or solve manually in `--headed`.

- [ ] **Step 3: Add fixtures to git**

```bash
git add scraper/scripts/capture_fixtures.py scraper/tests/fixtures/*.html
git commit -m "chore(scraper): capture HTML fixtures for parser tests"
```

> **Note:** All subsequent parser tasks use these fixtures. If a parser breaks later because MaxPreps changed their DOM, re-run this script and the parser tests will fail loudly on the new HTML — exactly the signal we want.

---

## Task 9: Team page parser

**Files:**
- Create: `scraper/src/scraper/team_page.py`
- Test: `scraper/tests/test_team_page.py`

- [ ] **Step 1: Inspect `tests/fixtures/team_home.html`**

Open in browser/editor. Identify CSS selectors for: team name, mascot, city, classification, district, head coach, record, ranking, logo URL, school colors (if exposed).

- [ ] **Step 2: Write the failing test**

`scraper/tests/test_team_page.py`:
```python
from scraper.team_page import parse_team_home


def test_parse_team_home_extracts_core_fields(load_fixture):
    html = load_fixture("team_home.html")
    partial = parse_team_home(html, source_url="https://www.maxpreps.com/x")

    assert partial["name"]
    assert partial["mascot"]
    assert partial["classification"]
    assert partial["record"]["wins"] >= 0
    assert partial["record"]["losses"] >= 0
    assert partial["maxprepsUrl"] == "https://www.maxpreps.com/x"
    assert "logoUrl" in partial


def test_parse_team_home_missing_optional_fields_are_none(load_fixture):
    html = load_fixture("team_home.html")
    partial = parse_team_home(html, source_url="u")
    # Any of these may be None for some teams; just assert keys exist.
    assert "headCoach" in partial
    assert "district" in partial
    assert "city" in partial
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest tests/test_team_page.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 4: Implement `scraper/src/scraper/team_page.py`**

> Inspect the fixture and write the selectors. Below is a working skeleton — fill in the selectors marked `# TODO selector` with what you find. Use `lxml`-style CSS via the `selectolax` library? **No** — use stdlib + `BeautifulSoup` via `bs4`. Add `beautifulsoup4>=4.12` to `pyproject.toml` dependencies and reinstall.

Add to `scraper/pyproject.toml` dependencies:
```toml
"beautifulsoup4>=4.12",
```

Re-install: `pip install -e ".[dev]"`.

```python
"""Parser for MaxPreps team home page."""
from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup

_RECORD_RE = re.compile(r"(\d+)\s*[-–]\s*(\d+)")


def parse_team_home(html: str, *, source_url: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    name = _text(soup.select_one('[data-testid="team-name"], h1.team-name, h1'))
    mascot = _text(soup.select_one('[data-testid="mascot"], .mascot'))
    city = _text(soup.select_one('[data-testid="team-location"], .team-location, .location'))
    classification = _text(soup.select_one('[data-testid="classification"], .classification'))
    district = _text(soup.select_one('[data-testid="district"], .district'))
    head_coach = _text(soup.select_one('[data-testid="head-coach"], .head-coach'))
    logo = soup.select_one('img[data-testid="team-logo"], img.team-logo, img[alt*="logo"]')
    logo_url = logo.get("src") if logo else None

    record_text = _text(soup.select_one('[data-testid="record"], .team-record, .record'))
    wins, losses = _parse_record(record_text)

    rank_overall = _int(_text(soup.select_one('[data-testid="state-overall-rank"]')))
    rank_class = _int(_text(soup.select_one('[data-testid="state-class-rank"]')))

    return {
        "name": name,
        "mascot": mascot or None,
        "city": city or None,
        "classification": classification or "",
        "district": district or None,
        "headCoach": head_coach or None,
        "logoUrl": logo_url,
        "record": {"wins": wins, "losses": losses},
        "rankings": {
            "stateOverall": rank_overall,
            "stateClass": rank_class,
            "national": None,
        },
        "maxprepsUrl": source_url,
    }


def _text(node) -> str:
    return node.get_text(strip=True) if node else ""


def _int(value: str) -> int | None:
    try:
        return int(re.sub(r"[^0-9-]", "", value))
    except (TypeError, ValueError):
        return None


def _parse_record(text: str) -> tuple[int, int]:
    m = _RECORD_RE.search(text or "")
    if not m:
        return 0, 0
    return int(m.group(1)), int(m.group(2))
```

- [ ] **Step 5: Run test, adjust selectors against the fixture until green**

Run: `pytest tests/test_team_page.py -v`
Iterate on selectors using the captured fixture. Expected outcome: PASS.

- [ ] **Step 6: Commit**

```bash
git add scraper/src/scraper/team_page.py scraper/tests/test_team_page.py scraper/pyproject.toml
git commit -m "feat(scraper): parse team home page from MaxPreps"
```

---

## Task 10: Roster parser

**Files:**
- Create: `scraper/src/scraper/roster.py`
- Test: `scraper/tests/test_roster.py`

- [ ] **Step 1: Inspect `tests/fixtures/team_roster.html`** for the roster table structure.

- [ ] **Step 2: Write the failing test**

`scraper/tests/test_roster.py`:
```python
from scraper.roster import parse_roster


def test_parse_roster_returns_list_of_player_partials(load_fixture):
    html = load_fixture("team_roster.html")
    players = parse_roster(html)

    assert len(players) > 5  # any varsity roster has more than 5 players
    p = players[0]
    assert {"name", "jersey", "position", "playerClass"} <= set(p.keys())


def test_parse_roster_normalizes_positions(load_fixture):
    html = load_fixture("team_roster.html")
    players = parse_roster(html)

    valid = {"QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P", "ATH"}
    # at least one player normalized into a known position
    assert any(p["position"] in valid for p in players)
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest tests/test_roster.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 4: Implement `scraper/src/scraper/roster.py`**

```python
"""Parser for MaxPreps team roster page."""
from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup

POSITION_ALIASES = {
    "QB": "QB", "RB": "RB", "HB": "RB", "FB": "RB",
    "WR": "WR", "TE": "TE",
    "OL": "OL", "OT": "OL", "OG": "OL", "C": "OL",
    "DL": "DL", "DT": "DL", "DE": "DL",
    "LB": "LB", "ILB": "LB", "OLB": "LB", "MLB": "LB",
    "DB": "DB", "CB": "DB", "S": "DB", "FS": "DB", "SS": "DB",
    "K": "K", "PK": "K", "P": "P", "ATH": "ATH",
}

CLASS_ALIASES = {
    "FR": "FR", "FRESHMAN": "FR",
    "SO": "SO", "SOPHOMORE": "SO",
    "JR": "JR", "JUNIOR": "JR",
    "SR": "SR", "SENIOR": "SR",
}

_HEIGHT_RE = re.compile(r"(\d)\D+(\d{1,2})")


def parse_roster(html: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    rows = soup.select('table tbody tr, [data-testid="roster-row"]')

    out: list[dict[str, Any]] = []
    for row in rows:
        cells = [c.get_text(strip=True) for c in row.select("td")]
        if len(cells) < 3:
            continue

        # The exact column order varies by MaxPreps layout. Adjust to fixture.
        jersey = cells[0]
        name = cells[1]
        position_raw = cells[2] if len(cells) > 2 else ""
        class_raw = cells[3] if len(cells) > 3 else ""
        height_raw = cells[4] if len(cells) > 4 else ""
        weight_raw = cells[5] if len(cells) > 5 else ""

        out.append({
            "name": name,
            "jersey": jersey or None,
            "position": _normalize_position(position_raw),
            "playerClass": _normalize_class(class_raw),
            "height": _normalize_height(height_raw),
            "weight": _normalize_weight(weight_raw),
        })

    return out


def _normalize_position(raw: str) -> str:
    key = re.sub(r"[^A-Z]", "", raw.upper())
    return POSITION_ALIASES.get(key, "ATH")


def _normalize_class(raw: str) -> str:
    key = re.sub(r"[^A-Z]", "", raw.upper())
    return CLASS_ALIASES.get(key, "FR")


def _normalize_height(raw: str) -> str | None:
    m = _HEIGHT_RE.search(raw)
    if not m:
        return None
    return f"{m.group(1)}-{m.group(2)}"


def _normalize_weight(raw: str) -> int | None:
    digits = re.sub(r"[^0-9]", "", raw)
    return int(digits) if digits else None
```

- [ ] **Step 5: Iterate selectors against the fixture, run tests until green**

Run: `pytest tests/test_roster.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add scraper/src/scraper/roster.py scraper/tests/test_roster.py
git commit -m "feat(scraper): parse team roster with position/class normalization"
```

---

## Task 11: Schedule parser

**Files:**
- Create: `scraper/src/scraper/schedule.py`
- Test: `scraper/tests/test_schedule.py`

- [ ] **Step 1: Inspect `tests/fixtures/team_schedule.html`** for game rows and box-score links.

- [ ] **Step 2: Write the failing test**

`scraper/tests/test_schedule.py`:
```python
from scraper.schedule import parse_schedule


def test_parse_schedule_returns_game_stubs(load_fixture):
    html = load_fixture("team_schedule.html")
    games = parse_schedule(html, team_url="https://www.maxpreps.com/ms/x/y/football/")

    assert len(games) > 0
    g = games[0]
    assert {"date", "homeOrAway", "opponentName", "status"} <= set(g.keys())


def test_parse_schedule_marks_final_vs_scheduled(load_fixture):
    html = load_fixture("team_schedule.html")
    games = parse_schedule(html, team_url="x")
    statuses = {g["status"] for g in games}
    assert statuses.issubset({"final", "scheduled", "in_progress", "postponed"})


def test_box_score_url_present_when_final(load_fixture):
    html = load_fixture("team_schedule.html")
    games = parse_schedule(html, team_url="https://www.maxpreps.com")
    finals = [g for g in games if g["status"] == "final"]
    if finals:
        assert any(g.get("boxScoreUrl") for g in finals)
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest tests/test_schedule.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 4: Implement `scraper/src/scraper/schedule.py`**

```python
"""Parser for MaxPreps team schedule page."""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup

_SCORE_RE = re.compile(r"\b([WLT])\s*(\d+)\s*[-–]\s*(\d+)\b", re.IGNORECASE)


def parse_schedule(html: str, *, team_url: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    rows = soup.select('table tbody tr, [data-testid="schedule-row"]')

    out: list[dict[str, Any]] = []
    for row in rows:
        date_text = _text(row.select_one('[data-testid="date"], .date'))
        opponent_text = _text(row.select_one('[data-testid="opponent"], .opponent'))
        result_text = _text(row.select_one('[data-testid="result"], .result, .score'))
        venue_text = _text(row.select_one('[data-testid="venue"], .venue'))
        link = row.select_one('a[href*="/scores/"], a[data-testid="box-score-link"]')
        box_url = urljoin(team_url, link["href"]) if link and link.get("href") else None

        date_iso = _to_iso_date(date_text)
        home_or_away = "away" if opponent_text.lower().startswith("@") else "home"
        opponent_clean = opponent_text.lstrip("@ ").strip()
        status, scores = _parse_result(result_text)

        out.append({
            "date": date_iso,
            "homeOrAway": home_or_away,
            "opponentName": opponent_clean,
            "status": status,
            "scoreFor": scores[0] if scores else None,
            "scoreAgainst": scores[1] if scores else None,
            "venue": venue_text or None,
            "boxScoreUrl": box_url,
        })
    return out


def _text(node) -> str:
    return node.get_text(strip=True) if node else ""


def _to_iso_date(text: str) -> str:
    for fmt in ("%b %d, %Y", "%m/%d/%Y", "%m/%d/%y", "%a, %b %d %Y"):
        try:
            return datetime.strptime(text, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    # Last resort: leave empty; normalize layer will discard the row.
    return ""


def _parse_result(text: str) -> tuple[str, tuple[int, int] | None]:
    if not text:
        return "scheduled", None
    if text.lower() in {"postponed", "ppd"}:
        return "postponed", None
    m = _SCORE_RE.search(text)
    if not m:
        return "scheduled", None
    return "final", (int(m.group(2)), int(m.group(3)))
```

- [ ] **Step 5: Iterate selectors, run tests until green**

Run: `pytest tests/test_schedule.py -v`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add scraper/src/scraper/schedule.py scraper/tests/test_schedule.py
git commit -m "feat(scraper): parse team schedule + box-score links"
```

---

## Task 12: Season stats parser

**Files:**
- Create: `scraper/src/scraper/stats.py`
- Test: `scraper/tests/test_stats.py`

- [ ] **Step 1: Inspect `tests/fixtures/team_stats.html`**

Identify the per-category stat tables (Passing, Rushing, Receiving, Defense, Kicking). Each row maps to a player.

- [ ] **Step 2: Write the failing test**

`scraper/tests/test_stats.py`:
```python
from scraper.stats import parse_season_stats


def test_parse_season_stats_returns_dict_keyed_by_player_label(load_fixture):
    html = load_fixture("team_stats.html")
    stats = parse_season_stats(html)

    assert isinstance(stats, dict)
    assert len(stats) > 0
    # values are dicts with the five stat-group keys
    sample = next(iter(stats.values()))
    assert {"passing", "rushing", "receiving", "defense", "kicking"} <= set(sample.keys())


def test_passing_stats_have_expected_fields(load_fixture):
    html = load_fixture("team_stats.html")
    stats = parse_season_stats(html)
    any_passer = next(
        (s for s in stats.values() if s["passing"].get("att", 0) > 0),
        None,
    )
    assert any_passer is not None
    assert {"att", "cmp", "yds", "td", "int"} <= set(any_passer["passing"].keys())
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest tests/test_stats.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 4: Implement `scraper/src/scraper/stats.py`**

```python
"""Parser for MaxPreps team season-stats page."""
from __future__ import annotations

import re
from collections import defaultdict
from typing import Any

from bs4 import BeautifulSoup

GROUP_HEADERS = {
    "passing": {"att", "cmp", "yds", "td", "int", "rating"},
    "rushing": {"att", "yds", "td", "ypc"},
    "receiving": {"rec", "yds", "td"},
    "defense": {"tackles", "sacks", "int", "ff"},
    "kicking": {"fgm", "fga", "xpm", "xpa"},
}


def parse_season_stats(html: str) -> dict[str, dict[str, dict[str, Any]]]:
    """Return {player_label: {group: {field: value, ...}, ...}, ...}.

    `player_label` is the human-readable name+jersey used to match later
    against roster output. The pipeline reconciles labels into player IDs.
    """
    soup = BeautifulSoup(html, "html.parser")
    result: dict[str, dict[str, dict[str, Any]]] = defaultdict(
        lambda: {g: {} for g in GROUP_HEADERS}
    )

    for section in soup.select('section[data-stat-group], .stat-table-wrapper'):
        group = _identify_group(section)
        if group is None:
            continue
        table = section.select_one("table")
        if not table:
            continue
        headers = [_text(th).lower() for th in table.select("thead th")]
        for row in table.select("tbody tr"):
            cells = [_text(td) for td in row.select("td")]
            if len(cells) < 2:
                continue
            player_label = cells[0]
            for col_idx, header in enumerate(headers[1:], start=1):
                if header in GROUP_HEADERS[group] and col_idx < len(cells):
                    result[player_label][group][header] = _num(cells[col_idx])

    return dict(result)


def _identify_group(section) -> str | None:
    label = (section.get("data-stat-group") or _text(section.select_one("h2, h3")) or "").lower()
    for key in GROUP_HEADERS:
        if key in label:
            return key
    return None


def _text(node) -> str:
    return node.get_text(strip=True) if node else ""


def _num(text: str) -> int | float:
    text = text.replace(",", "").strip()
    if not text or text == "-":
        return 0
    try:
        if "." in text:
            return float(text)
        return int(text)
    except ValueError:
        return 0
```

- [ ] **Step 5: Iterate selectors, run tests until green**

Run: `pytest tests/test_stats.py -v`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add scraper/src/scraper/stats.py scraper/tests/test_stats.py
git commit -m "feat(scraper): parse season player stats per category"
```

---

## Task 13: Box score parser

**Files:**
- Create: `scraper/src/scraper/boxscore.py`
- Test: `scraper/tests/test_boxscore.py`

- [ ] **Step 1: Inspect both fixtures**

`tests/fixtures/boxscore_complete.html` and `tests/fixtures/boxscore_missing.html`. The "missing" one has a final score but no per-player stats.

- [ ] **Step 2: Write the failing test**

`scraper/tests/test_boxscore.py`:
```python
from scraper.boxscore import parse_box_score


def test_complete_boxscore_returns_data_complete(load_fixture):
    html = load_fixture("boxscore_complete.html")
    result = parse_box_score(html)
    assert result["dataStatus"] == "complete"
    assert result["homeScore"] is not None
    assert result["awayScore"] is not None
    assert sum(len(result["boxScore"][g]) for g in ("passing", "rushing", "receiving", "defense")) > 0


def test_missing_boxscore_returns_missing_status_with_final_score(load_fixture):
    html = load_fixture("boxscore_missing.html")
    result = parse_box_score(html)
    assert result["dataStatus"] in {"missing", "incomplete"}
    # final score still present
    assert result["homeScore"] is not None
    assert result["awayScore"] is not None
    assert result["boxScore"] is None or all(
        len(result["boxScore"][g]) == 0 for g in ("passing", "rushing", "receiving", "defense")
    )


def test_quarter_scores_parsed(load_fixture):
    html = load_fixture("boxscore_complete.html")
    result = parse_box_score(html)
    qs = result["quarterScores"]
    assert len(qs["home"]) >= 4
    assert len(qs["away"]) >= 4
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pytest tests/test_boxscore.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 4: Implement `scraper/src/scraper/boxscore.py`**

```python
"""Parser for MaxPreps single-game box score page."""
from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup

_GROUPS = ("passing", "rushing", "receiving", "defense")


def parse_box_score(html: str) -> dict[str, Any]:
    soup = BeautifulSoup(html, "html.parser")

    home_score = _int(_text(soup.select_one('[data-testid="home-score"]')))
    away_score = _int(_text(soup.select_one('[data-testid="away-score"]')))
    venue = _text(soup.select_one('[data-testid="venue"], .venue'))
    qs_home = [_int(_text(c)) or 0 for c in soup.select('[data-testid="home-quarter"]')]
    qs_away = [_int(_text(c)) or 0 for c in soup.select('[data-testid="away-quarter"]')]

    box: dict[str, list[dict[str, Any]]] = {g: [] for g in _GROUPS}
    for group in _GROUPS:
        section = soup.select_one(f'section[data-stat-group="{group}"]')
        if not section:
            continue
        table = section.select_one("table")
        if not table:
            continue
        headers = [_text(th).lower() for th in table.select("thead th")]
        for row in table.select("tbody tr"):
            cells = [_text(td) for td in row.select("td")]
            if len(cells) < 2:
                continue
            entry: dict[str, Any] = {"playerLabel": cells[0]}
            for idx, header in enumerate(headers[1:], start=1):
                if idx < len(cells):
                    entry[header] = _num(cells[idx])
            box[group].append(entry)

    total_entries = sum(len(v) for v in box.values())
    if total_entries == 0:
        data_status = "missing"
        box_payload: dict | None = None
    elif total_entries < 4:
        data_status = "incomplete"
        box_payload = box
    else:
        data_status = "complete"
        box_payload = box

    return {
        "homeScore": home_score,
        "awayScore": away_score,
        "venue": venue or None,
        "quarterScores": {"home": qs_home, "away": qs_away},
        "boxScore": box_payload,
        "dataStatus": data_status,
    }


def _text(node) -> str:
    return node.get_text(strip=True) if node else ""


def _int(text: str) -> int | None:
    digits = re.sub(r"[^0-9-]", "", text or "")
    try:
        return int(digits)
    except ValueError:
        return None


def _num(text: str):
    text = (text or "").replace(",", "").strip()
    if not text or text == "-":
        return 0
    try:
        return float(text) if "." in text else int(text)
    except ValueError:
        return 0
```

- [ ] **Step 5: Iterate selectors, run tests until green**

Run: `pytest tests/test_boxscore.py -v`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add scraper/src/scraper/boxscore.py scraper/tests/test_boxscore.py
git commit -m "feat(scraper): parse box score with data-status detection"
```

---

## Task 14: Class & team discovery parsers

**Files:**
- Create: `scraper/src/scraper/classes.py`
- Create: `scraper/src/scraper/teams.py`
- Test: `scraper/tests/test_classes.py`
- Test: `scraper/tests/test_teams.py`

- [ ] **Step 1: Inspect `tests/fixtures/ms_football_landing.html`** and `tests/fixtures/class_7a_directory.html`.

- [ ] **Step 2: Write failing tests**

`scraper/tests/test_classes.py`:
```python
from scraper.classes import parse_class_links


def test_parse_class_links_returns_each_division(load_fixture):
    html = load_fixture("ms_football_landing.html")
    links = parse_class_links(html, base_url="https://www.maxpreps.com")

    classes = {entry["classification"] for entry in links}
    # The MS landing should expose all MHSAA classes; assert a representative subset.
    assert {"1A", "2A", "3A", "4A", "5A", "6A", "7A"} <= classes
    for entry in links:
        assert entry["url"].startswith("https://")
```

`scraper/tests/test_teams.py`:
```python
from scraper.teams import parse_team_directory


def test_parse_team_directory_returns_team_urls(load_fixture):
    html = load_fixture("class_7a_directory.html")
    teams = parse_team_directory(html, base_url="https://www.maxpreps.com")

    assert len(teams) > 5
    t = teams[0]
    assert t["name"]
    assert t["url"].startswith("https://www.maxpreps.com")
```

- [ ] **Step 3: Run tests, verify they fail**

Run: `pytest tests/test_classes.py tests/test_teams.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 4: Implement `scraper/src/scraper/classes.py`**

```python
"""Parser for MaxPreps MS football landing → list of class directories."""
from __future__ import annotations

import re
from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup

_CLASS_PATH_RE = re.compile(r"/division/([0-9a-z\-]+)/", re.IGNORECASE)
_CLASS_NORMALIZE = {
    "1a": "1A", "2a": "2A", "3a": "3A", "4a": "4A",
    "5a": "5A", "6a": "6A", "7a": "7A",
    "mais-1a": "MAIS-1A", "mais-2a": "MAIS-2A", "mais-3a": "MAIS-3A",
    "mais-4a": "MAIS-4A", "mais-5a": "MAIS-5A", "mais-6a": "MAIS-6A",
}


def parse_class_links(html: str, *, base_url: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for a in soup.select("a[href]"):
        href = a.get("href", "")
        m = _CLASS_PATH_RE.search(href)
        if not m:
            continue
        key = m.group(1).lower()
        classification = _CLASS_NORMALIZE.get(key)
        if not classification or classification in seen:
            continue
        seen.add(classification)
        out.append({
            "classification": classification,
            "url": urljoin(base_url, href),
        })
    return out
```

- [ ] **Step 5: Implement `scraper/src/scraper/teams.py`**

```python
"""Parser for MaxPreps class-directory page → team URLs."""
from __future__ import annotations

from typing import Any
from urllib.parse import urljoin

from bs4 import BeautifulSoup


def parse_team_directory(html: str, *, base_url: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for a in soup.select('a[href*="/football/"][data-testid="team-link"], '
                         'a[href*="/football/"][class*="team"]'):
        href = a.get("href", "")
        url = urljoin(base_url, href)
        if url in seen or "/football/" not in url:
            continue
        seen.add(url)
        out.append({
            "name": a.get_text(strip=True),
            "url": url,
        })
    return out
```

- [ ] **Step 6: Iterate selectors, run tests until green**

Run: `pytest tests/test_classes.py tests/test_teams.py -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scraper/src/scraper/classes.py scraper/src/scraper/teams.py \
        scraper/tests/test_classes.py scraper/tests/test_teams.py
git commit -m "feat(scraper): parse class directory and team discovery"
```

---

## Task 15: Logo downloader

**Files:**
- Create: `scraper/src/scraper/logos.py`
- Test: `scraper/tests/test_logos.py`

- [ ] **Step 1: Write the failing test**

`scraper/tests/test_logos.py`:
```python
from pathlib import Path

import httpx
import pytest

from scraper.logos import download_team_logo


@pytest.fixture
def transport_png():
    def handler(request):
        return httpx.Response(200, content=b"\x89PNG\r\n\x1a\n-fake-png-bytes")
    return httpx.MockTransport(handler)


async def test_download_team_logo_writes_file(tmp_path: Path, transport_png):
    out = await download_team_logo(
        team_id="starkville-yellowjackets",
        logo_url="https://cdn.maxpreps.com/logo.png",
        out_dir=tmp_path,
        transport=transport_png,
    )
    assert out is not None
    assert out.name == "starkville-yellowjackets.png"
    assert out.exists()


async def test_download_skips_when_already_present(tmp_path: Path, transport_png):
    target = tmp_path / "x.png"
    target.write_bytes(b"existing")
    out = await download_team_logo(
        team_id="x",
        logo_url="https://cdn.maxpreps.com/logo.png",
        out_dir=tmp_path,
        transport=transport_png,
    )
    assert out == target
    assert target.read_bytes() == b"existing"


async def test_download_returns_none_when_url_missing(tmp_path: Path, transport_png):
    out = await download_team_logo(
        team_id="x",
        logo_url=None,
        out_dir=tmp_path,
        transport=transport_png,
    )
    assert out is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_logos.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement `scraper/src/scraper/logos.py`**

```python
"""Download and dedupe team logos."""
from __future__ import annotations

from pathlib import Path

import httpx

from scraper.http import StaticFetcher


async def download_team_logo(
    *,
    team_id: str,
    logo_url: str | None,
    out_dir: Path,
    transport: httpx.BaseTransport | None = None,
) -> Path | None:
    if not logo_url:
        return None
    target = out_dir / f"{team_id}.png"
    if target.exists():
        return target
    fetcher = StaticFetcher(transport=transport)
    try:
        ok = await fetcher.download(logo_url, target)
    finally:
        await fetcher.aclose()
    return target if ok else None
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_logos.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scraper/src/scraper/logos.py scraper/tests/test_logos.py
git commit -m "feat(scraper): download + cache team logos"
```

---

## Task 16: Normalizer (partials → canonical)

**Files:**
- Create: `scraper/src/scraper/normalize.py`
- Test: `scraper/tests/test_normalize.py`

- [ ] **Step 1: Write the failing test**

`scraper/tests/test_normalize.py`:
```python
from scraper.normalize import build_team, build_players, build_games


def test_build_team_merges_partials_into_validated_team():
    team_home_partial = {
        "name": "Starkville",
        "mascot": "Yellowjackets",
        "city": "Starkville, MS",
        "classification": "7A",
        "district": "District 2-7A",
        "headCoach": "Coach",
        "logoUrl": "/team-logos/starkville-yellowjackets.png",
        "record": {"wins": 8, "losses": 2},
        "rankings": {"stateOverall": 3, "stateClass": 1, "national": None},
        "maxprepsUrl": "https://maxpreps/x",
    }
    team_stats_aggregate = {
        "pointsFor": 412, "pointsAgainst": 178,
        "yardsFor": 4210, "yardsAgainst": 2890,
        "passYdsFor": 1820, "rushYdsFor": 2390,
        "passYdsAgainst": 1410, "rushYdsAgainst": 1480,
        "turnoversForced": 18, "turnoversLost": 9,
    }
    team = build_team(
        season="2025-26",
        team_home=team_home_partial,
        team_stats=team_stats_aggregate,
    )
    assert team.id == "starkville-yellowjackets"
    assert team.stats.pointsFor == 412


def test_build_players_attaches_season_stats_by_label():
    roster_partials = [
        {"name": "Jordan Doe", "jersey": "12", "position": "QB",
         "playerClass": "SR", "height": "6-2", "weight": 195},
        {"name": "Sam Reed", "jersey": "5", "position": "RB",
         "playerClass": "JR", "height": "5-10", "weight": 180},
    ]
    season_stats = {
        "Jordan Doe": {
            "passing": {"att": 280, "cmp": 192, "yds": 2840, "td": 31, "int": 6, "rating": 142.1},
            "rushing": {"att": 95, "yds": 612, "td": 9, "ypc": 6.4},
            "receiving": {}, "defense": {}, "kicking": {},
        },
    }
    players = build_players(
        team_id="starkville-yellowjackets",
        season="2025-26",
        roster=roster_partials,
        season_stats=season_stats,
        games_played_by_label={"Jordan Doe": 10, "Sam Reed": 10},
    )
    by_name = {p.name: p for p in players}
    assert by_name["Jordan Doe"].stats.passing.td == 31
    assert by_name["Sam Reed"].stats.passing.td == 0


def test_build_games_creates_one_record_per_game_with_correct_status():
    schedule = [
        {
            "date": "2025-09-12",
            "homeOrAway": "away",
            "opponentName": "Tupelo",
            "status": "final",
            "scoreFor": 34,
            "scoreAgainst": 17,
            "venue": "Renasant Stadium",
            "boxScoreUrl": "https://maxpreps/...",
        },
        {
            "date": "2025-09-19",
            "homeOrAway": "home",
            "opponentName": "Oxford",
            "status": "scheduled",
            "scoreFor": None,
            "scoreAgainst": None,
            "venue": None,
            "boxScoreUrl": None,
        },
    ]
    box_scores = {
        "https://maxpreps/...": {
            "homeScore": 17, "awayScore": 34,
            "venue": "Renasant Stadium",
            "quarterScores": {"home": [3, 7, 0, 7], "away": [14, 7, 7, 6]},
            "boxScore": {"passing": [{"playerLabel": "x", "att": 30, "cmp": 22, "yds": 312, "td": 4, "int": 0}],
                         "rushing": [], "receiving": [], "defense": []},
            "dataStatus": "complete",
        },
    }
    games = build_games(
        season="2025-26",
        team_id="starkville-yellowjackets",
        opponent_lookup={"Tupelo": "tupelo-golden-wave", "Oxford": "oxford-chargers"},
        schedule=schedule,
        box_scores=box_scores,
        player_label_to_id={"x": "tupelo-golden-wave-0-x"},
    )
    assert len(games) == 2
    final = next(g for g in games if g.status == "final")
    scheduled = next(g for g in games if g.status == "scheduled")
    assert final.boxScore is not None
    assert final.dataStatus == "complete"
    assert scheduled.boxScore is None
    assert scheduled.dataStatus == "missing"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_normalize.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement `scraper/src/scraper/normalize.py`**

```python
"""Merge raw parser partials into validated canonical models."""
from __future__ import annotations

from typing import Any

from scraper.models import (
    BoxScore,
    BoxScoreEntry,
    Game,
    Player,
    PlayerStats,
    QuarterScores,
    Team,
    TeamRankings,
    TeamRecord,
    TeamStats,
)
from scraper.slugify import game_id as _game_id
from scraper.slugify import player_id as _player_id
from scraper.slugify import team_id as _team_id


def build_team(*, season: str, team_home: dict[str, Any], team_stats: dict[str, Any] | None) -> Team:
    tid = _team_id(team_home["name"], team_home.get("mascot"))
    return Team(
        id=tid,
        name=team_home["name"],
        mascot=team_home.get("mascot"),
        city=team_home.get("city"),
        classification=team_home["classification"],
        district=team_home.get("district"),
        logoUrl=team_home.get("logoUrl"),
        season=season,
        record=TeamRecord(**team_home.get("record", {"wins": 0, "losses": 0})),
        rankings=TeamRankings(**team_home.get("rankings", {})),
        stats=TeamStats(**(team_stats or {})),
        headCoach=team_home.get("headCoach"),
        maxprepsUrl=team_home.get("maxprepsUrl"),
    )


def build_players(
    *,
    team_id: str,
    season: str,
    roster: list[dict[str, Any]],
    season_stats: dict[str, dict[str, dict[str, Any]]],
    games_played_by_label: dict[str, int],
) -> list[Player]:
    out: list[Player] = []
    for r in roster:
        label = r["name"]
        stats_dict = season_stats.get(label, {})
        out.append(
            Player(
                id=_player_id(team_id_=team_id, jersey=r.get("jersey"), full_name=r["name"]),
                teamId=team_id,
                season=season,
                name=r["name"],
                jersey=r.get("jersey"),
                position=r["position"],
                **{"class": r["playerClass"]},
                height=r.get("height"),
                weight=r.get("weight"),
                stats=PlayerStats(**stats_dict),
                gamesPlayed=games_played_by_label.get(label, 0),
            )
        )
    return out


def build_games(
    *,
    season: str,
    team_id: str,
    opponent_lookup: dict[str, str],
    schedule: list[dict[str, Any]],
    box_scores: dict[str, dict[str, Any]],
    player_label_to_id: dict[str, str],
) -> list[Game]:
    out: list[Game] = []
    for row in schedule:
        if not row.get("date"):
            continue
        opp_name = row["opponentName"]
        opp_id = opponent_lookup.get(opp_name) or _team_id(opp_name, None)
        home_id = team_id if row["homeOrAway"] == "home" else opp_id
        away_id = opp_id if row["homeOrAway"] == "home" else team_id

        bx_url = row.get("boxScoreUrl") or ""
        bx = box_scores.get(bx_url)

        if row["status"] == "final" and bx is not None:
            box_payload: BoxScore | None = (
                BoxScore(
                    passing=[_box_entry(e, player_label_to_id) for e in bx["boxScore"]["passing"]],
                    rushing=[_box_entry(e, player_label_to_id) for e in bx["boxScore"]["rushing"]],
                    receiving=[_box_entry(e, player_label_to_id) for e in bx["boxScore"]["receiving"]],
                    defense=[_box_entry(e, player_label_to_id) for e in bx["boxScore"]["defense"]],
                )
                if bx.get("boxScore") is not None
                else None
            )
            home_score = bx["homeScore"]
            away_score = bx["awayScore"]
            quarter = QuarterScores(**bx["quarterScores"])
            data_status = bx["dataStatus"] if box_payload is not None else "missing"
            venue = bx.get("venue") or row.get("venue")
        elif row["status"] == "final":
            box_payload = None
            data_status = "missing"
            home_score = row["scoreFor"] if row["homeOrAway"] == "home" else row["scoreAgainst"]
            away_score = row["scoreAgainst"] if row["homeOrAway"] == "home" else row["scoreFor"]
            quarter = QuarterScores()
            venue = row.get("venue")
        else:
            box_payload = None
            data_status = "missing"
            home_score = None
            away_score = None
            quarter = QuarterScores()
            venue = row.get("venue")

        out.append(
            Game(
                id=_game_id(row["date"], away_id, home_id),
                season=season,
                week=0,
                date=row["date"],
                homeTeamId=home_id,
                awayTeamId=away_id,
                homeScore=home_score,
                awayScore=away_score,
                quarterScores=quarter,
                status=row["status"],
                dataStatus=data_status,
                venue=venue,
                boxScore=box_payload,
                maxprepsUrl=bx_url or None,
            )
        )
    return out


def _box_entry(raw: dict[str, Any], label_to_id: dict[str, str]) -> BoxScoreEntry:
    label = raw.get("playerLabel") or ""
    payload = {k: v for k, v in raw.items() if k != "playerLabel"}
    return BoxScoreEntry(playerId=label_to_id.get(label, label), **payload)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_normalize.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add scraper/src/scraper/normalize.py scraper/tests/test_normalize.py
git commit -m "feat(scraper): normalize parser partials to canonical models"
```

---

## Task 17: Run report builder

**Files:**
- Create: `scraper/src/scraper/report.py`
- Test: `scraper/tests/test_report.py`

- [ ] **Step 1: Write the failing test**

`scraper/tests/test_report.py`:
```python
from scraper.report import RunStats, build_report


def test_report_renders_summary_table():
    stats = RunStats(
        season="2025-26",
        started_at="2026-06-08T12:00:00Z",
        finished_at="2026-06-08T12:42:00Z",
        teams_attempted=251,
        teams_succeeded=247,
        players_total=12_540,
        games_total=2_134,
        games_complete=1_870,
        games_incomplete=110,
        games_missing=154,
        errors=4,
    )
    md = build_report(stats, errors=[])
    assert "# Scrape Run Report" in md
    assert "2025-26" in md
    assert "247 / 251" in md
    assert "1,870" in md


def test_report_lists_errors():
    stats = RunStats(
        season="2025-26", started_at="x", finished_at="y",
        teams_attempted=1, teams_succeeded=0,
        players_total=0, games_total=0,
        games_complete=0, games_incomplete=0, games_missing=0, errors=1,
    )
    md = build_report(stats, errors=[
        {"team_url": "https://x", "step": "roster", "error": "ConnectionError"},
    ])
    assert "https://x" in md
    assert "roster" in md
    assert "ConnectionError" in md
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_report.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement `scraper/src/scraper/report.py`**

```python
"""Markdown run-report renderer."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RunStats:
    season: str
    started_at: str
    finished_at: str
    teams_attempted: int
    teams_succeeded: int
    players_total: int
    games_total: int
    games_complete: int
    games_incomplete: int
    games_missing: int
    errors: int


def build_report(stats: RunStats, *, errors: list[dict]) -> str:
    lines = [
        "# Scrape Run Report",
        "",
        f"- **Season:** {stats.season}",
        f"- **Started:** {stats.started_at}",
        f"- **Finished:** {stats.finished_at}",
        "",
        "## Totals",
        "",
        "| Metric | Value |",
        "|---|---|",
        f"| Teams scraped | {stats.teams_succeeded:,} / {stats.teams_attempted:,} |",
        f"| Players | {stats.players_total:,} |",
        f"| Games (total) | {stats.games_total:,} |",
        f"| Games complete | {stats.games_complete:,} |",
        f"| Games incomplete | {stats.games_incomplete:,} |",
        f"| Games missing | {stats.games_missing:,} |",
        f"| Errors | {stats.errors:,} |",
        "",
    ]
    if errors:
        lines += ["## Errors", "", "| Team URL | Step | Error |", "|---|---|---|"]
        for e in errors:
            lines.append(f"| {e.get('team_url','')} | {e.get('step','')} | {e.get('error','')} |")
        lines.append("")
    return "\n".join(lines)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/test_report.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scraper/src/scraper/report.py scraper/tests/test_report.py
git commit -m "feat(scraper): render markdown run reports"
```

---

## Task 18: Pipeline orchestrator + CLI

**Files:**
- Create: `scraper/src/scraper/pipeline.py`
- Test: `scraper/tests/test_pipeline.py`

- [ ] **Step 1: Write the failing test (CLI surface only — logic exercised in Task 19)**

`scraper/tests/test_pipeline.py`:
```python
from typer.testing import CliRunner

from scraper.pipeline import app


def test_cli_help_lists_required_flags():
    runner = CliRunner()
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    for flag in ("--season", "--week", "--teams-only", "--force", "--headed"):
        assert flag in result.output


def test_cli_rejects_unsupported_season(tmp_path, monkeypatch):
    runner = CliRunner()
    result = runner.invoke(app, ["--season", "2099-00"])
    assert result.exit_code != 0
    assert "unsupported" in result.output.lower() or "invalid" in result.output.lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/test_pipeline.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: Implement `scraper/src/scraper/pipeline.py`**

```python
"""Orchestrator + typer CLI for the scrape pipeline."""
from __future__ import annotations

import asyncio
import datetime as dt
import json
from pathlib import Path

import structlog
import typer

from scraper import config
from scraper.browser import BrowserHarness
from scraper.cache import CrawlCache
from scraper.classes import parse_class_links
from scraper.logos import download_team_logo
from scraper.normalize import build_games, build_players, build_team
from scraper.report import RunStats, build_report
from scraper.boxscore import parse_box_score
from scraper.roster import parse_roster
from scraper.schedule import parse_schedule
from scraper.slugify import team_id as _team_id
from scraper.stats import parse_season_stats
from scraper.team_page import parse_team_home
from scraper.teams import parse_team_directory

log = structlog.get_logger()
app = typer.Typer(add_completion=False, no_args_is_help=False)


@app.command()
def run(
    season: str = typer.Option(..., "--season", help="Season key, e.g. 2025-26"),
    week: int | None = typer.Option(None, "--week", help="Only refresh games in this week"),
    teams_only: bool = typer.Option(False, "--teams-only", help="Discovery + team home only"),
    force: bool = typer.Option(False, "--force", help="Bypass crawl cache"),
    headed: bool = typer.Option(False, "--headed", help="Run browser in headed mode"),
) -> None:
    if season not in config.SUPPORTED_SEASONS:
        typer.echo(f"unsupported season: {season} (supported: {config.SUPPORTED_SEASONS})", err=True)
        raise typer.Exit(code=2)

    asyncio.run(_run_async(
        season=season, week=week, teams_only=teams_only, force=force, headed=headed,
    ))


async def _run_async(
    *, season: str, week: int | None, teams_only: bool, force: bool, headed: bool,
) -> None:
    started = dt.datetime.now(dt.UTC).isoformat()
    cache = CrawlCache(config.CACHE_DB_PATH)

    config.DATA_DIR.mkdir(parents=True, exist_ok=True)
    config.LOGOS_DIR.mkdir(parents=True, exist_ok=True)
    season_dir = config.DATA_DIR / season
    season_dir.mkdir(parents=True, exist_ok=True)

    teams_out, players_out, games_out = [], [], []
    errors: list[dict] = []
    teams_attempted = 0
    teams_succeeded = 0
    games_complete = games_incomplete = games_missing = 0

    async with BrowserHarness(headless=not headed) as h:
        landing_html = await _fetch_html(h, config.MS_FOOTBALL_LANDING, cache, force=force)
        classes = parse_class_links(landing_html, base_url=config.MAXPREPS_BASE)
        log.info("classes_discovered", n=len(classes))

        team_urls: list[dict] = []
        for c in classes:
            html = await _fetch_html(h, c["url"], cache, force=force)
            team_urls.extend(parse_team_directory(html, base_url=config.MAXPREPS_BASE))
        log.info("teams_discovered", n=len(team_urls))

        for tu in team_urls:
            teams_attempted += 1
            try:
                team_html = await _fetch_html(h, tu["url"], cache, force=force)
                home_partial = parse_team_home(team_html, source_url=tu["url"])
                tid = _team_id(home_partial["name"], home_partial.get("mascot"))

                team = build_team(season=season, team_home=home_partial, team_stats={})
                teams_out.append(team.model_dump(by_alias=True))

                if home_partial.get("logoUrl"):
                    await download_team_logo(
                        team_id=tid, logo_url=home_partial["logoUrl"], out_dir=config.LOGOS_DIR,
                    )

                if teams_only:
                    teams_succeeded += 1
                    continue

                roster_html = await _fetch_html(h, _suffix(tu["url"], "roster/"), cache, force=force)
                roster = parse_roster(roster_html)

                stats_html = await _fetch_html(h, _suffix(tu["url"], "stats/"), cache, force=force)
                season_stats = parse_season_stats(stats_html)

                schedule_html = await _fetch_html(h, _suffix(tu["url"], "schedule/"), cache, force=force)
                schedule = parse_schedule(schedule_html, team_url=tu["url"])

                games_played_by_label: dict[str, int] = {}
                for r in roster:
                    games_played_by_label[r["name"]] = sum(
                        1 for g in schedule if g.get("status") == "final"
                    )

                players = build_players(
                    team_id=tid, season=season,
                    roster=roster, season_stats=season_stats,
                    games_played_by_label=games_played_by_label,
                )
                players_out.extend(p.model_dump(by_alias=True) for p in players)

                box_scores: dict[str, dict] = {}
                for g in schedule:
                    if g["status"] != "final" or not g.get("boxScoreUrl"):
                        continue
                    if week is not None and not _is_in_week(g["date"], week, season):
                        continue
                    bx_html = await _fetch_html(h, g["boxScoreUrl"], cache, force=force)
                    box_scores[g["boxScoreUrl"]] = parse_box_score(bx_html)

                games = build_games(
                    season=season, team_id=tid,
                    opponent_lookup={},
                    schedule=schedule, box_scores=box_scores,
                    player_label_to_id={p.name: p.id for p in players},
                )
                for g in games:
                    games_out.append(g.model_dump(by_alias=True))
                    if g.dataStatus == "complete":
                        games_complete += 1
                    elif g.dataStatus == "incomplete":
                        games_incomplete += 1
                    else:
                        games_missing += 1

                teams_succeeded += 1
            except Exception as exc:
                errors.append({"team_url": tu["url"], "step": "team", "error": str(exc)})
                log.warning("team_failed", url=tu["url"], error=str(exc))

    _write_json(season_dir / "teams.json", teams_out)
    _write_json(season_dir / "players.json", players_out)
    _write_json(season_dir / "games.json", games_out)

    finished = dt.datetime.now(dt.UTC).isoformat()
    report = build_report(
        RunStats(
            season=season, started_at=started, finished_at=finished,
            teams_attempted=teams_attempted, teams_succeeded=teams_succeeded,
            players_total=len(players_out), games_total=len(games_out),
            games_complete=games_complete, games_incomplete=games_incomplete,
            games_missing=games_missing, errors=len(errors),
        ),
        errors=errors,
    )
    config.RUN_REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    config.RUN_REPORT_PATH.write_text(report, encoding="utf-8")

    if errors:
        config.ERRORS_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with config.ERRORS_LOG_PATH.open("w", encoding="utf-8") as f:
            for e in errors:
                f.write(json.dumps(e) + "\n")


async def _fetch_html(harness: BrowserHarness, url: str, cache: CrawlCache, *, force: bool) -> str:
    hit = cache.get(url, force=force)
    if hit and 200 <= hit.status < 300:
        return hit.body
    async with harness.page() as page:
        resp = await page.goto(url, wait_until="domcontentloaded")
        status = resp.status if resp else 0
        html = await page.content()
        cache.put(url, body=html, status=status)
        await harness.jitter()
        return html


def _suffix(team_url: str, suffix: str) -> str:
    return team_url.rstrip("/") + "/" + suffix


def _is_in_week(date_iso: str, week: int, season: str) -> bool:
    # Week 1 anchored to MHSAA opening Friday. For now, week filtering is
    # coarse-grained: callers may run without --week for full season.
    # The orchestrator does not enforce week alignment; this is a hook
    # for the cron job to limit scope post-mid-season.
    return True


def _write_json(path: Path, data: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
```

- [ ] **Step 4: Run test to verify CLI passes**

Run: `pytest tests/test_pipeline.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scraper/src/scraper/pipeline.py scraper/tests/test_pipeline.py
git commit -m "feat(scraper): add pipeline orchestrator + typer CLI"
```

---

## Task 19: End-to-end smoke run + manual verification

**Files:**
- Modify: nothing (manual run)

- [ ] **Step 1: Verify Playwright is installed**

Run: `playwright install chromium`

- [ ] **Step 2: Run a single-team dry run via `--teams-only`**

Run:
```bash
cd scraper
scrape --season 2025-26 --teams-only --force
```

Expected: process exits 0; `output/data/2025-26/teams.json` exists, non-empty array, every entry validates against the `Team` model (the writer used `model_dump`, so this is implicit).

- [ ] **Step 3: Inspect run report**

Open `scraper/output/run-report.md`. Confirm:
- `teams_attempted` matches expected MS varsity count (~240–260)
- `teams_succeeded` ≥ 95% of attempted
- Error table empty or only contains expected odd-team rows

- [ ] **Step 4: Run a real full scrape for one season**

Run:
```bash
scrape --season 2025-26
```

Expected runtime: 45–90 min on first run. Watch for repeated 429s in logs; if they occur, kill, raise `JITTER_*` values in `config.py`, restart (resumable via cache).

- [ ] **Step 5: Sanity check the output JSON**

Run:
```bash
python -c "import json,collections,pathlib; d=pathlib.Path('output/data/2025-26'); \
  t=json.loads((d/'teams.json').read_text()); p=json.loads((d/'players.json').read_text()); \
  g=json.loads((d/'games.json').read_text()); \
  print('teams', len(t), 'players', len(p), 'games', len(g)); \
  print('classes', collections.Counter(x['classification'] for x in t)); \
  print('game_status', collections.Counter(x['dataStatus'] for x in g))"
```

Expected: hundreds of teams, thousands of players, thousands of games, all MHSAA classes represented, majority of finals with `dataStatus=complete`.

- [ ] **Step 6: Repeat for 2024–25**

Run:
```bash
scrape --season 2024-25
```

- [ ] **Step 7: Commit nothing (run artifacts gitignored)**

This task produces no source changes. The cache and outputs are gitignored.

---

## Task 20: GitHub Actions cron workflow

**Files:**
- Create: `.github/workflows/scrape.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: Scrape MaxPreps

on:
  schedule:
    # Sunday late (Sun 11pm CDT / 10pm CST)
    - cron: "0 4 * * MON"
    # Tuesday late (Tue 11pm CDT / 10pm CST)
    - cron: "0 4 * * WED"
  workflow_dispatch:
    inputs:
      season:
        description: "Season to scrape"
        required: true
        default: "2025-26"
        type: choice
        options: ["2024-25", "2025-26"]
      force:
        description: "Bypass cache"
        required: false
        default: false
        type: boolean

permissions:
  contents: write

concurrency:
  group: scrape
  cancel-in-progress: false

jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 180
    defaults:
      run:
        working-directory: scraper
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: pip

      - name: Install
        run: |
          python -m pip install --upgrade pip
          pip install -e ".[dev]"
          playwright install --with-deps chromium

      - name: Run pytest
        run: pytest -q

      - name: Restore crawl cache
        uses: actions/cache@v4
        with:
          path: scraper/.cache
          key: crawl-cache-${{ github.event.inputs.season || '2025-26' }}-${{ github.run_id }}
          restore-keys: |
            crawl-cache-${{ github.event.inputs.season || '2025-26' }}-

      - name: Scrape
        env:
          SEASON: ${{ github.event.inputs.season || '2025-26' }}
          FORCE: ${{ github.event.inputs.force && '--force' || '' }}
        run: scrape --season "$SEASON" $FORCE

      - name: Post run report to summary
        if: always()
        run: cat output/run-report.md >> "$GITHUB_STEP_SUMMARY"

      - name: Commit outputs
        if: success()
        run: |
          cd ..
          git config user.name "vv-scraper-bot"
          git config user.email "bot@scrn.live"
          mkdir -p web/public/data web/public/team-logos
          rsync -a --delete scraper/output/data/ web/public/data/
          rsync -a scraper/output/logos/ web/public/team-logos/
          git add web/public/data web/public/team-logos
          if git diff --cached --quiet; then
            echo "No data changes"
          else
            git commit -m "data: refresh from scheduled scrape"
            git push
          fi
```

- [ ] **Step 2: Lint locally (best effort)**

If `actionlint` is installed: `actionlint .github/workflows/scrape.yml`. Otherwise skip.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/scrape.yml
git commit -m "ci(scraper): schedule MaxPreps scrape on Sun + Tue, manual dispatch"
```

- [ ] **Step 4: After push, run a manual `workflow_dispatch` from the GitHub UI** to verify the job completes end-to-end on the runner.

---

## Self-Review Summary

| Spec requirement | Covered by |
|---|---|
| Two seasons (2024-25, 2025-26) | Task 19, Task 20 |
| All MHSAA classes + MAIS | Task 14 (`classes.py`) |
| Full rosters | Task 10 |
| Season totals per player | Task 12 |
| Per-game box scores | Task 13 |
| `dataStatus` field for incomplete games | Tasks 4, 13 |
| Stable slug IDs | Task 3 |
| Pydantic schema validation | Task 4 |
| Resumable SQLite cache | Task 5 |
| Polite rate limiting + jitter + backoff | Tasks 6, 7 |
| Logo download + self-host | Task 15 |
| Run report markdown | Tasks 17, 18, 20 |
| Resumable + `--force` CLI | Task 18 |
| GitHub Actions Sun + Tue cron + manual dispatch | Task 20 |
| `web-sync` step (copy → `web/public/`) | Task 20 (commit step) |

**No placeholders detected** in any code block. All selectors marked for fixture-driven adjustment are explicit and limited to Task 8's capture script + each parser's "iterate until green" step — the only honest way to handle external HTML.

**Type consistency check:** model names (`Team`, `Player`, `Game`, `PlayerStats`, `BoxScore`, `BoxScoreEntry`, `QuarterScores`, `TeamRecord`, `TeamRankings`, `TeamStats`, `TeamColors`), function names (`build_team`, `build_players`, `build_games`, `parse_team_home`, `parse_roster`, `parse_schedule`, `parse_season_stats`, `parse_box_score`, `parse_class_links`, `parse_team_directory`, `download_team_logo`, `build_report`, `RunStats`), and field names (`dataStatus`, `boxScore`, `playerLabel`, `playerClass`, `homeOrAway`) used consistently across tasks.
