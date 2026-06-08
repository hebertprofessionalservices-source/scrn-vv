from scraper.stats import parse_season_stats


def test_parse_season_stats_groups_by_player(load_json_fixture):
    payload = load_json_fixture("team_stats.json")
    stats = parse_season_stats(payload)

    assert isinstance(stats, dict)
    assert len(stats) >= 5, f"expected leaders for multiple players, got {len(stats)}"


def test_each_player_carries_required_keys(load_json_fixture):
    payload = load_json_fixture("team_stats.json")
    stats = parse_season_stats(payload)
    sample = next(iter(stats.values()))
    required = {"athleteId", "position", "classYear", "leaders"}
    assert required <= set(sample.keys()), f"missing keys: {required - set(sample.keys())}"
    assert isinstance(sample["leaders"], list)
    assert len(sample["leaders"]) >= 1


def test_known_categories_flatten_to_named_fields(load_json_fixture):
    payload = load_json_fixture("team_stats.json")
    stats = parse_season_stats(payload)
    # The fixture should contain at least one player who leads in a passing,
    # rushing, OR receiving stat — one of these flat fields must appear.
    any_flat = False
    for p in stats.values():
        for k in ("passing_yds_per_game", "passing_total_yds", "passing_td",
                 "rushing_yds_per_game", "rushing_total_yds", "rushing_td",
                 "receiving_yds_per_game", "receiving_total_yds", "receiving_td"):
            if k in p:
                any_flat = True
                break
        if any_flat:
            break
    assert any_flat, "no flat-named offensive stat fields produced"


def test_positions_normalized(load_json_fixture):
    payload = load_json_fixture("team_stats.json")
    stats = parse_season_stats(payload)
    valid = {"QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P", "ATH"}
    for p in stats.values():
        assert p["position"] in valid, f"unnormalized position: {p['position']}"
