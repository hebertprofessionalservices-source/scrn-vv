from scraper.nextdata import derive_team_season_urls, extract_build_id, to_next_data_url


def test_extract_build_id_from_next_data_script():
    html = '<html><script id="__NEXT_DATA__">{"props":{},"buildId":"abc123"}</script></html>'
    assert extract_build_id(html) == "abc123"


def test_extract_build_id_falls_back_to_regex():
    html = '<html><body>"buildId":"def456"</body></html>'
    assert extract_build_id(html) == "def456"


def test_extract_build_id_returns_none_when_missing():
    assert extract_build_id("<html></html>") is None


def test_to_next_data_url():
    url = to_next_data_url(
        page_url="https://www.maxpreps.com/ms/starkville/starkville-yellowjackets/football/25-26/roster/",
        build_id="abc123",
    )
    assert url == "https://www.maxpreps.com/_next/data/abc123/ms/starkville/starkville-yellowjackets/football/25-26/roster.json"


def test_derive_team_season_urls():
    urls = derive_team_season_urls(
        team_url="https://www.maxpreps.com/ms/starkville/starkville-yellowjackets/football/",
        season_short="25-26",
    )
    assert urls["roster"].endswith("/25-26/roster/")
    assert urls["schedule"].endswith("/25-26/schedule/")
    assert urls["stats"].endswith("/25-26/stats/")
    assert urls["team_home"].endswith("/25-26/")
