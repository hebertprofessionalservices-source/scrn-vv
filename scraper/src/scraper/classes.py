"""Discover MaxPreps class-directory URLs from the MS landing page HTML."""
from __future__ import annotations

import json
import re
from typing import Any

# MHSAA classes (1A–7A). MAIS divisions out of scope for v1.
TARGET_CLASSES: tuple[str, ...] = ("1A", "2A", "3A", "4A", "5A", "6A", "7A")

# Discovered from tests/fixtures/ms_football_landing.html (26-27 season).
# statedivisionid is stable per MHSAA class across seasons; safe to reuse for
# any season we substitute into the URL path.
_FALLBACK_STATEDIVISIONID: dict[str, str] = {
    "1A": "9a6d4194-9862-4164-a3fd-0c401538e687",
    "2A": "594a77e3-ad1a-4074-a601-889690efcdcf",
    "3A": "0a4a2db8-4024-44c0-9e63-60fc06196be8",
    "4A": "4b2ab90f-61f3-4fba-a16e-c8fdc9ddb2c1",
    "5A": "b8b1faff-0962-4fc8-956e-e7eec953fd82",
    "6A": "641b26ce-e375-4896-913b-a4a042fa6ac5",
    "7A": "86401710-9915-4a02-8f4e-0d905a356dce",
}

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
    """
    from bs4 import BeautifulSoup

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
        # Build the URL with the requested season substituted in.
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
                        hits.setdefault(
                            cls,
                            f"https://www.maxpreps.com/ms/football/{season_short}/class/class-{cls.lower()}/"
                            f"?statedivisionid={sdid}",
                        )
            except json.JSONDecodeError:
                pass

    # Merge in fallback UUIDs for any class still missing from live discovery.
    for cls in TARGET_CLASSES:
        if cls not in hits and cls in _FALLBACK_STATEDIVISIONID:
            sdid = _FALLBACK_STATEDIVISIONID[cls]
            hits[cls] = (
                f"https://www.maxpreps.com/ms/football/{season_short}/class/class-{cls.lower()}/"
                f"?statedivisionid={sdid}"
            )

    # Return in classification order.
    return [{"classification": c, "url": hits[c]} for c in TARGET_CLASSES if c in hits]
