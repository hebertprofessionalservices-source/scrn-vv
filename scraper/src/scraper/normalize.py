"""Normalize parser partials into pydantic-validated canonical models."""
from __future__ import annotations

from typing import Any

from scraper import slugify as slug_mod
from scraper.models import (
    BoxScore,
    BoxScoreEntry,
    DefenseStats,
    Game,
    KickingStats,
    PassingStats,
    Player,
    PlayerStats,
    QuarterScores,
    ReceivingStats,
    RushingStats,
    Team,
    TeamRankings,
    TeamRecord,
    TeamStats,
)

# Maps flat season_stats keys -> (sub_model_group, field_name_or_alias)
STAT_FLAT_TO_NESTED: dict[str, tuple[str, str]] = {
    "passing_total_yds":      ("passing", "yds"),
    "passing_td":             ("passing", "td"),
    "passing_completion_pct": ("passing", "rating"),
    "passing_qb_rating":      ("passing", "rating"),
    "rushing_total_yds":      ("rushing", "yds"),
    "rushing_td":             ("rushing", "td"),
    "receiving_total_yds":    ("receiving", "yds"),
    "receiving_td":           ("receiving", "td"),
    "defense_tackles":        ("defense", "tackles"),
    "defense_sacks":          ("defense", "sacks"),
    "defense_int":            ("defense", "int"),
    "defense_caused_fumbles": ("defense", "ff"),
    "kicking_fgm":            ("kicking", "fgm"),
    "kicking_xpm":            ("kicking", "xpm"),
}

# Sub-model factories keyed by group name
_SUB_MODEL_FACTORIES = {
    "passing":   PassingStats,
    "rushing":   RushingStats,
    "receiving": ReceivingStats,
    "defense":   DefenseStats,
    "kicking":   KickingStats,
}


def build_team(
    *,
    season: str,
    team_home: dict[str, Any],
    schedule_games: list[dict[str, Any]] | None = None,
) -> Team:
    """Build a validated Team from team_home parser output.

    Derives TeamStats.pointsFor / pointsAgainst from schedule finals.
    Raises ValidationError if classification is empty/invalid.
    """
    name = team_home["name"]
    mascot = team_home.get("mascot")
    team_id = slug_mod.team_id(name, mascot)

    record_raw = team_home.get("record", {"wins": 0, "losses": 0})
    record = TeamRecord(wins=record_raw.get("wins", 0), losses=record_raw.get("losses", 0))

    rankings_raw = team_home.get("rankings", {}) or {}
    rankings = TeamRankings(
        stateOverall=rankings_raw.get("stateOverall"),
        stateClass=rankings_raw.get("stateClass"),
        national=rankings_raw.get("national"),
    )

    points_for = 0
    points_against = 0
    if schedule_games:
        for g in schedule_games:
            if g.get("status") == "final":
                sf = g.get("scoreFor")
                sa = g.get("scoreAgainst")
                if sf is not None:
                    points_for += sf
                if sa is not None:
                    points_against += sa

    stats = TeamStats(pointsFor=points_for, pointsAgainst=points_against)

    return Team(
        id=team_id,
        name=name,
        mascot=mascot,
        city=team_home.get("city"),
        classification=team_home.get("classification", ""),
        district=team_home.get("district"),
        logoUrl=team_home.get("logoUrl"),
        season=season,
        record=record,
        rankings=rankings,
        stats=stats,
        headCoach=team_home.get("headCoach"),
        maxprepsUrl=team_home.get("maxprepsUrl"),
    )


def _build_player_stats(flat: dict[str, Any]) -> PlayerStats:
    """Construct PlayerStats from flat season_stats dict."""
    groups: dict[str, dict[str, Any]] = {}
    for flat_key, (group, field) in STAT_FLAT_TO_NESTED.items():
        if flat_key in flat:
            groups.setdefault(group, {})[field] = flat[flat_key]

    sub_models: dict[str, Any] = {}
    for group, factory in _SUB_MODEL_FACTORIES.items():
        if group in groups:
            sub_models[group] = factory(**groups[group])
        else:
            sub_models[group] = factory()

    return PlayerStats(**sub_models)


def build_players(
    *,
    team_id: str,
    season: str,
    roster: list[dict[str, Any]],
    season_stats: dict[str, dict[str, Any]],
    games_played_by_label: dict[str, int] | None = None,
) -> list[Player]:
    """Build validated Player records."""
    gp_map = games_played_by_label or {}
    players: list[Player] = []

    for r in roster:
        name = r["name"]
        jersey = r.get("jersey")
        player_id = slug_mod.player_id(team_id, jersey, name)

        flat = season_stats.get(name, {})
        stats = _build_player_stats(flat)

        p = Player(
            id=player_id,
            teamId=team_id,
            season=season,
            name=name,
            jersey=jersey,
            position=r["position"],
            **{"class": r["playerClass"]},
            height=r.get("height"),
            weight=r.get("weight"),
            stats=stats,
            gamesPlayed=gp_map.get(name, 0),
        )
        players.append(p)

    return players


def _build_box_score_entry(
    raw: dict[str, Any],
    player_label_to_id: dict[str, str],
) -> BoxScoreEntry:
    """Build a BoxScoreEntry from a raw parser dict."""
    raw = dict(raw)  # copy to avoid mutating caller's data
    label = raw.pop("playerLabel", None) or ""
    player_id = player_label_to_id.get(label, label)

    # Build via aliased dict so "int" key works
    entry_data: dict[str, Any] = {"playerId": player_id}
    for key, val in raw.items():
        entry_data[key] = val

    return BoxScoreEntry.model_validate(entry_data)


def _build_box_score(
    bs_raw: dict[str, Any],
    player_label_to_id: dict[str, str],
) -> BoxScore:
    """Build a BoxScore model from parse_box_score boxScore dict."""
    passing = [
        _build_box_score_entry(e, player_label_to_id)
        for e in (bs_raw.get("passing") or [])
    ]
    rushing = [
        _build_box_score_entry(e, player_label_to_id)
        for e in (bs_raw.get("rushing") or [])
    ]
    receiving = [
        _build_box_score_entry(e, player_label_to_id)
        for e in (bs_raw.get("receiving") or [])
    ]
    defense = [
        _build_box_score_entry(e, player_label_to_id)
        for e in (bs_raw.get("defense") or [])
    ]
    return BoxScore(passing=passing, rushing=rushing, receiving=receiving, defense=defense)


def build_games(
    *,
    season: str,
    team_id: str,
    opponent_lookup: dict[str, str],
    schedule: list[dict[str, Any]],
    box_scores: dict[str, dict[str, Any]],
    player_label_to_id: dict[str, str] | None = None,
) -> list[Game]:
    """Build validated Game records."""
    label_map = player_label_to_id or {}
    games: list[Game] = []

    for entry in schedule:
        date = entry.get("date") or ""
        if not date:
            continue

        home_or_away = entry.get("homeOrAway", "home")
        opponent_name = entry.get("opponentName") or ""
        opponent_id = opponent_lookup.get(
            opponent_name,
            slug_mod.team_id(opponent_name, None),
        )

        if home_or_away == "home":
            home_team_id = team_id
            away_team_id = opponent_id
        else:
            home_team_id = opponent_id
            away_team_id = team_id

        status = entry.get("status", "scheduled")
        score_for = entry.get("scoreFor")
        score_against = entry.get("scoreAgainst")

        if home_or_away == "home":
            home_score = score_for
            away_score = score_against
        else:
            home_score = score_against
            away_score = score_for

        box_score_url = entry.get("boxScoreUrl") or ""
        parsed_bs = box_scores.get(box_score_url) if box_score_url else None

        box_score_obj: BoxScore | None = None
        data_status: str = "missing"

        if parsed_bs is not None:
            raw_bs = parsed_bs.get("boxScore")
            parsed_data_status = parsed_bs.get("dataStatus", "missing")

            if raw_bs is not None and parsed_data_status == "complete":
                box_score_obj = _build_box_score(raw_bs, label_map)
                data_status = "complete"
            elif raw_bs is not None:
                box_score_obj = _build_box_score(raw_bs, label_map)
                data_status = parsed_data_status or "incomplete"
            else:
                data_status = parsed_data_status or "missing"

        qs_raw = (parsed_bs or {}).get("quarterScores", {}) or {}
        quarter_scores = QuarterScores(
            home=qs_raw.get("home", []),
            away=qs_raw.get("away", []),
        )

        game_id = slug_mod.game_id(date, away_team_id, home_team_id)

        g = Game(
            id=game_id,
            season=season,
            week=0,
            date=date,
            homeTeamId=home_team_id,
            awayTeamId=away_team_id,
            homeScore=home_score,
            awayScore=away_score,
            quarterScores=quarter_scores,
            status=status,
            dataStatus=data_status,
            venue=entry.get("venue") or (parsed_bs or {}).get("venue"),
            boxScore=box_score_obj,
            maxprepsUrl=box_score_url or None,
        )
        games.append(g)

    return games
