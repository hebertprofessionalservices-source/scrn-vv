"""Discover MaxPreps class-directory URLs from the MS landing page HTML."""
from __future__ import annotations

import json
import re
from typing import Any

# MHSAA classes (1A–7A). MAIS divisions out of scope for v1.
TARGET_CLASSES: tuple[str, ...] = ("1A", "2A", "3A", "4A", "5A", "6A", "7A")

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

    # Return in classification order.
    return [{"classification": c, "url": hits[c]} for c in TARGET_CLASSES if c in hits]
