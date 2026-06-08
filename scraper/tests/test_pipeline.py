import json
from pathlib import Path

from typer.testing import CliRunner

from scraper.pipeline import (
    _atomic_write_json,
    _checkpoint,
    _load_completed,
    _load_json_or_empty,
    _short_season,
    app,
)


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


def test_load_completed_handles_missing(tmp_path: Path):
    assert _load_completed(tmp_path / "missing.txt") == set()


def test_load_completed_reads_team_ids(tmp_path: Path):
    p = tmp_path / "c.txt"
    p.write_text("foo-bar\nbaz-qux\n  \n", encoding="utf-8")
    assert _load_completed(p) == {"foo-bar", "baz-qux"}


def test_load_json_or_empty(tmp_path: Path):
    p = tmp_path / "x.json"
    assert _load_json_or_empty(p) == []
    p.write_text('[{"a":1}]', encoding="utf-8")
    assert _load_json_or_empty(p) == [{"a": 1}]
    # malformed
    p.write_text("{ broken", encoding="utf-8")
    assert _load_json_or_empty(p) == []


def test_atomic_write_json_roundtrip(tmp_path: Path):
    p = tmp_path / "out.json"
    _atomic_write_json(p, [{"id": "x"}])
    assert json.loads(p.read_text()) == [{"id": "x"}]


def test_checkpoint_writes_files_and_appends_completed(tmp_path: Path):
    completed = tmp_path / "_completed.txt"
    _checkpoint(tmp_path, [{"id": "t1"}], [{"id": "p1"}], [{"id": "g1"}], completed, "t1")
    assert json.loads((tmp_path / "teams.json").read_text()) == [{"id": "t1"}]
    assert "t1" in completed.read_text()
    # Append a second
    _checkpoint(tmp_path, [{"id": "t1"}, {"id": "t2"}], [], [], completed, "t2")
    assert completed.read_text().strip().splitlines() == ["t1", "t2"]
