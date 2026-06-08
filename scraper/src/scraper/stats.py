"""Parse MaxPreps playerStatLeadersData from a _next/data JSON payload.

The relevant path in the payload is:
    payload["props"]["pageProps"]["playerStatLeadersData"]["leaders"]

This contains *leaders only* — not comprehensive per-player season totals.
The normalizer (Task 16) will join this with per-game box scores to produce
full season stats.

Output shape:
    {
        "Full Name": {
            "athleteId": str,
            "position":  str,   # normalized canonical position
            "classYear": int,
            "leaders":   list[dict],  # all leader entries for this player
            # optional flat fields populated when a known displayName matches:
            "passing_yds_per_game": float | int | str,
            "rushing_td": int,
            ...
        },
        ...
    }
"""

from __future__ import annotations

import re
from typing import Any

# ---------------------------------------------------------------------------
# Position alias map — duplicated from scraper.roster to keep modules
# independent. Must stay in sync with roster.POSITION_ALIASES so the
# normalizer can join on position.
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

# ---------------------------------------------------------------------------
# Known displayName → flat field translations
# ---------------------------------------------------------------------------

DISPLAY_TO_FLAT: dict[str, str] = {
    "Passing Yards Per Game":   "passing_yds_per_game",
    "Passing Yards":            "passing_total_yds",
    "Passing Touchdowns":       "passing_td",
    "Passing TDs":              "passing_td",
    "Rushing Yards Per Game":   "rushing_yds_per_game",
    "Rushing Yards":            "rushing_total_yds",
    "Rushing Touchdowns":       "rushing_td",
    "Rushing TDs":              "rushing_td",
    "Receiving Yards Per Game": "receiving_yds_per_game",
    "Receiving Yards":          "receiving_total_yds",
    "Receiving Touchdowns":     "receiving_td",
    "Receiving TDs":            "receiving_td",
    "Total Tackles":            "defense_tackles",
    "Tackles":                  "defense_tackles",
    "Tackles Per Game":         "defense_tackles_per_game",
    "Sacks":                    "defense_sacks",
    "Interceptions":            "defense_int",
    "Field Goals Made":         "kicking_fgm",
    "Extra Points Made":        "kicking_xpm",
    "Total TDs":                "total_td",
    "Caused Fumbles":           "defense_caused_fumbles",
    "Fumble Recoveries":        "defense_fumble_recoveries",
    "QB Hurries":               "defense_qb_hurries",
    "Completion Percentage":    "passing_completion_pct",
    "QB Rating":                "passing_qb_rating",
}

_MULTI_POS_RE = re.compile(r"[/,\s]+")


def _normalize_position(raw: str) -> str:
    """Return the canonical position for the first token in a position string.

    Examples:
        "RB, WR" -> "RB"
        "CB"     -> "DB"
        "unknown"-> "ATH"
    """
    first = _MULTI_POS_RE.split(raw.strip())[0].upper()
    return POSITION_ALIASES.get(first, "ATH")


def _coerce_value(v: str) -> float | int | str:
    """Try to coerce a string stat value to int or float, else return as-is."""
    try:
        int_val = int(v)
        return int_val
    except (ValueError, TypeError):
        pass
    try:
        return float(v)
    except (ValueError, TypeError):
        pass
    return v


def parse_season_stats(payload: dict) -> dict[str, dict[str, Any]]:
    """Parse playerStatLeadersData leaders into a player-keyed dict.

    Args:
        payload: Full _next/data JSON payload from MaxPreps stats page.

    Returns:
        Dict keyed by player full name. Each value contains identity fields
        (athleteId, position, classYear), a ``leaders`` list of every stat
        category entry for the player, and any recognized flat fields derived
        from those entries.
    """
    leaders_raw: list[dict] = (
        payload["props"]["pageProps"]["playerStatLeadersData"]["leaders"]
    )

    # Accumulator: player_label -> player dict
    result: dict[str, dict[str, Any]] = {}

    for entry in leaders_raw:
        first = entry.get("athleteFirstName", "")
        last = entry.get("athleteLastName", "")
        label = f"{first} {last}".strip()

        stat = entry.get("stat", {})
        display_name: str = stat.get("displayName", "")
        header: str = stat.get("header", "")
        raw_value: str = stat.get("value", "")
        rank: int = entry.get("currentRank", 0)
        coerced_value = _coerce_value(raw_value)

        if label not in result:
            raw_positions: str = entry.get("athletePositions") or ""
            result[label] = {
                "athleteId": entry.get("athleteId", ""),
                "position": _normalize_position(raw_positions) if raw_positions else "ATH",
                "classYear": entry.get("athleteClassYear"),
                "leaders": [],
            }

        # Append this leader entry to the player's list
        result[label]["leaders"].append({
            "displayName": display_name,
            "header": header,
            "value": coerced_value,
            "rank": rank,
        })

        # Flatten well-known categories to named fields
        flat_key = DISPLAY_TO_FLAT.get(display_name)
        if flat_key and flat_key not in result[label]:
            result[label][flat_key] = coerced_value

    return result
