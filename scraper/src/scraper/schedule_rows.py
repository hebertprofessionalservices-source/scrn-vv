"""Shared helpers for turning MaxPreps schedule pages into game rows.

Used by both `update_2026_results.py` (one game day) and
`refresh_2026_schedules.py` (whole season). Keep them here rather than in either
script so the two can't drift — the orientation logic in particular took a lot
of digging to get right.
"""

from __future__ import annotations

import re
from typing import Any


def homeaway_truth(html: str) -> dict[str, tuple[str, str]]:
    """Per-contest (awayName, homeName) from a schedule page's JSON-LD events.

    parse_schedule orients rows from the box-score URL slug, but 2026 contest
    URLs are the new /game/…/?c=… form with no "away-vs-home" .htm slug, so it
    silently defaults every row to "away" — which swaps the scores with it. The
    JSON-LD event name "Away at Home" is explicit; sides use MaxPreps short
    names, the same vocabulary as parse_schedule's opponentName.
    """
    truth: dict[str, tuple[str, str]] = {}
    for chunk in html.split('{"@type":"SportsEvent"')[1:]:
        chunk = chunk[:2500]
        nm = re.match(r'\s*,\s*"name":"([^"]+) at ([^"]+)"', chunk)
        cm = re.search(r'/game/[^"]*\?c=([\w-]+)', chunk)
        if nm and cm:
            truth[cm.group(1)] = (nm.group(1).strip(), nm.group(2).strip())
    return truth


def orient(rows: list[dict], truth: dict[str, tuple[str, str]]) -> tuple[int, int, int]:
    """Set each row's homeOrAway from `truth`, then reconcile paired rows.

    Returns (fixed, defaulted, reconciled). Mutates rows in place.
    """
    fixed = defaulted = 0
    by_contest: dict[str, list[dict]] = {}
    for g in rows:
        if g.get("contestId"):
            by_contest.setdefault(g["contestId"], []).append(g)
        g["_fixed"] = False
        sides = truth.get(g.get("contestId") or "")
        opp = (g.get("opponentName") or "").strip()
        if sides and opp:
            away_name, home_name = sides
            if opp == home_name and opp != away_name:
                g["homeOrAway"], g["_fixed"] = "away", True
            elif opp == away_name and opp != home_name:
                g["homeOrAway"], g["_fixed"] = "home", True
        if g["_fixed"]:
            fixed += 1
        else:
            defaulted += 1

    # The two perspective rows of one contest must be complementary.
    reconciled = 0
    for group in by_contest.values():
        if len(group) != 2:
            continue
        a, b = group

        def flip(g: dict) -> str:
            return "away" if g["homeOrAway"] == "home" else "home"

        if a["_fixed"] and not b["_fixed"]:
            b["homeOrAway"] = flip(a)
            reconciled += 1
        elif b["_fixed"] and not a["_fixed"]:
            a["homeOrAway"] = flip(b)
            reconciled += 1
        elif not a["_fixed"] and a["homeOrAway"] == b["homeOrAway"]:
            b["homeOrAway"] = flip(a)
            reconciled += 1
    for g in rows:
        g.pop("_fixed", None)
    return fixed, defaulted, reconciled


def derive_record(partials: list[dict[str, Any]]) -> tuple[dict[str, int], int, int]:
    """(record, pointsFor, pointsAgainst) from a team's final games."""
    wins = losses = pf = pa = 0
    for g in partials:
        if g.get("status") != "final":
            continue
        sf, sa = g.get("scoreFor"), g.get("scoreAgainst")
        if sf is None or sa is None:
            continue
        pf += sf
        pa += sa
        if sf > sa:
            wins += 1
        elif sf < sa:
            losses += 1
    return {"wins": wins, "losses": losses}, pf, pa
