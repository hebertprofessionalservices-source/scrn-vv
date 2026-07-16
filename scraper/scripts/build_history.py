"""Publish AFHS crawl output to the web app's history dataset.

Prunes the game log to meetings between two matched schools (series lookups
only ever pair dataset teams) and copies the result to
web/public/data/history/.

Usage:
    .venv/Scripts/python scripts/build_history.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "output" / "afhs"
DEST = ROOT.parent / "web" / "public" / "data" / "history"


def norm(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", name.lower())


def main() -> None:
    games = json.loads((SRC / "afhs-games.json").read_text(encoding="utf-8"))
    coaches = json.loads((SRC / "afhs-coaches.json").read_text(encoding="utf-8"))
    team_map = json.loads((SRC / "afhs-team-map.json").read_text(encoding="utf-8"))

    matched = {norm(v) for v in team_map.values()}
    kept = [g for g in games if norm(g["opponent"]) in matched]

    DEST.mkdir(parents=True, exist_ok=True)
    (DEST / "afhs-games.json").write_text(json.dumps(kept), encoding="utf-8")
    (DEST / "afhs-coaches.json").write_text(json.dumps(coaches), encoding="utf-8")
    (DEST / "afhs-team-map.json").write_text(json.dumps(team_map), encoding="utf-8")
    print(
        f"published {len(kept)}/{len(games)} games, {len(coaches)} coach pages, "
        f"{len(team_map)} team mappings -> {DEST}"
    )


if __name__ == "__main__":
    main()
