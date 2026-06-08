import pytest
from pydantic import ValidationError

from scraper.normalize import build_games, build_players, build_team


def _valid_team_home():
    return {
        "name": "Starkville",
        "mascot": "Yellowjackets",
        "city": "Starkville, MS",
        "classification": "7A",
        "district": "District 2-7A",
        "headCoach": "Coach",
        "logoUrl": "https://x/logo.png",
        "record": {"wins": 0, "losses": 0},
        "rankings": {"stateOverall": None, "stateClass": None, "national": None},
        "maxprepsUrl": "https://maxpreps/x",
    }


def test_build_team_uses_team_home_record_when_no_schedule():
    home = _valid_team_home()
    home["record"] = {"wins": 8, "losses": 2}
    team = build_team(season="2025-26", team_home=home)
    assert team.id == "starkville-yellowjackets"
    assert team.record.wins == 8
    assert team.record.losses == 2
    # stats default to zero when no schedule
    assert team.stats.pointsFor == 0


def test_build_team_aggregates_points_from_schedule_finals():
    home = _valid_team_home()
    schedule = [
        {"date": "2025-08-29", "status": "final", "scoreFor": 34, "scoreAgainst": 17},
        {"date": "2025-09-05", "status": "final", "scoreFor": 21, "scoreAgainst": 14},
        {"date": "2025-09-12", "status": "scheduled", "scoreFor": None, "scoreAgainst": None},
    ]
    team = build_team(season="2025-26", team_home=home, schedule_games=schedule)
    assert team.stats.pointsFor == 55
    assert team.stats.pointsAgainst == 31


def test_build_team_rejects_invalid_classification():
    home = _valid_team_home()
    home["classification"] = ""
    with pytest.raises(ValidationError):
        build_team(season="2025-26", team_home=home)


def test_build_players_attaches_season_leaders_by_name():
    roster = [
        {"name": "Jordan Doe", "jersey": "12", "position": "QB",
         "playerClass": "SR", "height": "6-2", "weight": 195},
        {"name": "Sam Reed", "jersey": "5", "position": "RB",
         "playerClass": "JR", "height": "5-10", "weight": 180},
    ]
    season_stats = {
        "Jordan Doe": {
            "athleteId": "uuid1",
            "position": "QB",
            "classYear": 12,
            "leaders": [],
            "passing_total_yds": 2840,
            "passing_td": 31,
        },
    }
    players = build_players(
        team_id="starkville-yellowjackets", season="2025-26",
        roster=roster, season_stats=season_stats,
        games_played_by_label={"Jordan Doe": 10, "Sam Reed": 10},
    )
    by_name = {p.name: p for p in players}
    assert by_name["Jordan Doe"].stats.passing.td == 31
    assert by_name["Jordan Doe"].stats.passing.yds == 2840
    assert by_name["Sam Reed"].stats.passing.td == 0  # no leader entry


def test_build_players_handles_defensive_int_via_alias():
    roster = [{"name": "Tackle Tom", "jersey": "55", "position": "LB",
               "playerClass": "SR", "height": "6-0", "weight": 220}]
    season_stats = {
        "Tackle Tom": {
            "athleteId": "uuid", "position": "LB", "classYear": 12, "leaders": [],
            "defense_int": 4, "defense_tackles": 87, "defense_sacks": 6.5,
        },
    }
    players = build_players(
        team_id="x", season="2025-26", roster=roster,
        season_stats=season_stats, games_played_by_label={},
    )
    p = players[0]
    assert p.stats.defense.interceptions == 4  # int alias
    assert p.stats.defense.tackles == 87
    assert p.stats.defense.sacks == 6.5


def test_build_games_creates_one_record_per_schedule_entry():
    schedule = [
        {
            "date": "2025-08-29", "homeOrAway": "home",
            "opponentName": "Oak Grove", "opponentTeamId": None,
            "opponentLogoUrl": None, "status": "final",
            "scoreFor": 57, "scoreAgainst": 54,
            "venue": "Yellowjacket Field",
            "boxScoreUrl": "https://maxpreps/box/abc",
            "contestId": "contest-uuid",
        },
        {
            "date": "2025-09-05", "homeOrAway": "away",
            "opponentName": "Tupelo", "opponentTeamId": None,
            "opponentLogoUrl": None, "status": "scheduled",
            "scoreFor": None, "scoreAgainst": None,
            "venue": None, "boxScoreUrl": None,
            "contestId": "contest-uuid-2",
        },
    ]
    box_scores = {
        "https://maxpreps/box/abc": {
            "homeScore": 57, "awayScore": 54,
            "venue": "Yellowjacket Field",
            "quarterScores": {"home": [3, 20, 21, 13], "away": [6, 20, 14, 14]},
            "boxScore": {"passing": [], "rushing": [], "receiving": [], "defense": [
                {"playerLabel": "X Y", "tackles": 5, "sacks": 1, "int": 0, "ff": 0},
            ]},
            "dataStatus": "complete",
        },
    }
    games = build_games(
        season="2025-26",
        team_id="starkville-yellowjackets",
        opponent_lookup={"Oak Grove": "oak-grove-warriors", "Tupelo": "tupelo-golden-wave"},
        schedule=schedule,
        box_scores=box_scores,
        player_label_to_id={"X Y": "oak-grove-warriors-99-y"},
    )
    assert len(games) == 2
    final = next(g for g in games if g.status == "final")
    sched = next(g for g in games if g.status == "scheduled")
    assert final.homeTeamId == "starkville-yellowjackets"
    assert final.awayTeamId == "oak-grove-warriors"
    assert final.homeScore == 57 and final.awayScore == 54
    assert final.dataStatus == "complete"
    assert final.boxScore is not None
    assert sched.dataStatus == "missing"
    assert sched.boxScore is None


def test_build_games_falls_back_to_slug_for_unknown_opponent():
    schedule = [
        {"date": "2025-08-29", "homeOrAway": "home", "opponentName": "Unknown Town",
         "opponentTeamId": None, "opponentLogoUrl": None, "status": "scheduled",
         "scoreFor": None, "scoreAgainst": None, "venue": None,
         "boxScoreUrl": None, "contestId": "c"},
    ]
    games = build_games(
        season="2025-26", team_id="x", opponent_lookup={},
        schedule=schedule, box_scores={}, player_label_to_id={},
    )
    assert games[0].awayTeamId == "unknown-town"
