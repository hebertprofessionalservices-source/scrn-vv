from scraper.team_page import parse_team_home


def test_parse_team_home_extracts_core_fields(load_fixture):
    html = load_fixture("team_home.html")
    partial = parse_team_home(html, source_url="https://www.maxpreps.com/x")

    assert partial["name"], f"name missing: {partial}"
    assert partial["classification"], f"classification missing: {partial}"
    assert partial["record"]["wins"] >= 0
    assert partial["record"]["losses"] >= 0
    assert partial["maxprepsUrl"] == "https://www.maxpreps.com/x"
    assert "logoUrl" in partial


def test_parse_team_home_returns_expected_keys(load_fixture):
    html = load_fixture("team_home.html")
    partial = parse_team_home(html, source_url="u")
    for key in ("name", "mascot", "city", "classification", "district",
                "headCoach", "logoUrl", "record", "rankings", "maxprepsUrl"):
        assert key in partial, f"missing key: {key}"


def test_parse_team_home_name_is_starkville(load_fixture):
    # The captured fixture is Starkville Yellowjackets; name should reflect that.
    html = load_fixture("team_home.html")
    partial = parse_team_home(html, source_url="u")
    assert "Starkville" in partial["name"] or "Yellowjackets" in (partial.get("mascot") or "")
