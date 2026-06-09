from pathlib import Path

from scraper.classes import (
    _FALLBACK_STATEDIVISIONID_25_26,
    _FALLBACK_STATEDIVISIONID_26_27,
    TARGET_CLASSES,
    discover_class_links,
)


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


def test_discover_fallback_uses_season_specific_uuids_25_26():
    """Fallback for 25-26 must use the 25-26 UUIDs, not the 26-27 ones."""
    links = discover_class_links("<html></html>", season_short="25-26")
    for entry in links:
        cls = entry["classification"]
        expected_sdid = _FALLBACK_STATEDIVISIONID_25_26[cls]
        assert expected_sdid in entry["url"], (
            f"{cls}: expected UUID {expected_sdid} not found in URL {entry['url']}"
        )


def test_discover_fallback_uses_season_specific_uuids_26_27():
    """Fallback for 26-27 must use the 26-27 UUIDs."""
    links = discover_class_links("<html></html>", season_short="26-27")
    for entry in links:
        cls = entry["classification"]
        expected_sdid = _FALLBACK_STATEDIVISIONID_26_27[cls]
        assert expected_sdid in entry["url"], (
            f"{cls}: expected UUID {expected_sdid} not found in URL {entry['url']}"
        )


def test_discover_all_seven_classes_any_season_empty_html():
    """discover_class_links always returns 7 entries when fed empty HTML."""
    for season in ("24-25", "25-26", "26-27", "27-28"):
        links = discover_class_links("<html></html>", season_short=season)
        classes = {entry["classification"] for entry in links}
        assert classes == set(TARGET_CLASSES), (
            f"season {season}: missing classes {set(TARGET_CLASSES) - classes}"
        )
