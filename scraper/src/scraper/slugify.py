"""Stable ID generation for teams, players, and games."""
from __future__ import annotations

import hashlib
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
    name_clean = full_name.strip() or "unknown"
    last_name = name_clean.split()[-1] if name_clean else "unknown"
    base = f"{team_id_}-{jersey_part}-{slugify(last_name)}"
    if not jersey:
        # Disambiguate when no jersey: include a short hash of the full name
        # so two players on the same team with the same last name don't collide.
        digest = hashlib.sha1(name_clean.encode("utf-8")).hexdigest()[:6]
        return f"{base}-{digest}"
    return base


def game_id(date: str, away_team_id: str, home_team_id: str) -> str:
    return f"{date}-{away_team_id}-at-{home_team_id}"
