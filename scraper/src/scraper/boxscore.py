"""Parser for MaxPreps legacy ASPX box score pages."""

from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup, Tag


def _num(text: str) -> int | float:
    """Coerce a stat cell text to a number, returning 0 on failure."""
    s = (text or "").strip().replace(",", "")
    if s in ("", "-", "—"):
        return 0
    try:
        return float(s) if "." in s else int(s)
    except ValueError:
        return 0


def _parse_title(soup: BeautifulSoup) -> tuple[str | None, str | None]:
    """Return (away_team, home_team) from the <title> element.

    Title format: "{away} vs {home} | Football | ..."
    """
    title_tag = soup.title
    if not title_tag:
        return None, None
    title_text = title_tag.get_text(strip=True)
    m = re.match(r"^(.+?)\s+vs\s+(.+?)\s*\|", title_text, re.IGNORECASE)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return None, None


def _parse_scores_and_quarters(
    soup: BeautifulSoup,
) -> tuple[int | None, int | None, list[int], list[int]]:
    """Return (away_score, home_score, away_quarters, home_quarters).

    The boxscore table has:
      header row: '' | Q1 | Q2 | Q3 | Q4 | Final
      row 1: Away Team | q1 | q2 | q3 | q4 | final
      row 2: Home Team | q1 | q2 | q3 | q4 | final
    (away is listed first on MaxPreps; home is listed second)
    """
    tbl = soup.select_one("table.boxscore")
    if not tbl:
        return None, None, [], []

    rows = tbl.select("tr")
    if len(rows) < 3:
        return None, None, [], []

    # rows[0] is header; rows[1] is away; rows[2] is home
    def _row_nums(row: Tag) -> list[int]:
        cells = row.select("td")
        # All cells are numeric (team name is in a <th>)
        return [_num(c.get_text(strip=True)) for c in cells]

    away_row = rows[1]
    home_row = rows[2]

    away_nums = _row_nums(away_row)
    home_nums = _row_nums(home_row)

    # Last entry is the final score; preceding entries are quarters
    away_score: int | None = away_nums[-1] if away_nums else None
    home_score: int | None = home_nums[-1] if home_nums else None
    away_quarters = away_nums[:-1] if len(away_nums) > 1 else []
    home_quarters = home_nums[:-1] if len(home_nums) > 1 else []

    return away_score, home_score, away_quarters, home_quarters


def _parse_stat_table(tbl: Tag) -> list[dict[str, Any]]:
    """Parse a single stat group table into a list of player dicts."""
    headers = [th.get_text(strip=True) for th in tbl.select("th")]
    if not headers:
        return []

    entries: list[dict[str, Any]] = []
    for row in tbl.select("tbody tr"):
        cells = row.select("td")
        if not cells:
            continue
        # Second cell (index 1) is the player name/link; first cell is jersey #
        if len(cells) > 1:
            player_label = cells[1].get_text(strip=True)
        else:
            player_label = cells[0].get_text(strip=True)
        entry: dict[str, Any] = {"playerLabel": player_label}
        # Map remaining cells to headers, starting from header index 2 (skip # and Name)
        for col_idx, cell in enumerate(cells[2:], start=2):
            if col_idx < len(headers):
                key = headers[col_idx].lower()
                entry[key] = _num(cell.get_text(strip=True))
        entries.append(entry)
    return entries


def _find_tables_by_heading(
    soup: BeautifulSoup, heading_keyword: str
) -> list[Tag]:
    """Return all tables whose immediately preceding heading contains the keyword."""
    result: list[Tag] = []
    for tbl in soup.select("table"):
        prev_h = tbl.find_previous(["h1", "h2", "h3", "h4", "h5"])
        if prev_h and heading_keyword.lower() in prev_h.get_text(strip=True).lower():
            result.append(tbl)
    return result


def parse_box_score(html: str) -> dict[str, Any]:
    """Parse a MaxPreps box score HTML page.

    Returns a dict with keys:
        homeTeamName, awayTeamName, homeScore, awayScore,
        venue, quarterScores, boxScore, dataStatus
    """
    soup = BeautifulSoup(html, "html.parser")

    # --- Team names from title ---
    away_name, home_name = _parse_title(soup)

    # --- Scores and quarters ---
    away_score, home_score, away_quarters, home_quarters = _parse_scores_and_quarters(soup)

    # --- Stat group tables ---
    # Each group appears twice (once per team); collect both into a flat list.
    # Group keyword -> output key mapping
    group_map = {
        "passing": "passing",
        "rushing": "rushing",
        "receiving": "receiving",
        "tackles": "defense",
    }

    box: dict[str, list[dict[str, Any]]] = {
        "passing": [],
        "rushing": [],
        "receiving": [],
        "defense": [],
    }

    for keyword, output_key in group_map.items():
        tables = _find_tables_by_heading(soup, keyword)
        for tbl in tables:
            rows = _parse_stat_table(tbl)
            box[output_key].extend(rows)

    # --- dataStatus ---
    total_entries = sum(len(v) for v in box.values())
    if total_entries == 0:
        data_status = "missing"
        box_score_out: dict[str, list[dict[str, Any]]] | None = None
    elif total_entries < 4:
        data_status = "incomplete"
        box_score_out = box
    else:
        data_status = "complete"
        box_score_out = box

    return {
        "homeTeamName": home_name,
        "awayTeamName": away_name,
        "homeScore": home_score,
        "awayScore": away_score,
        "venue": None,
        "quarterScores": {
            "home": home_quarters,
            "away": away_quarters,
        },
        "boxScore": box_score_out,
        "dataStatus": data_status,
    }
