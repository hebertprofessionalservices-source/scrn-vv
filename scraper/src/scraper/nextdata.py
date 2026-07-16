"""Helpers for hitting MaxPreps' Next.js _next/data endpoints."""
from __future__ import annotations

import json
import re
from urllib.parse import urlparse

from bs4 import BeautifulSoup

_BUILD_ID_RE = re.compile(r'"buildId":"([^"]+)"')


def extract_build_id(html: str) -> str | None:
    """Extract the Next.js buildId from any page's HTML.

    Tries __NEXT_DATA__ JSON first (most reliable), falls back to a regex
    over the raw HTML.
    """
    soup = BeautifulSoup(html, "html.parser")
    tag = soup.find("script", id="__NEXT_DATA__")
    if tag and tag.string:
        try:
            data = json.loads(tag.string)
            if isinstance(data, dict) and "buildId" in data:
                return data["buildId"].strip()
        except json.JSONDecodeError:
            pass
    m = _BUILD_ID_RE.search(html)
    return m.group(1).strip() if m else None


def to_next_data_url(*, page_url: str, build_id: str) -> str:
    """Convert a user-facing page URL to its /_next/data/{buildId}/...json URL.

    Example:
        page_url=https://www.maxpreps.com/ms/starkville/starkville-yellowjackets/football/25-26/roster/
        → https://www.maxpreps.com/_next/data/{buildId}/ms/starkville/starkville-yellowjackets/football/25-26/roster.json
    """
    parsed = urlparse(page_url)
    path = parsed.path.rstrip("/")
    return f"{parsed.scheme}://{parsed.netloc}/_next/data/{build_id.strip()}{path}.json"


def extract_next_data_payload(html: str) -> dict | None:
    """Extract the parsed __NEXT_DATA__ JSON payload from a Next.js page's HTML.

    Returns None if absent or malformed.
    """
    soup = BeautifulSoup(html, "html.parser")
    tag = soup.find("script", id="__NEXT_DATA__")
    if not tag or not tag.string:
        return None
    try:
        return json.loads(tag.string)
    except json.JSONDecodeError:
        return None


def derive_team_season_urls(*, team_url: str, season_short: str) -> dict[str, str]:
    """Given a base team URL like `.../starkville-yellowjackets/football/`,
    return the season-specific URLs for roster, schedule, and stats pages.

    season_short is the short form like '24-25' or '25-26'.
    """
    base = team_url.rstrip("/")
    return {
        "team_home": f"{base}/{season_short}/",
        "roster": f"{base}/{season_short}/roster/",
        "schedule": f"{base}/{season_short}/schedule/",
        "stats": f"{base}/{season_short}/stats/",
    }


def extract_region_record(payload: dict) -> dict[str, int] | None:
    """Official district/region record from a team page's __NEXT_DATA__.

    MaxPreps ships it as teamContext.standingsData.leagueStanding
    .conferenceWinLossTies ("2-3" or "2-3-1"). Returns {"wins", "losses"}
    or None when standings aren't published for the team.
    """
    try:
        league = (
            payload["props"]["pageProps"]["teamContext"]["standingsData"][
                "leagueStanding"
            ]
        )
    except (KeyError, TypeError):
        return None
    return _parse_wlt((league or {}).get("conferenceWinLossTies"))


def _parse_wlt(raw: object) -> dict[str, int] | None:
    """'8-0' or '8-0-1' -> {'wins': 8, 'losses': 0}."""
    if not isinstance(raw, str):
        return None
    parts = raw.split("-")
    if len(parts) < 2:
        return None
    try:
        return {"wins": int(parts[0]), "losses": int(parts[1])}
    except ValueError:
        return None


def extract_overall_standing(payload: dict) -> dict | None:
    """Official home/away/neutral splits and current streak from __NEXT_DATA__.

    Returns {"homeRecord", "awayRecord", "neutralRecord", "streak"} where the
    records are {"wins", "losses"} (or None) and streak is
    {"count": int, "result": "W"|"L"} (or None).
    """
    try:
        overall = (
            payload["props"]["pageProps"]["teamContext"]["standingsData"][
                "overallStanding"
            ]
        )
    except (KeyError, TypeError):
        return None
    if not isinstance(overall, dict):
        return None
    streak = None
    count = overall.get("streak")
    result = overall.get("streakResult")
    if isinstance(count, int) and count > 0 and result in ("W", "L", "T"):
        streak = {"count": count, "result": result}
    return {
        "homeRecord": _parse_wlt(overall.get("homeWinLossTies")),
        "awayRecord": _parse_wlt(overall.get("awayWinLossTies")),
        "neutralRecord": _parse_wlt(overall.get("neutralWinLossTies")),
        "streak": streak,
    }
