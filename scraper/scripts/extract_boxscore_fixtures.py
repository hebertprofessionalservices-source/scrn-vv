"""Extract boxscore JSON fixtures from the already-captured boxscore HTML files.

The boxscore pages are legacy (pre-Next.js) pages that render stats directly
in HTML tables. This script parses those tables and the utag_data metadata
into a structured JSON fixture that serves as the contract for Task 13.

Usage:
    python scripts/extract_boxscore_fixtures.py
"""
from __future__ import annotations

import contextlib
import json
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
FIXTURES = PROJECT_ROOT / "tests" / "fixtures"


def extract_text(html: str) -> str:
    """Strip HTML tags and normalize whitespace."""
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html)).strip()


def parse_table(table_html: str) -> dict:
    """Parse an HTML stats table into headers + rows."""
    headers = []
    rows = []

    thead = re.search(r"<thead>(.*?)</thead>", table_html, re.DOTALL)
    if thead:
        header_cells = re.findall(
            r"<t[dh][^>]*>(.*?)</t[dh]>", thead.group(1), re.DOTALL
        )
        headers = [extract_text(c) for c in header_cells]

    tbody = re.search(r"<tbody>(.*?)</tbody>", table_html, re.DOTALL)
    if tbody:
        trs = re.findall(r"<tr[^>]*>(.*?)</tr>", tbody.group(1), re.DOTALL)
        for tr in trs:
            cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, re.DOTALL)
            row = [extract_text(c) for c in cells]
            if any(row):  # skip blank rows
                rows.append(row)

    return {"headers": headers, "rows": rows}


def parse_boxscore_html(html: str, source_url: str) -> dict:
    """Extract all structured data from a legacy boxscore HTML page."""
    result: dict = {
        "source_url": source_url,
        "page_type": "legacy_boxscore",
        "metadata": {},
        "score_summary": {},
        "stat_tables": [],
    }

    # 1. Extract utag_data metadata
    for script in re.findall(r"<script[^>]*>(.*?)</script>", html, re.DOTALL):
        m = re.search(r"var utag_data\s*=\s*(\{.*?\})\s*;", script, re.DOTALL)
        if m:
            with contextlib.suppress(Exception):
                result["metadata"] = json.loads(m.group(1))
            break

    # 2. Extract schema.org SportsEvent data
    for script in re.findall(
        r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>',
        html,
        re.DOTALL,
    ):
        try:
            ld = json.loads(script)
            if ld.get("@type") == "SportsEvent":
                result["schema_org_event"] = ld
        except Exception:
            pass

    # 3. Parse the overall score summary table (class="mx-grid boxscore")
    score_table = re.search(
        r'<table[^>]*class="[^"]*mx-grid boxscore[^"]*"[^>]*>(.*?)</table>',
        html,
        re.DOTALL,
    )
    if score_table:
        result["score_summary"] = parse_table(score_table.group(0))

    # 4. Parse all per-player stats-grid tables
    # Each is preceded by a section heading like <h4>Passing</h4>
    # We'll find all h4 + table pairs
    sections = re.findall(
        r"<h4[^>]*>(.*?)</h4>\s*<table[^>]*class=\"[^\"]*stats-grid[^\"]*\"[^>]*>(.*?)</table>",
        html,
        re.DOTALL,
    )
    for heading_html, table_body in sections:
        heading = extract_text(heading_html)
        # Reconstruct a full table tag for parsing
        full_table = f"<table>{table_body}</table>"
        parsed = parse_table(full_table)
        # Add team context if available from surrounding divs
        result["stat_tables"].append(
            {
                "category": heading,
                "headers": parsed["headers"],
                "rows": parsed["rows"],
            }
        )

    # 5. Count whether we have per-player rows (complete) or only totals (missing)
    has_player_data = False
    for tbl in result["stat_tables"]:
        for row in tbl.get("rows", []):
            # Player rows have a jersey number in first cell; "Team Totals" rows don't
            if row and row[0].strip() and row[0].strip().isdigit():
                has_player_data = True
                break
        if has_player_data:
            break
    result["has_player_data"] = has_player_data

    return result


TARGETS = [
    (
        "boxscore_complete.json",
        "boxscore_complete.html",
        "https://www.maxpreps.com/games/08-29-2025/football-25/oak-grove-vs-starkville.htm?c=GbcX724Q30WON6REOKFZxQ",
    ),
    (
        "boxscore_missing.json",
        "boxscore_missing.html",
        "https://www.maxpreps.com/games/09-11-2026/football-26/ashland-vs-byhalia.htm?c=vjFO3GAoFkuZvV2CuDaWXg",
    ),
]


def main() -> None:
    for out_name, in_name, url in TARGETS:
        src = FIXTURES / in_name
        if not src.exists():
            print(f"SKIP {in_name} — not found")
            continue
        html = src.read_text(encoding="utf-8")
        data = parse_boxscore_html(html, url)
        dest = FIXTURES / out_name
        text = json.dumps(data, indent=2, ensure_ascii=False)
        dest.write_text(text, encoding="utf-8")
        n_tables = len(data["stat_tables"])
        has_players = data["has_player_data"]
        print(
            f"OK  {out_name:35s}  {len(text):>9,} bytes  "
            f"tables={n_tables}  has_player_data={has_players}"
        )


if __name__ == "__main__":
    main()
