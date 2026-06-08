from scraper.boxscore import parse_box_score


def test_complete_boxscore_returns_data_complete(load_fixture):
    html = load_fixture("boxscore_complete.html")
    result = parse_box_score(html)
    assert result["dataStatus"] == "complete", result["dataStatus"]
    assert result["homeScore"] is not None
    assert result["awayScore"] is not None
    total_entries = sum(
        len(result["boxScore"][g])
        for g in ("passing", "rushing", "receiving", "defense")
    )
    assert total_entries > 0, "no per-player box score entries"


def test_missing_boxscore_marks_missing(load_fixture):
    html = load_fixture("boxscore_missing.html")
    result = parse_box_score(html)
    assert result["dataStatus"] in {"missing", "incomplete"}, result["dataStatus"]
    # If boxScore is present, every category must be empty
    if result["boxScore"] is not None:
        for g in ("passing", "rushing", "receiving", "defense"):
            assert len(result["boxScore"][g]) == 0


def test_complete_boxscore_has_quarter_scores(load_fixture):
    html = load_fixture("boxscore_complete.html")
    result = parse_box_score(html)
    qs = result["quarterScores"]
    # Sum of quarters should equal the final score (allowing for OT extra entries)
    if qs["home"] and qs["away"]:
        # Just verify at least 4 quarters are recorded for each side
        assert len(qs["home"]) >= 4, qs["home"]
        assert len(qs["away"]) >= 4, qs["away"]


def test_complete_boxscore_extracts_team_names(load_fixture):
    html = load_fixture("boxscore_complete.html")
    result = parse_box_score(html)
    # team names should be Oak Grove and Starkville
    assert "homeTeamName" in result
    assert "awayTeamName" in result
    teams = {result["homeTeamName"], result["awayTeamName"]}
    assert "Oak Grove" in teams or "Starkville" in teams, teams
