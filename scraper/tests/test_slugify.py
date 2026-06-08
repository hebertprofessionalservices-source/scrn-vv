from scraper.slugify import game_id, player_id, slugify, team_id


def test_slugify_lowercases_and_dashes_spaces():
    assert slugify("Starkville Yellowjackets") == "starkville-yellowjackets"


def test_slugify_strips_punctuation_and_collapses_dashes():
    assert slugify("St. Andrew's   (MS)") == "st-andrews-ms"


def test_slugify_handles_apostrophes_without_dash():
    assert slugify("D'Iberville") == "diberville"


def test_team_id_combines_name_and_mascot():
    assert team_id("Starkville", "Yellowjackets") == "starkville-yellowjackets"


def test_team_id_handles_missing_mascot():
    assert team_id("Foo", None) == "foo"
    assert team_id("Foo", "") == "foo"


def test_player_id_includes_jersey_and_last_name():
    assert player_id(
        team_id_="starkville-yellowjackets",
        jersey="12",
        full_name="Jordan Doe",
    ) == "starkville-yellowjackets-12-doe"


def test_player_id_handles_single_name_player():
    assert player_id(
        team_id_="foo-bar",
        jersey="7",
        full_name="Cher",
    ) == "foo-bar-7-cher"


def test_player_id_with_missing_jersey_uses_x():
    assert player_id(
        team_id_="foo-bar",
        jersey=None,
        full_name="Jane Smith",
    ) == "foo-bar-x-smith"


def test_game_id_format():
    assert game_id(
        date="2025-09-12",
        away_team_id="starkville-yellowjackets",
        home_team_id="tupelo-golden-wave",
    ) == "2025-09-12-starkville-yellowjackets-at-tupelo-golden-wave"
