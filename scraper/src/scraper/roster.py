"""Parse MaxPreps /_next/data/.../roster.json responses into normalized player dicts.

The JSON payload has the shape:
    {"pageProps": {"athleteData": [<player_array>, ...], ...}}

Each player_array is an ordered list; indices used:
    [5]  = firstName
    [6]  = lastName
    [8]  = jersey number (string)
    [12] = primary position string
    [11] = weight (int or None)
    [34] = height string like "5' 11\""  (or empty string)
    [35] = height in inches (int or None)
    [36] = grade/class string like "Sr.", "Jr.", "7th"
"""

from __future__ import annotations

import re
from typing import Any

# ---------------------------------------------------------------------------
# Normalisation maps
# ---------------------------------------------------------------------------

POSITION_ALIASES: dict[str, str] = {
    "QB": "QB",
    "RB": "RB", "HB": "RB", "FB": "RB",
    "WR": "WR",
    "TE": "TE",
    "OL": "OL", "OT": "OL", "OG": "OL", "C": "OL", "T": "OL", "G": "OL",
    "DL": "DL", "DT": "DL", "DE": "DL", "NT": "DL", "NG": "DL",
    "LB": "LB", "ILB": "LB", "OLB": "LB", "MLB": "LB",
    "DB": "DB", "CB": "DB", "S": "DB", "FS": "DB", "SS": "DB",
    "K": "K", "PK": "K",
    "P": "P",
    "ATH": "ATH",
    "LS": "ATH", "PR": "ATH", "KR": "ATH",
}

CLASS_ALIASES: dict[str, str] = {
    "FR": "FR", "FRESHMAN": "FR", "9": "FR", "9TH": "FR",
    "SO": "SO", "SOPHOMORE": "SO", "10": "SO", "10TH": "SO",
    "JR": "JR", "JUNIOR": "JR", "11": "JR", "11TH": "JR",
    "SR": "SR", "SENIOR": "SR", "12": "SR", "12TH": "SR",
}

# Map abbreviated grades as they appear in the fixture
_GRADE_ABBREV: dict[str, str] = {
    "SR.": "SR",
    "JR.": "JR",
    "SO.": "SO",
    "FR.": "FR",
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_MULTI_POS_RE = re.compile(r"[/,\s]+")


def _normalize_position(raw: str | None) -> str:
    """Return a canonical position code, falling back to ATH for unknowns."""
    if not raw:
        return "ATH"
    # Take the first token when multiple positions are listed (e.g. "RB/DB", "CB, QB")
    first = _MULTI_POS_RE.split(raw.strip())[0].upper()
    return POSITION_ALIASES.get(first, "ATH")


def _normalize_class(raw: Any) -> str:
    """Return a canonical class code (FR/SO/JR/SR), falling back to FR."""
    if raw is None:
        return "FR"
    token = str(raw).strip().upper()
    # Handle abbreviated forms like "SR.", "JR."
    if token in _GRADE_ABBREV:
        return _GRADE_ABBREV[token]
    # Strip trailing period and try again
    token_no_dot = token.rstrip(".")
    if token_no_dot in CLASS_ALIASES:
        return CLASS_ALIASES[token_no_dot]
    return CLASS_ALIASES.get(token, "FR")


def _normalize_height(height_str: str | None, height_inches: int | None) -> str | None:
    """Return a normalised height string like '6-2', or None if unavailable."""
    # Prefer the integer-inches value when available
    if height_inches and isinstance(height_inches, int) and height_inches > 0:
        feet, inches = divmod(height_inches, 12)
        return f"{feet}-{inches}"
    # Fall back to parsing the string form e.g. "5' 11\""
    if height_str and isinstance(height_str, str):
        m = re.search(r"(\d+)['’]\s*(\d+)", height_str)
        if m:
            return f"{m.group(1)}-{m.group(2)}"
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

# Column indices in the athleteData sub-arrays
_IDX_FIRST_NAME = 5
_IDX_LAST_NAME = 6
_IDX_JERSEY = 8
_IDX_POSITION = 12
_IDX_WEIGHT = 11
_IDX_HEIGHT_STR = 34
_IDX_HEIGHT_IN = 35
_IDX_CLASS = 36


def parse_roster(payload: dict) -> list[dict[str, Any]]:
    """Parse a MaxPreps /_next/data/.../roster.json payload.

    Args:
        payload: Parsed JSON dict with ``pageProps.athleteData`` list.

    Returns:
        List of player dicts with keys: name, jersey, position, playerClass,
        height, weight.
    """
    # Support both legacy schema (props.pageProps) and current schema (pageProps).
    page_props: dict = payload.get("pageProps") or payload.get("props", {}).get("pageProps", {})
    athlete_rows: list[list[Any]] = page_props.get("athleteData", [])
    players: list[dict[str, Any]] = []

    for row in athlete_rows:
        first = str(row[_IDX_FIRST_NAME] or "").strip()
        last = str(row[_IDX_LAST_NAME] or "").strip()
        name = f"{first} {last}".strip()

        jersey = str(row[_IDX_JERSEY] or "").strip()

        raw_pos = row[_IDX_POSITION] if len(row) > _IDX_POSITION else None
        position = _normalize_position(raw_pos)

        raw_class = row[_IDX_CLASS] if len(row) > _IDX_CLASS else None
        player_class = _normalize_class(raw_class)

        raw_height_str = row[_IDX_HEIGHT_STR] if len(row) > _IDX_HEIGHT_STR else None
        raw_height_in = row[_IDX_HEIGHT_IN] if len(row) > _IDX_HEIGHT_IN else None
        height = _normalize_height(raw_height_str, raw_height_in)

        raw_weight = row[_IDX_WEIGHT] if len(row) > _IDX_WEIGHT else None
        weight = int(raw_weight) if raw_weight else None

        players.append({
            "name": name,
            "jersey": jersey,
            "position": position,
            "playerClass": player_class,
            "height": height,
            "weight": weight,
        })

    return players
