"""One-shot cleanup: dedupe players.json and games.json by id for all seasons.

Reports per-season counts before/after.
"""
from __future__ import annotations

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "output" / "data"


def _dedupe(items: list[dict]) -> list[dict]:
    seen: dict[str, dict] = {}
    for item in items:
        key = item.get("id")
        if key is None:
            continue
        seen[key] = item
    return list(seen.values())


def main() -> None:
    for season_dir in sorted(DATA_DIR.iterdir()):
        if not season_dir.is_dir():
            continue
        season = season_dir.name
        for filename in ("teams.json", "players.json", "games.json"):
            path = season_dir / filename
            if not path.exists():
                continue
            raw = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(raw, list):
                continue
            before = len(raw)
            cleaned = _dedupe(raw)
            after = len(cleaned)
            if before != after:
                path.write_text(json.dumps(cleaned, indent=2, default=str), encoding="utf-8")
                print(f"[{season}] {filename}: {before:,} -> {after:,} (removed {before - after:,})")
            else:
                print(f"[{season}] {filename}: {before:,} (no dupes)")


if __name__ == "__main__":
    main()
