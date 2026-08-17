"""Out-of-state opponents must not resolve onto same-named Mississippi teams."""

from __future__ import annotations

from scraper.opponents import (
    build_alias_map,
    disambiguate_opponents,
    url_side_state,
)

GERMANTOWN_MS = {
    "id": "germantown-mavericks-mavericks",
    "name": "Germantown Mavericks",
    "mascot": "Mavericks",
    "maxprepsUrl": "https://www.maxpreps.com/ms/madison/germantown-mavericks/football/",
}
DESOTO_CENTRAL = {
    "id": "desoto-central-jaguars-jaguars",
    "name": "DeSoto Central Jaguars",
    "mascot": "Jaguars",
    "maxprepsUrl": "https://www.maxpreps.com/ms/southaven/desoto-central-jaguars/football/",
}
ROSSVILLE_TN = {
    "id": "rossville-christian-academy-wolves-wolves",
    "name": "Rossville Christian Academy Wolves",
    "mascot": "Wolves",
    "maxprepsUrl": "https://www.maxpreps.com/tn/rossville/rossville-christian-academy-wolves/football/",
}
TEAMS = [GERMANTOWN_MS, DESOTO_CENTRAL, ROSSVILLE_TN]

INTERSTATE_URL = (
    "https://www.maxpreps.com/inter-state/football/game/"
    "desoto-central-southaven-ms-vs-germantown-tn/10-2-2026/?c=26b5e652"
)
IN_STATE_URL = (
    "https://www.maxpreps.com/ms/football/game/"
    "germantown-madison-vs-starkville/10-9-2026/?c=1b6353e7"
)


def _game(home: str, away: str, url: str) -> dict:
    return {"id": "g1", "homeTeamId": home, "awayTeamId": away, "maxprepsUrl": url}


def test_alias_map_drops_ambiguous_names() -> None:
    twin = {**GERMANTOWN_MS, "id": "other-germantown", "maxprepsUrl": "https://www.maxpreps.com/ms/x/y/football/"}
    alias = build_alias_map([GERMANTOWN_MS, twin])
    assert "germantown" not in alias


def test_url_side_state_reads_the_matching_side() -> None:
    assert url_side_state(INTERSTATE_URL, "germantown") == "tn"
    assert url_side_state(INTERSTATE_URL, "desoto-central") == "ms"
    # In-state URLs carry a city, not a state code.
    assert url_side_state(IN_STATE_URL, "germantown") is None


def test_out_of_state_namesake_is_disambiguated() -> None:
    games = [_game("germantown", DESOTO_CENTRAL["id"], INTERSTATE_URL)]
    fixes = disambiguate_opponents(games, TEAMS)
    assert fixes == [("g1", "germantown", "germantown-tn")]
    assert games[0]["homeTeamId"] == "germantown-tn"


def test_in_state_opponent_is_left_alone() -> None:
    games = [_game("starkville", "germantown", IN_STATE_URL)]
    assert disambiguate_opponents(games, TEAMS) == []
    assert games[0]["awayTeamId"] == "germantown"


def test_genuinely_out_of_state_team_of_ours_is_left_alone() -> None:
    """Our footprint really does include AR/LA/TN schools; only conflicts move."""
    url = (
        "https://www.maxpreps.com/inter-state/football/game/"
        "lee-academy-clarksdale-ms-vs-rossville-christian-academy-tn/8-14-2026/?c=977"
    )
    games = [_game("rossville-christian-academy", "lee-academy-colts-colts", url)]
    assert disambiguate_opponents(games, TEAMS) == []


def test_canonical_ids_are_never_rewritten() -> None:
    games = [_game(GERMANTOWN_MS["id"], DESOTO_CENTRAL["id"], INTERSTATE_URL)]
    assert disambiguate_opponents(games, TEAMS) == []
