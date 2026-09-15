from pathlib import Path

from scraper.classes import (
    _FALLBACK_STATEDIVISIONID_24_25,
    _FALLBACK_STATEDIVISIONID_25_26,
    _FALLBACK_STATEDIVISIONID_26_27,
    EIGHT_MAN_ALIAS,
    TARGET_CLASSES,
    discover_class_links,
)

# From 26-27 on, MAIS-8M-2A is aliased onto MAIS-8M-1A (see EIGHT_MAN_ALIAS),
# so the set of distinct classification labels a merged season returns is one
# smaller than TARGET_CLASSES.
MERGED_CLASSES = set(TARGET_CLASSES) - set(EIGHT_MAN_ALIAS)


def _landing_html() -> str:
    return (Path(__file__).parent / "fixtures" / "ms_football_landing.html").read_text(
        encoding="utf-8"
    )


def test_discover_returns_all_seven_classes():
    links = discover_class_links(_landing_html(), season_short="26-27")
    classes = {entry["classification"] for entry in links}
    assert classes == MERGED_CLASSES, f"missing classes: {MERGED_CLASSES - classes}"


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
    """Fallback for 26-27 must use the 26-27 UUIDs.

    MAIS-8M-1A and MAIS-8M-2A are merged into one label this season (see
    EIGHT_MAN_ALIAS), so two entries now share the "MAIS-8M-1A" label with
    different URLs — check every original class's UUID appears in *some*
    returned URL instead of indexing entries by their (now-collapsed) label.
    """
    links = discover_class_links("<html></html>", season_short="26-27")
    urls = [entry["url"] for entry in links]
    for cls, expected_sdid in _FALLBACK_STATEDIVISIONID_26_27.items():
        assert any(expected_sdid in url for url in urls), (
            f"{cls}: expected UUID {expected_sdid} not found in any URL"
        )


def test_discover_uses_24_25_fallback_when_season_is_24_25():
    """Fallback for 24-25 must use the 24-25 UUIDs and embed the 24-25 season path.

    MAIS divisions joined the dataset in 25-26; their 24-25 statedivision UUIDs
    were never probed, so the 24-25 fallback intentionally covers MHSAA only.
    """
    links = discover_class_links("<html></html>", season_short="24-25")
    classes = {entry["classification"] for entry in links}
    expected = set(_FALLBACK_STATEDIVISIONID_24_25)
    assert classes == expected, f"missing: {expected - classes}"
    for entry in links:
        cls = entry["classification"]
        expected_sdid = _FALLBACK_STATEDIVISIONID_24_25[cls]
        assert "/24-25/" in entry["url"], f"{cls}: expected /24-25/ in URL {entry['url']}"
        assert expected_sdid in entry["url"], (
            f"{cls}: expected UUID {expected_sdid} not found in URL {entry['url']}"
        )


def test_discover_falls_back_to_26_27_for_unknown_season():
    """An unknown future season (e.g. 27-28) has no dedicated fallback yet — should still
    produce classes via the 26-27 fallback (which is the default), with the
    8-man merge still applied since 27-28 is past EIGHT_MAN_MERGE_SEASON."""
    links = discover_class_links("<html></html>", season_short="27-28")
    classes = {entry["classification"] for entry in links}
    assert classes == MERGED_CLASSES


def test_discover_all_classes_any_season_empty_html():
    """discover_class_links returns every fallback class when fed empty HTML.

    24-25 predates the MAIS import, so it expects MHSAA classes only. 26-27
    and 27-28 fall under the 8-man merge, so they expect one fewer class than
    25-26 (MAIS-8M-2A collapses onto MAIS-8M-1A).
    """
    for season in ("24-25", "25-26", "26-27", "27-28"):
        links = discover_class_links("<html></html>", season_short=season)
        classes = {entry["classification"] for entry in links}
        if season == "24-25":
            expected = set(_FALLBACK_STATEDIVISIONID_24_25)
        elif season == "25-26":
            expected = set(TARGET_CLASSES)
        else:
            expected = MERGED_CLASSES
        assert classes == expected, (
            f"season {season}: missing classes {expected - classes}"
        )


def test_discover_merges_eight_man_from_26_27_but_not_25_26():
    """The 8-man merge is season-gated: 25-26 keeps two divisions, 26-27 doesn't."""
    pre_merge = discover_class_links("<html></html>", season_short="25-26")
    assert {e["classification"] for e in pre_merge} >= {"MAIS-8M-1A", "MAIS-8M-2A"}

    post_merge = discover_class_links("<html></html>", season_short="26-27")
    classes = {e["classification"] for e in post_merge}
    assert "MAIS-8M-2A" not in classes
    assert "MAIS-8M-1A" in classes
    # Both original 8-man directories are still fetched (two URLs), just
    # under the one label now.
    eight_man_entries = [e for e in post_merge if e["classification"] == "MAIS-8M-1A"]
    assert len(eight_man_entries) == 2
