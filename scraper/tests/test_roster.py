from scraper.roster import parse_roster


def test_parse_roster_returns_list_of_player_partials(load_json_fixture):
    data = load_json_fixture("team_roster.json")
    players = parse_roster(data)

    assert len(players) > 20, f"expected many players, got {len(players)}"
    p = players[0]
    assert {"name", "jersey", "position", "playerClass"} <= set(p.keys()), p


def test_parse_roster_normalizes_positions(load_json_fixture):
    data = load_json_fixture("team_roster.json")
    players = parse_roster(data)

    valid = {"QB", "RB", "WR", "TE", "OL", "DL", "LB", "DB", "K", "P", "ATH"}
    assert all(p["position"] in valid for p in players), \
        f"unnormalized positions present; sample: {[p['position'] for p in players[:10]]}"


def test_parse_roster_normalizes_classes(load_json_fixture):
    data = load_json_fixture("team_roster.json")
    players = parse_roster(data)
    valid = {"FR", "SO", "JR", "SR"}
    assert all(p["playerClass"] in valid for p in players), \
        f"unnormalized classes present; sample: {[p['playerClass'] for p in players[:10]]}"


def test_parse_roster_returns_height_weight(load_json_fixture):
    data = load_json_fixture("team_roster.json")
    players = parse_roster(data)
    # at least some players have a height/weight populated
    assert sum(1 for p in players if p.get("height")) > 0
    assert sum(1 for p in players if p.get("weight")) > 0
