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
                return data["buildId"]
        except json.JSONDecodeError:
            pass
    m = _BUILD_ID_RE.search(html)
    return m.group(1) if m else None


def to_next_data_url(*, page_url: str, build_id: str) -> str:
    """Convert a user-facing page URL to its /_next/data/{buildId}/...json URL.

    Example:
        page_url=https://www.maxpreps.com/ms/starkville/starkville-yellowjackets/football/25-26/roster/
        → https://www.maxpreps.com/_next/data/{buildId}/ms/starkville/starkville-yellowjackets/football/25-26/roster.json
    """
    parsed = urlparse(page_url)
    path = parsed.path.rstrip("/")
    return f"{parsed.scheme}://{parsed.netloc}/_next/data/{build_id}{path}.json"


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
