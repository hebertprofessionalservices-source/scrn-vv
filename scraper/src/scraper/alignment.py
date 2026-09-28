"""Association-published classification/district overrides.

MaxPreps is the source for every other team field, but it lags the MAIS office
on realignment — and when it does catch up it can disagree with the alignment
the shows are actually calling on air.  ``data/alignment_overrides.json`` holds
the association's own published alignment, keyed by season and team id, and it
wins over whatever the scrape found.

Without this layer a hand-edit to ``teams.json`` survives exactly until the next
nightly scrape overwrites it.

Source for the 2026-27 entries: the MAIS class/district slides Garret supplied
on 2026-09-28 (4A 14 schools / 3 districts, 3A 21 / 5, 2A 16 / 4, 8-Man split
back into Div I districts 1-4 and Div II districts 5-8).
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

_OVERRIDES_PATH = Path(__file__).with_name("data") / "alignment_overrides.json"


@lru_cache(maxsize=1)
def _load() -> dict[str, dict[str, dict[str, Any]]]:
    """Season -> team id -> {"classification": str, "district": str | None}."""
    try:
        with _OVERRIDES_PATH.open(encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        return {}


def apply_alignment(
    team_id: str,
    season: str,
    classification: str,
    district: str | None,
) -> tuple[str, str | None]:
    """Return the association's (classification, district) for this team.

    Falls straight through to the scraped values when the season or the team
    isn't listed, so an unmapped team — a new member school, say — still lands
    with whatever MaxPreps reported rather than being dropped or blanked.
    """
    entry = _load().get(season, {}).get(team_id)
    if entry is None:
        return classification, district
    return (
        entry.get("classification", classification),
        entry.get("district", district),
    )


def class_rank_is_comparable(team_id: str, season: str) -> bool:
    """False when MaxPreps' per-class rank belongs to a different pool than ours.

    MaxPreps ranks a team inside whatever class IT has the team in.  When we
    move a team across classes ahead of MaxPreps, its ``stateClass`` number is
    drawn from its old classmates and means nothing beside its new ones —
    Brookhaven Academy went 4A -> 3A and kept a 4A rank of 11, which the
    dashboard then printed as "No. 11 in 3A" for an unbeaten team.

    An entry declares this by carrying ``classRankPool`` — the class MaxPreps
    still ranks it in.  Teams whose rank pool did not move are not tagged and
    keep their rank, which is why the 8-man division split is absent here:
    MaxPreps kept 8-man as two divisions all along and only our own scraper
    merged the label, so those ranks already line up.

    Delete the tag when MaxPreps adopts the new alignment and the rank becomes
    meaningful again.
    """
    entry = _load().get(season, {}).get(team_id)
    if entry is None:
        return True
    pool = entry.get("classRankPool")
    return pool is None or pool == entry.get("classification")
