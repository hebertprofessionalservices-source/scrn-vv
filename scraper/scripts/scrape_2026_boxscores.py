"""Pull per-game player stats for a 2026-27 game day into games.json + players.json.

MaxPreps' modern game page carries a full box score behind `&tab=Stats`, which
the legacy `parse_box_score` (ASPX `table.boxscore`) cannot read. Two quirks
drive the design here:

  * Stats are entered per team by that team's own coach, so one side of a game
    can have a full box score while the other has nothing at all.
  * The page shows one team at a time behind a client-side toggle with no URL
    parameter, so both sides must be clicked through in a real browser.

Player season totals are recomputed from scratch out of every box score in
games.json on each run, so re-running a date is idempotent.

Usage:
    .venv/Scripts/python scripts/scrape_2026_boxscores.py --date 2026-08-14
    .venv/Scripts/python scripts/scrape_2026_boxscores.py --date 2026-08-14 --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import contextlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from bs4 import BeautifulSoup  # noqa: E402

from scraper import slugify as slug_mod  # noqa: E402
from scraper.browser import BrowserHarness  # noqa: E402

SEASON = "2026-27"
OUT_DIRS = [
    ROOT / "output" / "data" / SEASON,
    ROOT.parent / "web" / "public" / "data" / SEASON,
]
WEB_DIR = ROOT.parent / "web" / "public" / "data" / SEASON

CONTEST_RE = re.compile(r"[?&]c=([\w-]+)")
CLASS_RE = re.compile(r"\((Fr|So|Jr|Sr)\)")

# Tables are identified by their column signature, never by position: the
# All-Purpose / Total Yards / Touchdowns tables repeat "Rushing Yards" etc. and
# would double-count if every matching column were merged blindly.
SIGNATURES: dict[str, set[str]] = {
    "passing": {"Completions", "Passing Att"},
    "rushing": {"Carries"},
    "receiving": {"Receptions"},
    "kicking": {"PAT Kicking Made"},
    "defense": {"Tackles"},
}
COLUMNS: dict[str, dict[str, str]] = {
    "passing": {
        "Completions": "cmp", "Passing Att": "att", "Passing Yards": "yds",
        "Passing TDs": "td", "Passing Int": "int",
    },
    "rushing": {"Carries": "att", "Rushing Yards": "yds", "Rushing TDs": "td"},
    "receiving": {"Receptions": "rec", "Receiving Yards": "yds", "Receiving TDs": "td"},
    "kicking": {
        "PAT Kicking Made": "xpm", "PAT Kicking Att": "xpa",
        "FG Made": "fgm", "FG Attempted": "fga",
    },
    "defense": {
        "Tackles": "tackles", "Total Tackles": "tackles", "Sacks": "sacks",
        "Interceptions": "int", "Forced Fumbles": "ff",
    },
}
ENTRY_FIELDS = (
    "cmp", "att", "yds", "td", "int", "rec", "tackles", "sacks", "ff",
    "fgm", "fga", "xpm", "xpa",
)


def contest_id(url: str | None) -> str | None:
    m = CONTEST_RE.search(url or "")
    return m.group(1) if m else None


def num(text: str) -> float | int | None:
    s = (text or "").strip().replace(",", "")
    if s in ("", "-", "--", "—"):
        return None
    try:
        return float(s) if "." in s else int(s)
    except ValueError:
        return None


def normalize_name(name: str) -> str:
    """Lowercase, strip punctuation and generational suffixes."""
    n = re.sub(r"[^a-z ]", "", (name or "").lower())
    n = re.sub(r"\b(jr|sr|ii|iii|iv)\b", "", n)
    return " ".join(n.split())


def initial_form(name: str) -> str:
    """"kaden bruce" -> "k bruce"; box scores abbreviate the first name."""
    parts = normalize_name(name).split()
    return f"{parts[0][0]} {parts[-1]}" if len(parts) >= 2 else normalize_name(name)


def parse_stats_tables(html: str) -> dict[str, list[dict[str, Any]]]:
    """Return {group: [{jersey, name, cls, <fields>}]} for the visible team."""
    soup = BeautifulSoup(html, "html.parser")
    out: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for table in soup.find_all("table"):
        titles = [th.get("title") or "" for th in table.select("thead th")]
        tset = set(titles)
        group = next((g for g, sig in SIGNATURES.items() if sig <= tset), None)
        if not group:
            continue
        colmap = COLUMNS[group]
        for tr in table.select("tbody tr"):
            cells = [td.get_text(" ", strip=True) for td in tr.find_all(["td", "th"])]
            if len(cells) != len(titles):
                continue
            row = dict(zip(titles, cells, strict=True))
            raw_name = row.get("Name", "")
            if not raw_name or raw_name.lower().startswith("team total"):
                continue
            m = CLASS_RE.search(raw_name)
            entry: dict[str, Any] = {
                "jersey": (row.get("#") or "").strip(),
                "name": CLASS_RE.sub("", raw_name).strip(),
                "cls": m.group(1) if m else "",
            }
            for title, field in colmap.items():
                if title in row:
                    v = num(row[title])
                    if v is not None:
                        entry[field] = v
            if any(f in entry for f in ENTRY_FIELDS):
                out[group].append(entry)
    return dict(out)


def to_box_entries(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Shape parsed rows like the 2025-26 BoxScoreEntry records."""
    entries = []
    for r in rows:
        e: dict[str, Any] = {"playerId": f"{r['name']}({r['cls']})"}
        for f in ENTRY_FIELDS:
            e[f] = r.get(f)
        entries.append(e)
    return entries


def _signature(groups: dict[str, list[dict[str, Any]]]) -> str:
    """Stable fingerprint of a parsed team's stat rows, for staleness checks."""
    return json.dumps(groups, sort_keys=True)


@contextlib.asynccontextmanager
async def browser_or_none(skip: bool):
    """Launch Chromium only when there is actually something to crawl."""
    if skip:
        print("[rebuild-only] reusing stored box scores, no crawl\n", flush=True)
        yield None
        return
    async with BrowserHarness(headless=True) as harness:
        yield harness


async def dismiss_consent(page, timeout: int = 6000) -> str:
    """Decline non-essential cookies so the banner stops eating clicks.

    The banner renders a beat *after* networkidle, so querying for it
    immediately finds nothing and it then appears on top of the team toggle and
    silently swallows the click — the button never activates and the previous
    team's tables get read twice. Wait for it rather than probing once.
    """
    try:
        reject = await page.wait_for_selector('button:has-text("Reject")', timeout=timeout)
    except Exception:  # noqa: BLE001
        return "absent"
    try:
        await reject.click(timeout=5000)
        await page.wait_for_timeout(800)
        return "declined"
    except Exception as exc:  # noqa: BLE001
        return f"FAILED ({type(exc).__name__})"


async def activate(page, sel: str) -> bool:
    """Click a team-toggle button and report whether it actually took."""
    btn = await page.query_selector(sel)
    if btn is None:
        return False
    with contextlib.suppress(Exception):
        await btn.click(timeout=5000)
    with contextlib.suppress(Exception):
        await page.wait_for_selector(f'{sel}[data-active="true"]', timeout=8000)
    await page.wait_for_timeout(1200)
    fresh = await page.query_selector(sel)
    return bool(fresh) and await fresh.get_attribute("data-active") == "true"


async def scrape_game(harness: BrowserHarness, url: str) -> dict[str, dict]:
    """Return {teamLabel: parsed groups} for both sides of one contest.

    The team switch is client-side with no URL parameter, so each side has to be
    clicked. Parsing straight after the click reads the *previous* team's tables
    — they are still in the DOM until React re-renders — so wait for the button
    to actually report itself active, then verify the parse changed.
    """
    result: dict[str, dict] = {}
    async with harness.page() as page:
        await page.goto(f"{url}&tab=Stats", wait_until="domcontentloaded")
        with contextlib.suppress(Exception):
            await page.wait_for_load_state("networkidle", timeout=15_000)

        dismissed = await dismiss_consent(page)

        labels = []
        for b in await page.query_selector_all("button[aria-label]"):
            if await b.get_attribute("data-active") is not None:
                labels.append(await b.get_attribute("aria-label"))

        previous: str | None = None
        for label in labels:
            sel = f'button[aria-label="{label}"]'
            btn = await page.query_selector(sel)
            if btn is None:
                continue
            if await btn.get_attribute("data-active") == "false":
                active = await activate(page, sel)
                if not active:
                    # A banner that rendered late is the usual cause; clear it
                    # and try once more before giving up on this side.
                    dismissed = await dismiss_consent(page, timeout=3000)
                    active = await activate(page, sel)
                if not active:
                    # Never trust the parse in this state — an unswitched toggle
                    # re-reads the previous team's tables.
                    print(f"      ! {label}: toggle did not activate "
                          f"(consent banner: {dismissed}) — skipping side", flush=True)
                    result[label] = {}
                    continue
            groups = parse_stats_tables(await page.content())
            sig = _signature(groups)
            # Identical non-empty parses mean the re-render hadn't landed; retry
            # once rather than silently double-counting one team's stats.
            if previous is not None and sig == previous and groups:
                await page.wait_for_timeout(3000)
                groups = parse_stats_tables(await page.content())
                sig = _signature(groups)
                if sig == previous:
                    print(f"      ! {label}: identical to previous team, treating as empty",
                          flush=True)
                    groups = {}
            previous = sig
            result[label] = groups
    await harness.jitter()
    return result


def match_label_to_team(label: str, candidates: list[dict]) -> dict | None:
    """Map "St. Joseph (Greenville)" to one of the contest's two teams."""
    school = normalize_name(re.sub(r"\(.*?\)", "", label))
    city = (re.search(r"\((.*?)\)", label) or [None, ""])[1]
    best, best_score = None, 0
    for t in candidates:
        tname = normalize_name(t["name"])
        mascot = normalize_name(t.get("mascot") or "")
        base = tname
        if mascot and tname.endswith(mascot):
            base = tname[: len(tname) - len(mascot)].strip()
        score = 0
        if base and (base == school or school.startswith(base) or base.startswith(school)):
            score += 2
        if city and normalize_name(city) == normalize_name(t.get("city") or ""):
            score += 1
        if score > best_score:
            best, best_score = t, score
    return best if best_score >= 2 else None


def build_resolver(teams: dict):
    """Mirror the site's alias resolution (web/lib/data.ts + team-format.ts).

    Rows carry one canonical team id and one mascot-less MaxPreps slug
    ("st-joseph"), so the slug side has to be resolved before a box score can be
    attributed to the right roster.
    """
    alias: dict[str, str] = {}
    ambiguous: set[str] = set()
    for t in teams.values():
        name, mascot = t["name"], t.get("mascot")
        if mascot and name.lower().endswith(mascot.lower()):
            name = name[: len(name) - len(mascot)]
        a = slug_mod.slugify(name.strip())
        if a in alias and alias[a] != t["id"]:
            ambiguous.add(a)
        else:
            alias[a] = t["id"]
    for a in ambiguous:
        alias.pop(a, None)

    def resolve(side: str) -> str | None:
        return side if side in teams else alias.get(side)

    return resolve


def rebuild_player_stats(games: list[dict], players: list[dict], teams: dict) -> tuple[int, int]:
    """Recompute every player's season totals from all box scores in games.json."""
    for p in players:
        p["stats"] = {
            "passing": {"att": 0, "cmp": 0, "yds": 0, "td": 0, "int": 0, "rating": 0.0},
            "rushing": {"att": 0, "yds": 0, "td": 0, "ypc": 0.0},
            "receiving": {"rec": 0, "yds": 0, "td": 0},
            "defense": {"tackles": 0, "sacks": 0.0, "int": 0, "ff": 0},
            "kicking": {"fgm": 0, "fga": 0, "xpm": 0, "xpa": 0},
        }
        p["gamesPlayed"] = 0

    # name index per team, for the initial-form join ("K. Bruce" -> "Kaden Bruce")
    index: dict[str, dict[str, list[dict]]] = defaultdict(lambda: defaultdict(list))
    for p in players:
        for form in {normalize_name(p["name"]), initial_form(p["name"])}:
            index[p["teamId"]][form].append(p)

    # Both perspective rows of a contest are needed to learn both canonical
    # team ids, so collect sides across the whole contest before attributing.
    resolve = build_resolver(teams)
    contest_sides: dict[str, set[str]] = defaultdict(set)
    for g in games:
        cid = contest_id(g.get("maxprepsUrl")) or g["id"]
        for side in (g["homeTeamId"], g["awayTeamId"]):
            tid = resolve(side)
            if tid:
                contest_sides[cid].add(tid)

    seen_contests: set[str] = set()
    matched = unmatched = 0
    appearances: dict[str, set[str]] = defaultdict(set)
    for g in games:
        bs = g.get("boxScore")
        cid = contest_id(g.get("maxprepsUrl")) or g["id"]
        if not bs or cid in seen_contests:
            continue
        seen_contests.add(cid)
        sides = sorted(contest_sides.get(cid, set()))
        for group in ("passing", "rushing", "receiving", "defense"):
            for e in bs.get(group) or []:
                nm = normalize_name(re.sub(r"\(.*?\)", "", e["playerId"]))
                hits: list[dict] = []
                for tid in sides:
                    hits += index[tid].get(nm, []) or index[tid].get(initial_form(nm), [])
                if len(hits) != 1:
                    unmatched += 1
                    continue
                p = hits[0]
                matched += 1
                appearances[p["id"]].add(cid or g["id"])
                st = p["stats"]
                if group == "passing":
                    st["passing"]["cmp"] += e.get("cmp") or 0
                    st["passing"]["att"] += e.get("att") or 0
                    st["passing"]["yds"] += e.get("yds") or 0
                    st["passing"]["td"] += e.get("td") or 0
                    st["passing"]["int"] += e.get("int") or 0
                elif group == "rushing":
                    st["rushing"]["att"] += e.get("att") or 0
                    st["rushing"]["yds"] += e.get("yds") or 0
                    st["rushing"]["td"] += e.get("td") or 0
                elif group == "receiving":
                    st["receiving"]["rec"] += e.get("rec") or 0
                    st["receiving"]["yds"] += e.get("yds") or 0
                    st["receiving"]["td"] += e.get("td") or 0
                else:
                    st["defense"]["tackles"] += e.get("tackles") or 0
                    st["defense"]["sacks"] += e.get("sacks") or 0
                    st["defense"]["int"] += e.get("int") or 0
                    st["defense"]["ff"] += e.get("ff") or 0

    for p in players:
        st = p["stats"]
        p["gamesPlayed"] = len(appearances.get(p["id"], ()))
        if st["rushing"]["att"]:
            st["rushing"]["ypc"] = round(st["rushing"]["yds"] / st["rushing"]["att"], 1)
        a, c = st["passing"]["att"], st["passing"]["cmp"]
        if a:
            y, td, i = st["passing"]["yds"], st["passing"]["td"], st["passing"]["int"]
            # NFHS/NCAA passer rating, the same formula MaxPreps publishes.
            st["passing"]["rating"] = round(
                (8.4 * y + 330 * td - 200 * i + 100 * c) / a, 1
            )
    return matched, unmatched


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", required=True)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--rebuild-only", action="store_true",
                    help="skip crawling; just recompute season totals from stored box scores")
    args = ap.parse_args()

    games = json.loads((WEB_DIR / "games.json").read_text(encoding="utf-8"))
    players = json.loads((WEB_DIR / "players.json").read_text(encoding="utf-8"))
    teams = {t["id"]: t for t in json.loads((WEB_DIR / "teams.json").read_text(encoding="utf-8"))}

    contests: dict[str, list[dict]] = defaultdict(list)
    for g in games:
        if g["date"][:10] == args.date and g["status"] == "final":
            cid = contest_id(g.get("maxprepsUrl"))
            if cid:
                contests[cid].append(g)
    print(f"{len(contests)} final contests on {args.date}\n", flush=True)

    with_stats: list[str] = []
    without: list[str] = []
    async with browser_or_none(args.rebuild_only) as h:
        for _cid, rows in ({} if args.rebuild_only else contests).items():
            g = rows[0]
            sides = [teams[t] for t in (g["awayTeamId"], g["homeTeamId"]) if t in teams]
            label = f"{g['awayTeamId']} at {g['homeTeamId']}"
            try:
                scraped = await scrape_game(h, g["maxprepsUrl"])
            except Exception as exc:  # noqa: BLE001
                print(f"  ERROR {label}: {exc}", flush=True)
                without.append(label)
                continue

            box: dict[str, list] = {"passing": [], "rushing": [], "receiving": [], "defense": []}
            teams_with_data = []
            for team_label, groups in scraped.items():
                if not groups:
                    continue
                t = match_label_to_team(team_label, sides)
                teams_with_data.append(t["name"] if t else team_label)
                for group in ("passing", "rushing", "receiving", "defense"):
                    box[group].extend(to_box_entries(groups.get(group, [])))

            n = sum(len(v) for v in box.values())
            if n == 0:
                without.append(label)
                print(f"  --  {label}: no stats", flush=True)
                continue
            with_stats.append(label)
            status = "complete" if len(teams_with_data) == 2 else "incomplete"
            for row in rows:
                row["boxScore"] = box
                row["dataStatus"] = status
            print(f"  OK  {label}: {n} stat lines [{status}] "
                  f"from {', '.join(teams_with_data)}", flush=True)

    matched, unmatched = rebuild_player_stats(games, players, teams)
    print(f"\nplayer join: {matched} stat lines matched to roster players, {unmatched} unmatched")
    if not args.rebuild_only:
        print(f"games with stats: {len(with_stats)} / {len(contests)}")

    if args.dry_run:
        print("\n[dry-run] nothing written")
        return
    for d in OUT_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        (d / "games.json").write_text(json.dumps(games, indent=2), encoding="utf-8")
        (d / "players.json").write_text(json.dumps(players, indent=2), encoding="utf-8")
    print(f"wrote games.json + players.json to {len(OUT_DIRS)} dirs")


asyncio.run(main())
