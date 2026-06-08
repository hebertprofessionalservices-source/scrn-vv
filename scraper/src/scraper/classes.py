"""MHSAA class directory URL enumeration."""
from __future__ import annotations

MHSAA_CLASSIFICATIONS: tuple[str, ...] = ("1A", "2A", "3A", "4A", "5A", "6A", "7A")


def list_class_urls(season: str) -> list[dict[str, str]]:
    """Return one entry per MHSAA class with classification label and full URL.

    Args:
        season: Season string in YY-YY form, e.g. "25-26".

    Returns:
        List of dicts with keys 'classification' and 'url'.
    """
    base = f"https://www.maxpreps.com/ms/football/{season}/class/class-"
    return [
        {"classification": c, "url": f"{base}{c.lower()}/"}
        for c in MHSAA_CLASSIFICATIONS
    ]
