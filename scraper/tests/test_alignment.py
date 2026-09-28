"""The association's alignment must survive a scrape that disagrees with it."""
import collections

from scraper.alignment import _load, apply_alignment, class_rank_is_comparable
from scraper.normalize import build_team

SEASON = "2026-27"


def test_unlisted_team_passes_through_untouched():
    assert apply_alignment("meridian-wildcats-wildcats", SEASON, "7A", "7A Region 3") == (
        "7A",
        "7A Region 3",
    )


def test_unlisted_season_passes_through_untouched():
    """Overrides are season-scoped — 2025-26 keeps whatever was scraped."""
    assert apply_alignment("discovery-christian", "2025-26", "MAIS-2A", "MAIS 2A District 4") == (
        "MAIS-2A",
        "MAIS 2A District 4",
    )


def test_override_beats_scraped_values():
    """Discovery Christian moved MAIS-2A -> 8-Man Div I for 26-27."""
    assert apply_alignment("discovery-christian", SEASON, "MAIS-2A", "MAIS 2A District 4") == (
        "MAIS-8M-1A",
        "MAIS 8-Man 1A District 3 (8 Man)",
    )


def test_build_team_applies_the_override():
    """The guard has to sit in build_team, or a nightly scrape undoes it."""
    team = build_team(
        season=SEASON,
        team_home={
            # MaxPreps' name already carries the mascot, so the derived id
            # doubles it: silliman-institute-wildcats-wildcats.
            "name": "Silliman Institute Wildcats",
            "mascot": "Wildcats",
            "classification": "MAIS-4A",
            "district": "MAIS 4A District 4",
            "maxprepsUrl": "https://example.invalid/silliman",
        },
    )
    assert team.classification == "MAIS-3A"
    assert team.district == "MAIS 3A District 5"


def test_eight_man_stays_split_into_two_divisions():
    """MaxPreps merged 8-man for 26-27; the association did not."""
    entries = _load()[SEASON].values()
    by_class = collections.Counter(e["classification"] for e in entries)
    assert by_class["MAIS-8M-1A"] == 17
    assert by_class["MAIS-8M-2A"] == 15


def test_published_class_and_district_counts():
    """Slide headline counts: 4A 14/3 districts, 3A 21/5, 2A 4 districts."""
    entries = _load()[SEASON].values()
    shape = collections.defaultdict(set)
    counts = collections.Counter()
    for e in entries:
        counts[e["classification"]] += 1
        shape[e["classification"]].add(e["district"])
    assert counts["MAIS-4A"] == 14 and len(shape["MAIS-4A"]) == 3
    assert counts["MAIS-3A"] == 21 and len(shape["MAIS-3A"]) == 5
    assert len(shape["MAIS-2A"]) == 4


def test_cross_class_mover_loses_its_stale_class_rank():
    """Brookhaven's 4A rank of 11 must not reappear as "No. 11 in 3A"."""
    assert class_rank_is_comparable("brookhaven-academy-cougars-cougars", SEASON) is False
    team = build_team(
        season=SEASON,
        team_home={
            "name": "Brookhaven Academy Cougars",
            "mascot": "Cougars",
            "classification": "MAIS-4A",
            "district": "MAIS 4A District 3",
            "rankings": {"stateOverall": 100, "stateClass": 11, "national": None},
            "maxprepsUrl": "https://example.invalid/brookhaven",
        },
    )
    assert team.classification == "MAIS-3A"
    assert team.rankings.stateClass is None
    # One statewide list, so it survives the class move.
    assert team.rankings.stateOverall == 100


def test_eight_man_relabel_keeps_its_rank():
    """MaxPreps kept 8-man split, so those ranks were never cross-pool."""
    assert class_rank_is_comparable("tunica-academy-blue-devils-blue-devils", SEASON) is True
    team = build_team(
        season=SEASON,
        team_home={
            "name": "Tunica Academy Blue Devils",
            "mascot": "Blue Devils",
            "classification": "MAIS-8M-1A",
            "district": "MAIS 8-Man 2A District 5 (8 Man)",
            "rankings": {"stateOverall": 200, "stateClass": 1, "national": None},
            "maxprepsUrl": "https://example.invalid/tunica",
        },
    )
    assert team.classification == "MAIS-8M-2A"
    assert team.rankings.stateClass == 1


def test_untouched_team_keeps_its_rank():
    assert class_rank_is_comparable("meridian-wildcats-wildcats", SEASON) is True
