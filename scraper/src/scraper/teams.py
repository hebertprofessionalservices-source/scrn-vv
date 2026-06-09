"""Parser for MaxPreps class directory next/data JSON and HTML."""
from __future__ import annotations

import json as _json
import re
from typing import Any

# Matches a trailing season segment (YY-YY) with an optional sub-page name,
# e.g. "/25-26/schedule/" or "/25-26/".  We strip this to get the bare team URL.
_SEASON_TAIL_RE = re.compile(r"/\d{2}-\d{2}(?:/[a-z-]+)?/?$")


def _canonicalize_team_url(url: str) -> str:
    """Strip any season + sub-page tail so the URL ends with /football/.

    Examples:
        .../football/25-26/schedule/ → .../football/
        .../football/25-26/          → .../football/
        .../football/                → .../football/  (unchanged)
    """
    if not url:
        return url
    url = url.rstrip("/") + "/"
    url = _SEASON_TAIL_RE.sub("/", url)
    return url


def parse_team_directory(payload: dict) -> list[dict[str, Any]]:
    """Extract team rows from a class-directory next/data JSON payload.

    Args:
        payload: Parsed JSON from a MaxPreps class-directory page
                 (``/__next_data__`` or equivalent XHR).

    Returns:
        Deduplicated list of team dicts with keys:
        ``name``, ``url``, ``schoolId``, ``logoUrl``, ``acronym``.
        Rows missing ``schoolName`` or ``teamCanonicalUrl`` are skipped.
    """
    try:
        # Support both legacy schema (props.pageProps) and current schema (pageProps).
        page_props: dict = payload.get("pageProps") or payload.get("props", {}).get("pageProps", {})
        rows = page_props["layoutProps"]["tableData"]
    except (KeyError, TypeError):
        return []

    if not isinstance(rows, list):
        return []

    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        name = row.get("schoolName")
        raw_url = row.get("teamCanonicalUrl")
        if not name or not raw_url:
            continue
        url = _canonicalize_team_url(raw_url)
        if url in seen:
            continue
        seen.add(url)
        out.append({
            "name": name,
            "url": url,
            "schoolId": row.get("schoolId"),
            "logoUrl": row.get("schoolMascotUrl"),
            "acronym": row.get("schoolNameAcronym"),
        })
    return out


def parse_team_directory_from_html(html: str) -> list[dict[str, Any]]:
    """Extract team rows from a class directory page's HTML __NEXT_DATA__ blob.

    Args:
        html: Raw HTML of a MaxPreps class-directory page.

    Returns:
        List of team dicts as returned by :func:`parse_team_directory`.
    """
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "html.parser")
    tag = soup.find("script", {"id": "__NEXT_DATA__"})
    if not tag or not tag.string:
        return []
    try:
        payload = _json.loads(tag.string)
    except _json.JSONDecodeError:
        return []
    return parse_team_directory(payload)
