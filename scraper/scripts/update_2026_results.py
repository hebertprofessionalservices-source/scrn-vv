"""Pull final scores for one game day into the 2026-27 dataset.

Discovers the day's slate from the MaxPreps state scoreboard (which includes
games our July schedule scrape never saw, e.g. teams whose schedule wasn't
published yet), resolves each contest's two schools from the game page, then
re-scrapes only those teams' 26-27 schedule pages and merges the results.

Only contests played on --date are replaced; a refreshed team's other games
are added only when the contest is entirely new to the file, so nothing
already on the site is silently re-oriented.

MaxPreps rankings are deliberately NOT touched: blending current-season ranks
for a handful of teams while the other ~270 still carry prior-season ranks
would skew the global power rating. That waits for a full-season refresh.

Usage:
    .venv/Scripts/python scripts/update_2026_results.py --date 2026-08-14
    .venv/Scripts/python scripts/update_2026_results.py --date 2026-08-14 --dry-run
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from datetime import date as date_cls
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from bs4 import BeautifulSoup  # noqa: E402

from scraper import config  # noqa: E402
from scraper import slugify as slug_mod  # noqa: E402
from scraper.browser import BrowserHarness  # noqa: E402
from scraper.cache import CrawlCache  # noqa: E402
from scraper.nextdata import (  # noqa: E402
    derive_team_season_urls,
    extract_next_data_payload,
    extract_overall_standing,
    extract_region_record,
)
from scraper.normalize import build_games  # noqa: E402
from scraper.opponents import disambiguate_opponents  # noqa: E402
from scraper.pipeline import _fetch_html  # noqa: E402
from scraper.schedule import parse_schedule  # noqa: E402
from scraper.schedule_rows import derive_record, homeaway_truth, orient  # noqa: E402

SEASON = "2026-27"
SHORT = "26-27"
MIN_DATE = "2026-05-01"

DATA_DIRS = [
    ROOT / "output" / "data" / SEASON,
    ROOT.parent / "web" / "public" / "data" / SEASON,
]
WEB_DIR = ROOT.parent / "web" / "public" / "data" / SEASON

SCHOOL_HREF_RE = re.compile(r"^(?:https://www\.maxpreps\.com)?(/[a-z]{2}/[a-z0-9.'-]+/[a-z0-9.'-]+/football)/?$")
# Modern game links carry "?c=<uuid>"; a few contests still use the legacy ASPX
# page, which spells the same uuid "contestid=<uuid>".
CONTEST_RE = re.compile(r"[?&](?:c|contestid)=([\w-]+)", re.I)


def contest_id(url: str | None) -> str | None:
    m = CONTEST_RE.search(url or "")
    return m.group(1) if m else None


def absolute_url(href: str | None) -> str | None:
    """Scoreboard hrefs are usually absolute but legacy ones are site-relative."""
    if not href:
        return None
    return urljoin(f"{config.MAXPREPS_BASE}/", href)


def strip_rank(name: str) -> str:
    """Scoreboard names carry a rank badge: "(#3)Jackson Academy"."""
    return re.sub(r"^\(#\d+\)\s*", "", name or "").strip()


# ── scoreboard ────────────────────────────────────────────────────────────────
def parse_scoreboard(html: str) -> list[dict[str, Any]]:
    """Extract one record per contest from a MaxPreps state scoreboard page.

    Each contest is an <a class="c-c"> wrapping <ul class="teams"> whose two
    <li>s are away-then-home (MaxPreps' universal ordering).
    """
    soup = BeautifulSoup(html, "html.parser")
    out: list[dict[str, Any]] = []
    for a in soup.select("a.c-c"):
        lis = a.select("ul.teams > li")
        if len(lis) != 2:
            continue
        sides = []
        for li in lis:
            score_el = li.select_one(".score")
            name_el = li.select_one(".name")
            raw = (score_el.get_text(strip=True) if score_el else "")
            sides.append({
                "name": name_el.get_text(strip=True) if name_el else "",
                "score": int(raw) if raw.isdigit() else None,
            })
        details = a.select_one(".details")
        href = absolute_url(a.get("href"))
        out.append({
            "url": href,
            "contestId": contest_id(href),
            "away": sides[0],
            "home": sides[1],
            "status": (details.get_text(strip=True) if details else "").lower(),
        })
    return out




def parse_game_schools(html: str) -> list[str]:
    """Canonical school football-home paths linked from a game page."""
    soup = BeautifulSoup(html, "html.parser")
    paths: list[str] = []
    for a in soup.find_all("a", href=True):
        m = SCHOOL_HREF_RE.match(a["href"])
        if m and m.group(1) not in paths:
            paths.append(m.group(1))
    return paths


def school_path(url: str | None) -> str | None:
    m = SCHOOL_HREF_RE.match((url or "").rstrip("/"))
    return m.group(1) if m else None


def build_resolver(teams: list[dict]):
    """Mirror the site's alias resolution (web/lib/data.ts + team-format.ts).

    A row built from team X's page carries X's canonical id on one side and the
    opponent's mascot-less MaxPreps slug on the other; ambiguous aliases (two
    Lee Academies) resolve to nothing, exactly as the site drops them.
    """
    by_id = {t["id"] for t in teams}
    alias: dict[str, str] = {}
    ambiguous: set[str] = set()
    for t in teams:
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
        return side if side in by_id else alias.get(side)

    return resolve


def verify_scores(board, games_final, teams, resolve) -> None:
    """Cross-check every merged row against the scoreboard it came from."""
    by_contest: dict[str, list[dict]] = {}
    for g in games_final:
        cid = contest_id(g.get("maxprepsUrl"))
        if cid:
            by_contest.setdefault(cid, []).append(g)
    names = {t["id"]: t["name"] for t in teams}
    bad = 0
    for c in board:
        rows = by_contest.get(c["contestId"], [])
        if not rows and c["ourTeams"]:
            print(f"  MISSING rows: {c['away']['name']} @ {c['home']['name']}")
            bad += 1
        for g in rows:
            if (g["homeScore"], g["awayScore"]) != (c["home"]["score"], c["away"]["score"]):
                print(f"  SCORE MISMATCH {g['id']}: row {g['awayScore']}-{g['homeScore']} "
                      f"vs board {c['away']['score']}-{c['home']['score']}")
                bad += 1
    print(f"verification: {len(board)} contests checked, {bad} score/coverage problems")

    # No team may end up with two different contests on one date — that is how
    # a schedule change since July would surface (duplicate game on the site).
    seen: dict[tuple[str, str], set[str]] = {}
    for g in games_final:
        cid = contest_id(g.get("maxprepsUrl")) or g["id"]
        for side in (g["homeTeamId"], g["awayTeamId"]):
            tid = resolve(side)
            if tid:
                seen.setdefault((tid, g["date"][:10]), set()).add(cid)
    clashes = {k: v for k, v in seen.items() if len(v) > 1}
    print(f"duplicate-contest check: {len(clashes)} team-days with 2+ contests")
    for (tid, day_), cids in sorted(clashes.items())[:20]:
        print(f"  {names.get(tid, tid)} {day_}: {len(cids)} contests")


# ── team-side derivations ─────────────────────────────────────────────────────

async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", required=True, help="game date, YYYY-MM-DD")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--use-cache", action="store_true", help="reuse cached pages (re-analysis)")
    ap.add_argument("--dump", help="write scraped board/rows to this JSON path")
    args = ap.parse_args()
    force = not args.use_cache

    day = date_cls.fromisoformat(args.date)
    mp_date = f"{day.month}/{day.day}/{day.year}"

    teams = json.loads((WEB_DIR / "teams.json").read_text(encoding="utf-8"))
    games = json.loads((WEB_DIR / "games.json").read_text(encoding="utf-8"))
    by_path = {school_path(t.get("maxprepsUrl")): t for t in teams}
    by_path.pop(None, None)

    cache = CrawlCache(config.CACHE_DB_PATH)
    async with BrowserHarness(headless=True) as h:
        board_url = f"{config.MAXPREPS_BASE}/ms/football/scores/?date={mp_date}"
        board = parse_scoreboard(await _fetch_html(h, board_url, cache, force=force))
        print(f"scoreboard: {len(board)} contests on {args.date}", flush=True)

        # Resolve each contest's schools; the scoreboard only carries short names.
        involved: dict[str, dict] = {}
        for c in board:
            # One unreachable game page must not abort the whole slate.
            try:
                html = await _fetch_html(h, c["url"], cache, force=force)
            except Exception as exc:  # noqa: BLE001
                print(f"  !! {c['away']['name']} @ {c['home']['name']}: "
                      f"game page unreachable ({type(exc).__name__}) — {c['url']}", flush=True)
                c["schools"], c["ourTeams"] = [], []
                continue
            paths = parse_game_schools(html)
            c["schools"] = paths
            c["ourTeams"] = [by_path[p]["id"] for p in paths if p in by_path]
            for p in paths:
                if p in by_path:
                    involved[by_path[p]["id"]] = by_path[p]
            print(f"  {c['away']['name']} {c['away']['score']} @ "
                  f"{c['home']['name']} {c['home']['score']} "
                  f"-> {c['ourTeams'] or 'NO MATCH'}", flush=True)

        print(f"\nrefreshing {len(involved)} team schedules", flush=True)
        # Scoreboard order (away li, then home li) is definitive for the day's
        # contests; JSON-LD off each schedule page covers the rest of the slate.
        truth: dict[str, tuple[str, str]] = {
            c["contestId"]: (strip_rank(c["away"]["name"]), strip_rank(c["home"]["name"]))
            for c in board if c["contestId"]
        }
        scraped: list[tuple[str, list[dict]]] = []
        team_patch: dict[str, dict] = {}
        for i, (tid, t) in enumerate(sorted(involved.items()), 1):
            urls = derive_team_season_urls(team_url=t["maxprepsUrl"], season_short=SHORT)
            html = await _fetch_html(h, urls["schedule"], cache, force=force)
            payload = extract_next_data_payload(html)
            if payload is None:
                print(f"  [{i}] {t['name']}: no schedule data", flush=True)
                continue
            partials = [
                g for g in parse_schedule(payload, team_url=t["maxprepsUrl"])
                if (g.get("date") or "") >= MIN_DATE
            ]
            for cid_, sides in homeaway_truth(html).items():
                truth.setdefault(cid_, sides)
            scraped.append((tid, partials))
            record, pf, pa = derive_record(partials)
            team_patch[tid] = {
                "record": record,
                "pointsFor": pf,
                "pointsAgainst": pa,
                "regionRecord": extract_region_record(payload),
                "standing": extract_overall_standing(payload),
            }
            print(f"  [{i}] {t['name']}: {len(partials)} games, "
                  f"{record['wins']}-{record['losses']}", flush=True)

    all_partials = [g for _, rows in scraped for g in rows]
    fixed, defaulted, reconciled = orient(all_partials, truth)
    print(f"\nhome/away: {fixed} from MaxPreps, {defaulted} defaulted, "
          f"{reconciled} reconciled across paired rows")

    fresh_rows: list[dict] = []
    for tid, partials in scraped:
        built = build_games(
            season=SEASON, team_id=tid, opponent_lookup={},
            schedule=partials, box_scores={}, player_label_to_id={},
        )
        fresh_rows.extend(g.model_dump(by_alias=True) for g in built)

    if args.dump:
        Path(args.dump).write_text(
            json.dumps({"board": board, "rows": fresh_rows, "teams": team_patch}, indent=1),
            encoding="utf-8",
        )

    # ── merge games ───────────────────────────────────────────────────────────
    # Scope: the day's contests are replaced outright, and teams that had no
    # schedule at all in July get their whole slate. Other future rows are left
    # alone — MaxPreps still lists stale duplicate contests for some teams
    # (Simpson Academy is down for two different 9/4 opponents), so importing
    # that churn would put phantom games on the site. A full-season re-scrape
    # is the place to reconcile schedules, not a results run.
    resolve = build_resolver(teams)
    day_contests = {c["contestId"] for c in board if c["contestId"]}
    on_file = {
        tid for g in games
        for tid in (resolve(g["homeTeamId"]), resolve(g["awayTeamId"])) if tid
    }
    new_teams = {tid for tid in team_patch if tid not in on_file}

    kept, stale = [], []
    for g in games:
        cid = contest_id(g.get("maxprepsUrl"))
        sides = {resolve(g["homeTeamId"]), resolve(g["awayTeamId"])}
        drop = cid in day_contests or (
            g["date"][:10] == args.date and bool(sides & set(team_patch))
        )
        (stale if drop else kept).append(g)

    incoming = [
        g for g in fresh_rows
        if contest_id(g["maxprepsUrl"]) in day_contests
        or {g["homeTeamId"], g["awayTeamId"]} & new_teams
    ]

    merged: dict[str, dict] = {}
    for g in kept + incoming:
        merged.setdefault(g["id"], g)
    games_final = sorted(merged.values(), key=lambda g: (g["date"], g["id"]))

    finals = [g for g in games_final if g["date"][:10] == args.date and g["status"] == "final"]
    print(f"\ngames: {len(games)} -> {len(games_final)} "
          f"(replaced {len(stale)} rows for {len(day_contests)} contests, "
          f"{len(incoming)} rows in, incl. full slates for {len(new_teams)} "
          f"previously-unscheduled teams)")
    if new_teams:
        print("  first schedules: " + ", ".join(sorted(new_teams)))
    print(f"final rows on {args.date}: {len(finals)}")

    # Runs over the whole file, not just this date, so the fix is self-healing
    # for rows written before this check existed.
    fixes = disambiguate_opponents(games_final, teams)
    if fixes:
        print(f"\ndisambiguated {len(fixes)} out-of-state opponents "
              f"that resolved onto same-named teams:")
        for gid, old, new in fixes:
            print(f"  {gid}: {old} -> {new}")

    verify_scores(board, games_final, teams, resolve)

    # ── merge teams ───────────────────────────────────────────────────────────
    for t in teams:
        p = team_patch.get(t["id"])
        if not p:
            continue
        t["record"] = p["record"]
        t["stats"] = {
            **t["stats"], "pointsFor": p["pointsFor"], "pointsAgainst": p["pointsAgainst"],
        }
        t["regionRecord"] = p["regionRecord"]
        st = p["standing"] or {}
        for k in ("homeRecord", "awayRecord", "neutralRecord", "streak"):
            if st.get(k) is not None:
                t[k] = st[k]

    if args.dry_run:
        print("\n[dry-run] nothing written")
        return

    for d in DATA_DIRS:
        d.mkdir(parents=True, exist_ok=True)
        (d / "games.json").write_text(json.dumps(games_final, indent=2), encoding="utf-8")
        (d / "teams.json").write_text(json.dumps(teams, indent=2), encoding="utf-8")
    print(f"\nwrote games.json + teams.json to {len(DATA_DIRS)} dirs")


asyncio.run(main())
