from scraper.nextdata import (
    derive_team_season_urls,
    extract_build_id,
    extract_next_data_payload,
    to_next_data_url,
)


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


def test_extract_build_id_strips_whitespace():
    html_json = '<html><script id="__NEXT_DATA__">  \n {"buildId": "abc"}  \n </script></html>'
    assert extract_build_id(html_json) == "abc"

    html_regex = '<html>...some content..."buildId":"def123"\n...</html>'
    assert extract_build_id(html_regex) == "def123"


def test_to_next_data_url_strips_build_id():
    url = to_next_data_url(
        page_url="https://www.maxpreps.com/ms/x/y/football/25-26/roster/",
        build_id="abc123\n",
    )
    assert "\n" not in url
    assert "/abc123/" in url


def test_derive_team_season_urls():
    urls = derive_team_season_urls(
        team_url="https://www.maxpreps.com/ms/starkville/starkville-yellowjackets/football/",
        season_short="25-26",
    )
    assert urls["roster"].endswith("/25-26/roster/")
    assert urls["schedule"].endswith("/25-26/schedule/")
    assert urls["stats"].endswith("/25-26/stats/")
    assert urls["team_home"].endswith("/25-26/")


def test_extract_next_data_payload_happy_path():
    html = '<html><script id="__NEXT_DATA__">{"props":{"pageProps":{"a":1}}}</script></html>'
    payload = extract_next_data_payload(html)
    assert payload == {"props": {"pageProps": {"a": 1}}}


def test_extract_next_data_payload_missing_tag():
    assert extract_next_data_payload("<html></html>") is None


def test_extract_next_data_payload_malformed_json():
    html = '<html><script id="__NEXT_DATA__">not-json</script></html>'
    assert extract_next_data_payload(html) is None


class TestExtractRegionRecord:
    def _payload(self, wlt):
        return {
            "props": {"pageProps": {"teamContext": {"standingsData": {
                "leagueStanding": {"conferenceWinLossTies": wlt}
            }}}}
        }

    def test_parses_win_loss(self):
        from scraper.nextdata import extract_region_record
        assert extract_region_record(self._payload("2-3")) == {"wins": 2, "losses": 3}

    def test_parses_win_loss_ties(self):
        from scraper.nextdata import extract_region_record
        assert extract_region_record(self._payload("4-1-1")) == {"wins": 4, "losses": 1}

    def test_missing_standings_returns_none(self):
        from scraper.nextdata import extract_region_record
        assert extract_region_record({"props": {"pageProps": {}}}) is None
        assert extract_region_record(self._payload(None)) is None
        assert extract_region_record(self._payload("bogus")) is None

    def test_real_fixture_has_region_record(self):
        import json
        from pathlib import Path

        from scraper.nextdata import extract_region_record
        payload = json.loads(
            (Path(__file__).parent / "fixtures" / "team_schedule.json").read_text(encoding="utf-8")
        )
        assert extract_region_record(payload) == {"wins": 2, "losses": 3}
