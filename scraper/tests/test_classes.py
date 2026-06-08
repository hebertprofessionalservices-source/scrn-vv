from pathlib import Path

from scraper.classes import TARGET_CLASSES, discover_class_links


def _landing_html() -> str:
    return (Path(__file__).parent / "fixtures" / "ms_football_landing.html").read_text(
        encoding="utf-8"
    )


def test_discover_returns_all_seven_classes():
    links = discover_class_links(_landing_html(), season_short="26-27")
    classes = {entry["classification"] for entry in links}
    assert classes == set(TARGET_CLASSES), f"missing classes: {set(TARGET_CLASSES) - classes}"


def test_discover_substitutes_requested_season():
    links = discover_class_links(_landing_html(), season_short="25-26")
    for entry in links:
        assert "/ms/football/25-26/class/class-" in entry["url"], entry["url"]
        assert "statedivisionid=" in entry["url"], entry["url"]


def test_discover_falls_back_for_missing_classes():
    # An empty landing should still yield 7 classes via fallback.
    links = discover_class_links("<html></html>", season_short="25-26")
    classes = {entry["classification"] for entry in links}
    assert classes == set(TARGET_CLASSES)


def test_discover_fallback_substitutes_requested_season():
    links = discover_class_links("<html></html>", season_short="24-25")
    for entry in links:
        assert "/ms/football/24-25/class/class-" in entry["url"], entry["url"]
