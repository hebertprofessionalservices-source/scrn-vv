from scraper.report import RunStats, build_report


def test_report_renders_summary_table():
    stats = RunStats(
        season="2025-26",
        started_at="2026-06-08T12:00:00Z",
        finished_at="2026-06-08T12:42:00Z",
        teams_attempted=251,
        teams_succeeded=247,
        players_total=12_540,
        games_total=2_134,
        games_complete=1_870,
        games_incomplete=110,
        games_missing=154,
        errors=4,
    )
    md = build_report(stats, errors=[])
    assert "# Scrape Run Report" in md
    assert "2025-26" in md
    assert "247 / 251" in md
    assert "1,870" in md


def test_report_lists_errors():
    stats = RunStats(
        season="2025-26", started_at="x", finished_at="y",
        teams_attempted=1, teams_succeeded=0,
        players_total=0, games_total=0,
        games_complete=0, games_incomplete=0, games_missing=0, errors=1,
    )
    md = build_report(stats, errors=[
        {"team_url": "https://x", "step": "roster", "error": "ConnectionError"},
    ])
    assert "https://x" in md
    assert "roster" in md
    assert "ConnectionError" in md


def test_report_handles_empty_errors_section_omitted():
    stats = RunStats(
        season="2025-26", started_at="x", finished_at="y",
        teams_attempted=1, teams_succeeded=1,
        players_total=10, games_total=5,
        games_complete=5, games_incomplete=0, games_missing=0, errors=0,
    )
    md = build_report(stats, errors=[])
    # When no errors, no Errors section appears
    assert "## Errors" not in md
