"""Stable ID generation for teams, players, and games."""
from __future__ import annotations

import re
import unicodedata

_NON_ALNUM = re.compile(r"[^a-z0-9]+")
_APOSTROPHE = re.compile(r"['']")


def slugify(value: str) -> str:
    """Lowercase ASCII slug. Apostrophes are stripped (not dashed)."""
    if not value:
        return ""
    ascii_value = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    ascii_value = _APOSTROPHE.sub("", ascii_value)
    ascii_value = _NON_ALNUM.sub("-", ascii_value)
    return ascii_value.strip("-")


def team_id(name: str, mascot: str | None) -> str:
    parts = [slugify(name)]
    if mascot:
        parts.append(slugify(mascot))
    return "-".join(p for p in parts if p)


def player_id(team_id_: str, jersey: str | None, full_name: str) -> str:
    jersey_part = slugify(jersey) if jersey else "x"
    last_name = full_name.strip().split()[-1] if full_name.strip() else "unknown"
    return f"{team_id_}-{jersey_part}-{slugify(last_name)}"


def game_id(date: str, away_team_id: str, home_team_id: str) -> str:
    return f"{date}-{away_team_id}-at-{home_team_id}"
