import re

from scraper.teams import (
    _canonicalize_team_url,
    parse_team_directory,
    parse_team_directory_from_html,
)

_BARE_TEAM_URL_RE = re.compile(r"^https://www\.maxpreps\.com/ms/[^/]+/[^/]+/football/$")


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


def test_parse_team_directory_from_html(load_fixture):
    html = load_fixture("class_7a_directory.html")
    teams = parse_team_directory_from_html(html)
    assert len(teams) > 5, f"expected >5 teams from HTML fixture, got {len(teams)}"
    t = teams[0]
    assert {"name", "url", "schoolId"} <= set(t.keys())
    assert t["url"].startswith("https://")


def test_parse_team_directory_from_html_handles_empty():
    assert parse_team_directory_from_html("<html></html>") == []


# ---------------------------------------------------------------------------
# Regression tests: canonicalize_team_url and URL format from fixture
# ---------------------------------------------------------------------------


def test_canonicalize_team_url_strips_season_and_subpage():
    raw = "https://www.maxpreps.com/ms/long-beach/long-beach-bearcats/football/25-26/schedule/"
    assert _canonicalize_team_url(raw) == "https://www.maxpreps.com/ms/long-beach/long-beach-bearcats/football/"


def test_canonicalize_team_url_strips_season_only():
    raw = "https://www.maxpreps.com/ms/tupelo/tupelo-golden-wave/football/25-26/"
    assert _canonicalize_team_url(raw) == "https://www.maxpreps.com/ms/tupelo/tupelo-golden-wave/football/"


def test_canonicalize_team_url_leaves_bare_url_unchanged():
    bare = "https://www.maxpreps.com/ms/biloxi/biloxi-indians/football/"
    assert _canonicalize_team_url(bare) == bare


def test_parse_team_directory_all_urls_are_bare_football(load_json_fixture):
    """Every URL returned by parse_team_directory must end with /football/."""
    payload = load_json_fixture("class_7a_directory.json")
    teams = parse_team_directory(payload)
    bad = [t["url"] for t in teams if not _BARE_TEAM_URL_RE.match(t["url"])]
    assert not bad, f"Non-canonical team URLs: {bad}"


def test_parse_team_directory_from_html_all_urls_are_bare_football(load_fixture):
    """Same check against the HTML fixture."""
    html = load_fixture("class_7a_directory.html")
    teams = parse_team_directory_from_html(html)
    bad = [t["url"] for t in teams if not _BARE_TEAM_URL_RE.match(t["url"])]
    assert not bad, f"Non-canonical team URLs from HTML: {bad}"
