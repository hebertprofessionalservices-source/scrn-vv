"""Parser for MaxPreps class directory next/data JSON."""
from __future__ import annotations

from typing import Any


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
        rows = payload["props"]["pageProps"]["layoutProps"]["tableData"]
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
        url = row.get("teamCanonicalUrl")
        if not name or not url:
            continue
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
