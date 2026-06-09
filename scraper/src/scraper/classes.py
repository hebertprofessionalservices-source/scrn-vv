"""Discover MaxPreps class-directory URLs from the MS landing page HTML."""
from __future__ import annotations

import json
import re
from typing import Any

# MHSAA classes (1A–7A). MAIS divisions out of scope for v1.
TARGET_CLASSES: tuple[str, ...] = ("1A", "2A", "3A", "4A", "5A", "6A", "7A")

# statedivisionid values are season-specific: MaxPreps assigns a new UUID per
# class per season.  When live discovery (anchors / __NEXT_DATA__) misses a
# class, these per-season dicts are used as the fallback.
#
# 26-27 UUIDs — discovered from tests/fixtures/ms_football_landing.html.
_FALLBACK_STATEDIVISIONID_26_27: dict[str, str] = {
    "1A": "9a6d4194-9862-4164-a3fd-0c401538e687",
    "2A": "594a77e3-ad1a-4074-a601-889690efcdcf",
    "3A": "0a4a2db8-4024-44c0-9e63-60fc06196be8",
    "4A": "4b2ab90f-61f3-4fba-a16e-c8fdc9ddb2c1",
    "5A": "b8b1faff-0962-4fc8-956e-e7eec953fd82",
    "6A": "641b26ce-e375-4896-913b-a4a042fa6ac5",
    "7A": "86401710-9915-4a02-8f4e-0d905a356dce",
}

# 25-26 UUIDs — extracted from team pages (e.g. Ashland/1A, Natchez/5A, etc.)
# because the MaxPreps landing defaulted to 26-27 before 25-26 anchors were
# cached, so the live landing no longer embeds 25-26 statedivisionids.
_FALLBACK_STATEDIVISIONID_25_26: dict[str, str] = {
    "1A": "c9b22160-ae58-4c8f-a212-f077b78713d0",
    "2A": "31a6d75b-37be-45c0-8ac4-1807a225a22b",
    "3A": "82321a6e-b6b2-4995-a4e2-02cc5fe6a708",
    "4A": "6aad0ce2-dd50-479a-8e94-8c33eebdb57a",
    "5A": "6c4b545c-fbf5-464b-a44b-30fb26ef906e",
    "6A": "8c7c20fc-b340-4935-8608-7072cfac3c6e",
    "7A": "fa876ba2-246c-49a3-89d3-982d6f4433cb",
}

# 24-25 UUIDs — discovered by probing known team schedule pages for each class
# (e.g. Simmons/Biggersville for 1A, Aberdeen for 3A, Warren Central for 6A)
# and verifying the statedivisionid returned by __NEXT_DATA__ against the class
# directory URL.  2A, 4A, 5A, 7A share their UUID with the 25-26 season.
_FALLBACK_STATEDIVISIONID_24_25: dict[str, str] = {
    "1A": "31cbd332-b45d-44ea-ab32-bc3bcff7b4d9",
    "2A": "31a6d75b-37be-45c0-8ac4-1807a225a22b",
    "3A": "fa5899d8-6bc8-4231-ad6b-63221e62a503",
    "4A": "6aad0ce2-dd50-479a-8e94-8c33eebdb57a",
    "5A": "6c4b545c-fbf5-464b-a44b-30fb26ef906e",
    "6A": "4bff6343-79fe-4b50-8de2-7debfea1a437",
    "7A": "fa876ba2-246c-49a3-89d3-982d6f4433cb",
}

# Registry keyed by season_short.  Falls back to the 26-27 dict for any season
# not explicitly listed — correct for future seasons until their UUIDs are known.
_FALLBACK_BY_SEASON: dict[str, dict[str, str]] = {
    "24-25": _FALLBACK_STATEDIVISIONID_24_25,
    "25-26": _FALLBACK_STATEDIVISIONID_25_26,
    "26-27": _FALLBACK_STATEDIVISIONID_26_27,
}

# Legacy alias — keeps any external callers that import the old name working.
_FALLBACK_STATEDIVISIONID = _FALLBACK_STATEDIVISIONID_26_27

_CLASS_HREF_RE = re.compile(
    r"/ms/football/(\d{2}-\d{2})/class/class-([1-7]a)/\?statedivisionid=([0-9a-f-]+)",
    re.IGNORECASE,
)


def discover_class_links(landing_html: str, *, season_short: str) -> list[dict[str, Any]]:
    """Find class directory URLs for the requested season in the landing HTML.

    Returns a list of {"classification": "7A", "url": <full URL>} entries — one per
    discovered MHSAA class. Falls back to scanning the __NEXT_DATA__ JSON blob if
    anchor tags are absent.

    season_short is the short form like "24-25", "25-26", "26-27".

    When a season-specific UUID dict is available (via ``_FALLBACK_BY_SEASON``),
    those UUIDs always win over any UUID found in the live landing HTML.  The
    MaxPreps landing page always reflects the *current* season, so its UUIDs are
    wrong when scraping a past season — we must substitute the correct ones.
    """
    from bs4 import BeautifulSoup

    # If we have a known UUID map for this season, start from that immediately.
    # Live discovery is still useful for future seasons we haven't catalogued yet.
    season_fallback = _FALLBACK_BY_SEASON.get(season_short, _FALLBACK_STATEDIVISIONID_26_27)

    soup = BeautifulSoup(landing_html, "html.parser")
    hits: dict[str, str] = {}

    for a in soup.select("a[href]"):
        href = a.get("href", "")
        m = _CLASS_HREF_RE.search(href)
        if not m:
            continue
        class_lower = m.group(2).lower()
        sdid = m.group(3)
        cls = class_lower.upper()
        if cls not in TARGET_CLASSES:
            continue
        # Prefer the season-specific UUID if we have one; otherwise use what the
        # landing HTML says (e.g. for future seasons not yet in our registry).
        sdid = season_fallback.get(cls, sdid)
        full = (
            f"https://www.maxpreps.com/ms/football/{season_short}/class/class-{class_lower}/"
            f"?statedivisionid={sdid}"
        )
        # Only set once per class — first hit wins.
        hits.setdefault(cls, full)

    # Also probe __NEXT_DATA__ in case anchors are missing or rendered server-side.
    if not hits:
        tag = soup.find("script", {"id": "__NEXT_DATA__"})
        if tag and tag.string:
            try:
                data = json.loads(tag.string)
                text = json.dumps(data)
                for m in _CLASS_HREF_RE.finditer(text):
                    cls = m.group(2).upper()
                    sdid = m.group(3)
                    if cls in TARGET_CLASSES:
                        sdid = season_fallback.get(cls, sdid)
                        hits.setdefault(
                            cls,
                            f"https://www.maxpreps.com/ms/football/{season_short}/class/class-{cls.lower()}/"
                            f"?statedivisionid={sdid}",
                        )
            except json.JSONDecodeError:
                pass

    # Merge in fallback UUIDs for any class still missing from live discovery.
    for cls in TARGET_CLASSES:
        if cls not in hits and cls in season_fallback:
            sdid = season_fallback[cls]
            hits[cls] = (
                f"https://www.maxpreps.com/ms/football/{season_short}/class/class-{cls.lower()}/"
                f"?statedivisionid={sdid}"
            )

    # Return in classification order.
    return [{"classification": c, "url": hits[c]} for c in TARGET_CLASSES if c in hits]
