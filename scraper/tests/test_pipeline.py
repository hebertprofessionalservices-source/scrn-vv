from typer.testing import CliRunner

from scraper.pipeline import _short_season, app


def test_cli_help_lists_required_flags():
    runner = CliRunner()
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0
    for flag in ("--season", "--week", "--teams-only", "--force", "--headed", "--max-teams"):
        assert flag in result.output


def test_cli_rejects_unsupported_season():
    runner = CliRunner()
    result = runner.invoke(app, ["--season", "2099-00"])
    assert result.exit_code != 0


def test_short_season_2025_26():
    assert _short_season("2025-26") == "25-26"


def test_short_season_2024_25():
    assert _short_season("2024-25") == "24-25"
