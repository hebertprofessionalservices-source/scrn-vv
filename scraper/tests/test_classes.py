from scraper.classes import list_class_urls


def test_list_class_urls_returns_seven_mhsaa_classes():
    urls = list_class_urls(season="25-26")
    classes = {entry["classification"] for entry in urls}
    assert classes == {"1A", "2A", "3A", "4A", "5A", "6A", "7A"}


def test_class_url_pattern_correct():
    urls = list_class_urls(season="25-26")
    for entry in urls:
        assert entry["url"].startswith("https://www.maxpreps.com/ms/football/25-26/class/class-")
        assert entry["url"].endswith("/")


def test_season_substituted():
    urls = list_class_urls(season="24-25")
    assert all("24-25" in u["url"] for u in urls)
