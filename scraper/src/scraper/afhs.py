"""Parsers for ahsfhs.org/mississippi — historical games and coach records.

AFHS (the Alabama High School Football Historical Society, which also hosts
Mississippi) publishes per-team pages:

- Teams/findateamabc.asp?abc=A     -> team directory per letter
- Teams/teampage.asp?Team=Oxford   -> header + year links
- Teams/Coaches.asp?Team=Oxford    -> coach stints with records
- Teams/gamesbyyear.asp?Year=2025&Team=Oxford&Show1=1 -> one season's games

Tables are legacy ASP markup with glued rows, so parsing walks the flat cell
stream and anchors on recognizable tokens instead of trusting row structure.
"""

from __future__ import annotations

import re
from typing import Any

from bs4 import BeautifulSoup

BASE = "https://www.ahsfhs.org/mississippi/Teams"

_RESULT_RE = re.compile(r"^\s*([WLT])\s*(?:\((\d*OT)\))?\s*$")
_SCORE_RE = re.compile(r"^\s*(\d{1,3})\s*$")
_YEARS_RE = re.compile(r"^\s*(\d{4})(?:-(\d{2,4}))?\s*$")
_WLT_RE = re.compile(r"^\s*(\d+)-(\d+)(?:-(\d+))?\s*$")
_DATE_RE = re.compile(r"^\s*\w{3}\.,\s+\w{3}\.?\s+\d{1,2}\s*$")


def _cells(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    out: list[str] = []
    for td in soup.find_all(["td", "th"]):
        text = td.get_text(" ", strip=True).replace("\xa0", " ").strip()
        out.append(text)
    return out


def parse_team_directory(html: str) -> list[str]:
    """AFHS team names from a findateamabc.asp page."""
    soup = BeautifulSoup(html, "html.parser")
    names: list[str] = []
    for a in soup.find_all("a", href=True):
        m = re.search(r"teampage\.asp\?Team=([^\"&]+)", a["href"])
        if m:
            name = m.group(1).replace("%20", " ").strip()
            if name and name not in names:
                names.append(name)
    return names


def parse_year_list(html: str) -> list[int]:
    """Season years available in the games page's year dropdown."""
    years = {int(m) for m in re.findall(r"<option[^>]*>\s*(\d{4})", html)}
    return sorted(years)


def parse_season_games(html: str, *, team: str, year: int) -> list[dict[str, Any]]:
    """Games for one season from a gamesbyyear page.

    Anchors on W/L/T result cells and reads [date?, opponent, score, score]
    backwards from each anchor, so glued rows and missing dates don't break it.
    """
    cells = _cells(html)
    games: list[dict[str, Any]] = []
    for i, cell in enumerate(cells):
        m = _RESULT_RE.match(cell)
        if not m or i < 3:
            continue
        s2 = _SCORE_RE.match(cells[i - 1])
        s1 = _SCORE_RE.match(cells[i - 2])
        if not s1 or not s2:
            continue
        opp_raw = cells[i - 3]
        if not opp_raw or opp_raw.upper() == "OPEN":
            continue
        date = cells[i - 4] if i >= 4 and _DATE_RE.match(cells[i - 4] or "") else None

        district = "*" in opp_raw
        loc = "away" if opp_raw.lstrip().startswith("@") else "home"
        opponent = re.sub(r"^\s*(@|vs\.?)\s*", "", opp_raw).replace("*", "").strip()
        if not opponent:
            continue

        # Playoff round note, when the next non-empty cell mentions playoffs.
        note = None
        for j in range(i + 1, min(i + 4, len(cells))):
            nxt = cells[j].strip()
            if nxt and "playoff" in nxt.lower():
                note = nxt
                break
            if nxt and (_RESULT_RE.match(nxt) or _SCORE_RE.match(nxt) or _DATE_RE.match(nxt)):
                break

        games.append({
            "team": team,
            "year": year,
            "date": date,
            "opponent": opponent,
            "loc": loc,
            "teamScore": int(s1.group(1)),
            "oppScore": int(s2.group(1)),
            "result": m.group(1),
            "ot": m.group(2) or None,
            "district": district,
            "playoff": note,
        })
    return games


def _expand_year(start: int, end_raw: str | None) -> int:
    """'2016', '26' or '1998' end-of-range -> full year."""
    if end_raw is None:
        return start
    if len(end_raw) == 4:
        return int(end_raw)
    century = start - start % 100
    end = century + int(end_raw)
    if end < start:
        end += 100
    return end


def parse_coaches(html: str, *, team: str) -> dict[str, Any]:
    """Coach stints and the current coach from a Coaches.asp page.

    Each stint is name, years-range, then W/L/T + PF + PA groups (season
    total first; playoff/district groups follow but are not needed).
    """
    cells = _cells(html)
    header = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
    current = None
    m = re.search(r"Coach:\s*([A-Za-z.'\- ]+?)(?:\s{2,}|$|Select|Season)", header)
    if m:
        current = m.group(1).strip()

    stints: list[dict[str, Any]] = []
    i = 0
    while i < len(cells) - 2:
        years = _YEARS_RE.match(cells[i + 1] or "")
        wlt = _WLT_RE.match(cells[i + 2] or "")
        name = (cells[i] or "").strip()
        looks_like_name = bool(
            name
            and not _YEARS_RE.match(name)
            and not _WLT_RE.match(name)
            and not _SCORE_RE.match(name)
            and re.search(r"[A-Za-z]{2}", name)
            and name.lower() not in ("coach", "years", "w/l/t", "pf", "pa")
        )
        if looks_like_name and years and wlt:
            start = int(years.group(1))
            stints.append({
                "team": team,
                "coach": name,
                "startYear": start,
                "endYear": _expand_year(start, years.group(2)),
                "wins": int(wlt.group(1)),
                "losses": int(wlt.group(2)),
                "ties": int(wlt.group(3) or 0),
            })
            i += 3
        else:
            i += 1
    return {"team": team, "currentCoach": current, "stints": stints}
