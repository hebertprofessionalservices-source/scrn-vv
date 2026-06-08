from scraper.teams import parse_team_directory


def test_parse_team_directory_returns_team_records(load_json_fixture):
    payload = load_json_fixture("class_7a_directory.json")
    teams = parse_team_directory(payload)

    assert len(teams) >= 20, f"expected ~25 teams, got {len(teams)}"
    t = teams[0]
    assert {"name", "url", "schoolId"} <= set(t.keys())
    assert t["url"].startswith("https://")


def test_parse_team_directory_deduplicates(load_json_fixture):
    payload = load_json_fixture("class_7a_directory.json")
    teams = parse_team_directory(payload)
    urls = [t["url"] for t in teams]
    assert len(urls) == len(set(urls)), "duplicate team URLs"


def test_parse_team_directory_extracts_known_team(load_json_fixture):
    payload = load_json_fixture("class_7a_directory.json")
    teams = parse_team_directory(payload)
    names = {t["name"] for t in teams}
    # Biloxi is in the 7A fixture (we verified)
    assert "Biloxi" in names


def test_parse_team_directory_handles_missing_data():
    # Empty / minimal payload
    result = parse_team_directory({})
    assert result == []
    result = parse_team_directory({"props": {"pageProps": {"layoutProps": {"tableData": []}}}})
    assert result == []
