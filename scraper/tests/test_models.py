import pytest
from pydantic import ValidationError

from scraper.models import (
    Game,
    Player,
    PlayerStats,
    Team,
    TeamRankings,
    TeamRecord,
    TeamStats,
)


def _valid_team_kwargs():
    return dict(
        id="starkville-yellowjackets",
        name="Starkville",
        mascot="Yellowjackets",
        city="Starkville, MS",
        classification="7A",
        district="District 2-7A",
        logoUrl="/team-logos/starkville-yellowjackets.png",
        colors={"primary": "#FFC72C", "secondary": "#000000"},
        season="2025-26",
        record=TeamRecord(wins=8, losses=2),
        rankings=TeamRankings(stateOverall=3, stateClass=1, national=None),
        stats=TeamStats(
            pointsFor=412, pointsAgainst=178,
            yardsFor=4210, yardsAgainst=2890,
            passYdsFor=1820, rushYdsFor=2390,
            passYdsAgainst=1410, rushYdsAgainst=1480,
            turnoversForced=18, turnoversLost=9,
        ),
        headCoach="Chris Chambless",
        maxprepsUrl="https://www.maxpreps.com/...",
    )


def test_team_round_trip():
    team = Team(**_valid_team_kwargs())
    dumped = team.model_dump()
    assert dumped["id"] == "starkville-yellowjackets"
    assert dumped["record"]["wins"] == 8


def test_team_rejects_bad_classification():
    bad = _valid_team_kwargs()
    bad["classification"] = "11A"
    with pytest.raises(ValidationError):
        Team(**bad)


def test_team_allows_mais_classifications():
    for c in ("MAIS-6A", "MAIS-5A", "MAIS-4A", "MAIS-3A"):
        kw = _valid_team_kwargs()
        kw["classification"] = c
        Team(**kw)


def test_team_season_must_match_pattern():
    bad = _valid_team_kwargs()
    bad["season"] = "25-26"
    with pytest.raises(ValidationError):
        Team(**bad)


def test_player_defaults_all_stat_groups_to_zero():
    p = Player(
        id="x-12-doe",
        teamId="x",
        season="2025-26",
        name="Jordan Doe",
        jersey="12",
        position="QB",
        playerClass="SR",
        height="6-2",
        weight=195,
        gamesPlayed=10,
    )
    s = p.stats
    assert s.passing.att == 0
    assert s.rushing.att == 0
    assert s.receiving.rec == 0
    assert s.defense.tackles == 0
    assert s.kicking.fgm == 0


def test_player_rejects_bad_position():
    with pytest.raises(ValidationError):
        Player(
            id="x", teamId="x", season="2025-26",
            name="x", jersey="1", position="BOGUS",
            playerClass="SR", gamesPlayed=0,
        )


def test_game_data_status_drives_box_score_nullability():
    g = Game(
        id="2025-09-12-a-at-b",
        season="2025-26",
        week=3,
        date="2025-09-12",
        homeTeamId="b",
        awayTeamId="a",
        homeScore=17,
        awayScore=34,
        quarterScores={"home": [3, 7, 0, 7], "away": [14, 7, 7, 6]},
        status="final",
        dataStatus="missing",
        boxScore=None,
    )
    assert g.boxScore is None


def test_game_complete_requires_box_score():
    with pytest.raises(ValidationError):
        Game(
            id="g", season="2025-26", week=1, date="2025-09-12",
            homeTeamId="b", awayTeamId="a",
            homeScore=10, awayScore=20,
            status="final", dataStatus="complete", boxScore=None,
        )


def test_player_stats_allow_explicit_override():
    s = PlayerStats(passing={"att": 100, "cmp": 60, "yds": 800, "td": 7, "int": 2, "rating": 95.0})
    assert s.passing.att == 100
