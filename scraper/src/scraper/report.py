"""Markdown run-report renderer."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RunStats:
    season: str
    started_at: str
    finished_at: str
    teams_attempted: int
    teams_succeeded: int
    players_total: int
    games_total: int
    games_complete: int
    games_incomplete: int
    games_missing: int
    errors: int


def build_report(stats: RunStats, *, errors: list[dict]) -> str:
    lines = [
        "# Scrape Run Report",
        "",
        f"- **Season:** {stats.season}",
        f"- **Started:** {stats.started_at}",
        f"- **Finished:** {stats.finished_at}",
        "",
        "## Totals",
        "",
        "| Metric | Value |",
        "|---|---|",
        f"| Teams scraped | {stats.teams_succeeded:,} / {stats.teams_attempted:,} |",
        f"| Players | {stats.players_total:,} |",
        f"| Games (total) | {stats.games_total:,} |",
        f"| Games complete | {stats.games_complete:,} |",
        f"| Games incomplete | {stats.games_incomplete:,} |",
        f"| Games missing | {stats.games_missing:,} |",
        f"| Errors | {stats.errors:,} |",
        "",
    ]
    if errors:
        lines += ["## Errors", "", "| Team URL | Step | Error |", "|---|---|---|"]
        for e in errors:
            lines.append(f"| {e.get('team_url','')} | {e.get('step','')} | {e.get('error','')} |")
        lines.append("")
    return "\n".join(lines)
