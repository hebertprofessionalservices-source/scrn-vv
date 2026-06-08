import re

from scraper.schedule import parse_schedule


def test_parse_schedule_returns_game_stubs(load_json_fixture):
    payload = load_json_fixture("team_schedule.json")
    games = parse_schedule(
        payload,
        team_url="https://www.maxpreps.com/ms/starkville/starkville-yellowjackets/football/",
    )

    assert len(games) >= 10, f"expected ~15 games, got {len(games)}"
    g = games[0]
    assert {"date", "homeOrAway", "opponentName", "status"} <= set(g.keys()), g


def test_parse_schedule_dates_are_iso(load_json_fixture):
    payload = load_json_fixture("team_schedule.json")
    games = parse_schedule(payload, team_url="x")
    iso = re.compile(r"^\d{4}-\d{2}-\d{2}$")
    for g in games:
        assert iso.match(g["date"]), f"bad date: {g['date']}"


def test_parse_schedule_status_is_valid(load_json_fixture):
    payload = load_json_fixture("team_schedule.json")
    games = parse_schedule(payload, team_url="x")
    statuses = {g["status"] for g in games}
    assert statuses.issubset({"final", "scheduled", "in_progress", "postponed"}), statuses


def test_parse_schedule_finals_have_scores(load_json_fixture):
    payload = load_json_fixture("team_schedule.json")
    games = parse_schedule(payload, team_url="x")
    finals = [g for g in games if g["status"] == "final"]
    if finals:
        for g in finals:
            assert g["scoreFor"] is not None
            assert g["scoreAgainst"] is not None


def test_parse_schedule_finals_have_box_score_url(load_json_fixture):
    payload = load_json_fixture("team_schedule.json")
    games = parse_schedule(
        payload,
        team_url="https://www.maxpreps.com",
    )
    finals = [g for g in games if g["status"] == "final"]
    if finals:
        # at least one final has a box score URL
        assert any(g.get("boxScoreUrl") for g in finals)
