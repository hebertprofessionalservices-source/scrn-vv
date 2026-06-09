"""Pipeline orchestrator + Typer CLI for the Varsity Voices scraper."""
from __future__ import annotations

import asyncio
import contextlib
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import structlog
import typer

from scraper import classes as classes_mod
from scraper import config, slugify
from scraper import teams as teams_mod
from scraper.boxscore import parse_box_score
from scraper.browser import BrowserHarness
from scraper.cache import CrawlCache
from scraper.logos import download_team_logo
from scraper.nextdata import derive_team_season_urls, extract_next_data_payload
from scraper.normalize import build_games, build_players, build_team
from scraper.report import RunStats, build_report
from scraper.roster import parse_roster
from scraper.schedule import parse_schedule
from scraper.stats import parse_season_stats
from scraper.team_page import parse_team_home

log = structlog.get_logger(__name__)

app = typer.Typer(help="Varsity Voices MaxPreps scraper CLI.")


def _short_season(season: str) -> str:
    """Convert 'YYYY-YY' → 'YY-YY'.

    Example: '2025-26' → '25-26', '2024-25' → '24-25'.
    """
    parts = season.split("-")
    if len(parts) == 2 and len(parts[0]) == 4:
        return f"{parts[0][2:]}-{parts[1]}"
    return season


async def _fetch_html(
    harness: BrowserHarness,
    url: str,
    cache: CrawlCache,
    *,
    force: bool = False,
) -> str:
    """Cache-aware Playwright page fetch; returns raw HTML."""
    hit = cache.get(url, force=force)
    if hit:
        log.info("cache_hit", url=url)
        return hit.body

    log.info("fetch_html", url=url)
    async with harness.page() as page:
        await page.goto(url, wait_until="domcontentloaded")
        with contextlib.suppress(Exception):
            await page.wait_for_load_state("networkidle", timeout=10_000)
        html = await page.content()

    cache.put(url, body=html, status=200)
    await harness.jitter()
    return html


async def _fetch_json(
    harness: BrowserHarness,
    url: str,
    cache: CrawlCache,
    *,
    force: bool = False,
) -> dict[str, Any]:
    """Cache-aware Playwright fetch that parses the response body as JSON."""
    hit = cache.get(url, force=force)
    if hit:
        log.info("cache_hit_json", url=url)
        return json.loads(hit.body)

    log.info("fetch_json", url=url)
    async with harness.page() as page:
        await page.goto(url, wait_until="domcontentloaded")
        with contextlib.suppress(Exception):
            await page.wait_for_load_state("networkidle", timeout=10_000)
        text = await page.evaluate("() => document.body.innerText")

    cache.put(url, body=text, status=200)
    await harness.jitter()
    return json.loads(text)


async def _run_pipeline(
    *,
    season: str,
    week: int | None,
    teams_only: bool,
    force: bool,
    headed: bool,
    max_teams: int | None,
) -> int:
    """Full async pipeline. Returns 0 on success, non-zero on fatal error."""
    short = _short_season(season)
    started_at = datetime.now(UTC).isoformat()
    log.info("pipeline_start", season=season, short=short)

    cache = CrawlCache(config.CACHE_DB_PATH)

    # Output directories
    season_data_dir: Path = config.DATA_DIR / season
    season_data_dir.mkdir(parents=True, exist_ok=True)
    config.LOGOS_DIR.mkdir(parents=True, exist_ok=True)
    config.OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # --- Resume / checkpointing setup ---
    completed_path = season_data_dir / "_completed_teams.txt"
    if force and completed_path.exists():
        completed_path.unlink()

    completed_team_ids: set[str] = _load_completed(completed_path) if not force else set()

    # Load partial outputs (ignored when --force)
    teams_out: list[dict[str, Any]] = (
        _load_json_or_empty(season_data_dir / "teams.json") if not force else []
    )
    players_out: list[dict[str, Any]] = (
        _load_json_or_empty(season_data_dir / "players.json") if not force else []
    )
    games_out: list[dict[str, Any]] = (
        _load_json_or_empty(season_data_dir / "games.json") if not force else []
    )

    # Drop orphan entries not yet confirmed as complete
    teams_out = [t for t in teams_out if t.get("id") in completed_team_ids]
    players_out = [p for p in players_out if p.get("teamId") in completed_team_ids]
    games_out = [
        g
        for g in games_out
        if g.get("homeTeamId") in completed_team_ids
        or g.get("awayTeamId") in completed_team_ids
    ]

    errors: list[dict[str, Any]] = []

    async with BrowserHarness(headless=not headed) as harness:
        # Step 1: fetch landing to discover class links
        landing_url = config.LANDING_URL_TEMPLATE
        landing_html = await _fetch_html(harness, landing_url, cache, force=force)

        # Step 2: enumerate all team rows from class directories
        class_entries = classes_mod.discover_class_links(landing_html, season_short=short)
        all_team_rows: list[dict[str, str]] = []
        seen_urls: set[str] = set()

        for class_entry in class_entries:
            c_url = class_entry["url"]
            c_label = class_entry["classification"]
            try:
                class_html = await _fetch_html(harness, c_url, cache, force=force)
                rows = teams_mod.parse_team_directory_from_html(class_html)
                for row in rows:
                    row_url = row.get("url", "")
                    if row_url and row_url not in seen_urls:
                        seen_urls.add(row_url)
                        row["_classification"] = c_label
                        all_team_rows.append(row)
            except Exception as exc:
                log.warning("class_fetch_error", c_url=c_url, error=str(exc))
                errors.append({"team_url": c_url, "step": "class_directory", "error": str(exc)})

        log.info("teams_discovered", count=len(all_team_rows))
        # Sanity-check: log the first 3 team URLs so malformed URLs are visible early.
        for _row in all_team_rows[:3]:
            log.info("team_url_sample", url=_row.get("url"))

        # Step 3: apply max_teams cap
        if max_teams is not None:
            all_team_rows = all_team_rows[:max_teams]
            log.info("teams_capped", count=len(all_team_rows))

        teams_attempted = len(all_team_rows)

        log.info(
            "resume_state",
            already_done=len(completed_team_ids),
            remaining=teams_attempted - len(completed_team_ids),
        )

        # Step 4: per-team scrape
        for team_row in all_team_rows:
            team_url = team_row.get("url", "")
            c_label = team_row.get("_classification", "")
            try:
                urls = derive_team_season_urls(team_url=team_url, season_short=short)
                team_home_html = await _fetch_html(harness, urls["team_home"], cache, force=force)
                team_home = parse_team_home(team_home_html, source_url=team_url)

                # Always use the directory-derived label for historical seasons.
                # team_home["classification"] comes from the live team page's
                # stateDivisionName which reflects the *current* season — wrong
                # for past seasons when a school changed class.  The class
                # directory we scraped the team from is the authoritative source.
                if c_label:
                    team_home["classification"] = c_label

                tid = slugify.team_id(team_home["name"], team_home.get("mascot"))

                if tid in completed_team_ids:
                    log.info("team_skipped", team_id=tid)
                    continue

                await download_team_logo(
                    team_id=tid,
                    logo_url=team_home.get("logoUrl"),
                    out_dir=config.LOGOS_DIR,
                )

                if teams_only:
                    teams_out.append(
                        build_team(season=season, team_home=team_home).model_dump(by_alias=True)
                    )
                    log.info("team_done", team_id=tid)
                    _checkpoint(
                        season_data_dir, teams_out, players_out, games_out, completed_path, tid
                    )
                    completed_team_ids.add(tid)
                    continue

                roster_html = await _fetch_html(harness, urls["roster"], cache, force=force)
                roster_payload = extract_next_data_payload(roster_html)
                if roster_payload is None:
                    raise RuntimeError(
                        f"no __NEXT_DATA__ on roster page for {team_url}"
                    )
                roster_partials = parse_roster(roster_payload)

                schedule_html = await _fetch_html(harness, urls["schedule"], cache, force=force)
                schedule_payload = extract_next_data_payload(schedule_html)
                if schedule_payload is None:
                    raise RuntimeError(
                        f"no __NEXT_DATA__ on schedule page for {team_url}"
                    )
                schedule_partials = parse_schedule(schedule_payload, team_url=team_url)

                stats_html = await _fetch_html(harness, urls["stats"], cache, force=force)
                stats_payload = extract_next_data_payload(stats_html)
                if stats_payload is None:
                    season_stats_partials = {}
                else:
                    season_stats_partials = parse_season_stats(stats_payload)

                # Box scores — scrape only finals with a boxScoreUrl.
                # If --week is provided, restrict to games within the last 14 days
                # (a practical proxy for the current week window, suitable for cron triggers).
                # A full week-number mapping is deferred to a future task.
                box_scores: dict[str, dict[str, Any]] = {}
                for g in schedule_partials:
                    if g.get("status") == "final" and g.get("boxScoreUrl"):
                        bs_url = g["boxScoreUrl"]
                        if week is not None:
                            # Simple heuristic: skip if game date is more than 14 days old
                            game_date_str = g.get("date", "")
                            if game_date_str:
                                try:
                                    from datetime import date, timedelta
                                    game_date = date.fromisoformat(game_date_str)
                                    cutoff = date.today() - timedelta(days=14)
                                    if game_date < cutoff:
                                        continue
                                except ValueError:
                                    pass
                        try:
                            bs_html = await _fetch_html(harness, bs_url, cache, force=force)
                            box_scores[bs_url] = parse_box_score(bs_html)
                        except Exception as exc:
                            log.warning("boxscore_fetch_error", url=bs_url, error=str(exc))

                team = build_team(
                    season=season,
                    team_home=team_home,
                    schedule_games=schedule_partials,
                )
                teams_out.append(team.model_dump(by_alias=True))

                players = build_players(
                    team_id=tid,
                    season=season,
                    roster=roster_partials,
                    season_stats=season_stats_partials,
                    games_played_by_label={},
                )
                players_out.extend(p.model_dump(by_alias=True) for p in players)

                games = build_games(
                    season=season,
                    team_id=tid,
                    opponent_lookup={},
                    schedule=schedule_partials,
                    box_scores=box_scores,
                    player_label_to_id={p.name: p.id for p in players},
                )
                games_out.extend(g.model_dump(by_alias=True) for g in games)

                log.info("team_done", team_id=tid)
                _checkpoint(
                    season_data_dir, teams_out, players_out, games_out, completed_path, tid
                )
                completed_team_ids.add(tid)

            except Exception as exc:
                log.warning("team_error", team_url=team_url, error=str(exc))
                errors.append({"team_url": team_url, "step": "team", "error": str(exc)})

    # Step 5: write output files
    finished_at = datetime.now(UTC).isoformat()

    _write_json(season_data_dir / "teams.json", _dedupe_by_id(teams_out))
    _write_json(season_data_dir / "players.json", _dedupe_by_id(players_out))
    _write_json(season_data_dir / "games.json", _dedupe_by_id(games_out))

    games_complete = sum(1 for g in games_out if g.get("dataStatus") == "complete")
    games_incomplete = sum(1 for g in games_out if g.get("dataStatus") == "incomplete")
    games_missing = sum(1 for g in games_out if g.get("dataStatus") == "missing")

    stats = RunStats(
        season=season,
        started_at=started_at,
        finished_at=finished_at,
        teams_attempted=teams_attempted,
        teams_succeeded=len(teams_out),
        players_total=len(players_out),
        games_total=len(games_out),
        games_complete=games_complete,
        games_incomplete=games_incomplete,
        games_missing=games_missing,
        errors=len(errors),
    )
    config.RUN_REPORT_PATH.write_text(build_report(stats, errors=errors), encoding="utf-8")

    with config.ERRORS_LOG_PATH.open("w", encoding="utf-8") as fh:
        for err in errors:
            fh.write(json.dumps(err) + "\n")

    log.info(
        "pipeline_done",
        teams=len(teams_out),
        players=len(players_out),
        games=len(games_out),
        errors=len(errors),
    )
    return 0


def _write_json(path: Path, data: list[dict[str, Any]]) -> None:
    path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
    log.info("wrote_json", path=str(path), count=len(data))


def _load_completed(path: Path) -> set[str]:
    """Return the set of team_ids recorded as fully processed."""
    if not path.exists():
        return set()
    return {
        line.strip()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    }


def _load_json_or_empty(path: Path) -> list[dict[str, Any]]:
    """Load a JSON array from *path*, returning [] on missing or malformed file."""
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def _dedupe_by_id(items: list[dict]) -> list[dict]:
    """Keep the LAST entry for each id (so latest scrape wins on conflict)."""
    seen: dict[str, dict] = {}
    for item in items:
        key = item.get("id")
        if key is None:
            continue
        seen[key] = item
    return list(seen.values())


def _atomic_write_json(path: Path, data: list[dict[str, Any]]) -> None:
    """Write *data* to *path* via a temp file, then atomically replace."""
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
    os.replace(tmp, path)


def _checkpoint(
    season_dir: Path,
    teams_out: list[dict[str, Any]],
    players_out: list[dict[str, Any]],
    games_out: list[dict[str, Any]],
    completed_path: Path,
    team_id: str,
) -> None:
    """Atomically persist partial outputs and record *team_id* as complete."""
    _atomic_write_json(season_dir / "teams.json", _dedupe_by_id(teams_out))
    _atomic_write_json(season_dir / "players.json", _dedupe_by_id(players_out))
    _atomic_write_json(season_dir / "games.json", _dedupe_by_id(games_out))
    with completed_path.open("a", encoding="utf-8") as fh:
        fh.write(team_id + "\n")


@app.command()
def run(
    season: str = typer.Option(..., "--season", help="Season key, e.g. 2025-26"),
    week: int | None = typer.Option(None, "--week", help="Only refresh games in this week"),
    teams_only: bool = typer.Option(False, "--teams-only", help="Discovery + team home only"),
    force: bool = typer.Option(False, "--force", help="Bypass crawl cache"),
    headed: bool = typer.Option(False, "--headed", help="Run browser in headed mode"),
    max_teams: int | None = typer.Option(
        None, "--max-teams", help="Cap number of teams (smoke runs)"
    ),
) -> None:
    """Run the full MaxPreps scrape pipeline for a given season."""
    if season not in config.SUPPORTED_SEASONS:
        typer.echo(
            f"ERROR: season '{season}' not in SUPPORTED_SEASONS {config.SUPPORTED_SEASONS}",
            err=True,
        )
        raise typer.Exit(code=2)

    exit_code = asyncio.run(
        _run_pipeline(
            season=season,
            week=week,
            teams_only=teams_only,
            force=force,
            headed=headed,
            max_teams=max_teams,
        )
    )
    if exit_code != 0:
        raise typer.Exit(code=exit_code)


if __name__ == "__main__":
    app()
