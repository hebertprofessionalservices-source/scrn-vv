"""Parse MaxPreps team home page into a partial team dict."""
from __future__ import annotations

import json
import re
from typing import Any

from bs4 import BeautifulSoup


def _extract_next_data(html: str) -> dict[str, Any] | None:
    """Return parsed __NEXT_DATA__ JSON or None if absent."""
    soup = BeautifulSoup(html, "html.parser")
    tag = soup.find("script", {"id": "__NEXT_DATA__"})
    if tag and tag.string:
        try:
            return json.loads(tag.string)
        except json.JSONDecodeError:
            return None
    return None


def _parse_classification(raw: str | None) -> str:
    """Normalise 'Division 7A' → '7A'; return '' if unparseable."""
    if not raw:
        return ""
    m = re.search(r"(\d+[A-Z]?)", raw)
    return m.group(1) if m else raw.strip()


def _parse_record(wlt_str: str | None) -> dict[str, int]:
    """Parse 'W-L' or 'W-L-T' string → {"wins": W, "losses": L}."""
    if not wlt_str:
        return {"wins": 0, "losses": 0}
    parts = wlt_str.split("-")
    try:
        return {"wins": int(parts[0]), "losses": int(parts[1])}
    except (IndexError, ValueError):
        return {"wins": 0, "losses": 0}


def _head_coach(staff_list: list[dict[str, Any]]) -> str | None:
    """Return 'First Last' for the Head Coach entry, or None."""
    for staff in staff_list:
        if (staff.get("position") or "").lower() == "head coach":
            first = staff.get("firstName") or ""
            last = staff.get("lastName") or ""
            full = f"{first} {last}".strip()
            return full or None
    return None


def parse_team_home(html: str, *, source_url: str) -> dict[str, Any]:
    """Parse a MaxPreps team home page and return a partial team dict.

    Keys returned:
        name, mascot, city, classification, district, headCoach,
        logoUrl, record, rankings, maxprepsUrl
    """
    next_data = _extract_next_data(html)

    # ── defaults ──────────────────────────────────────────────────────────────
    name: str = ""
    mascot: str | None = None
    city: str | None = None
    classification: str = ""
    district: str | None = None
    head_coach: str | None = None
    logo_url: str | None = None
    record: dict[str, int] = {"wins": 0, "losses": 0}
    rankings: dict[str, int | None] = {
        "stateOverall": None,
        "stateClass": None,
        "national": None,
    }

    if next_data:
        pp = next_data.get("props", {}).get("pageProps", {})
        tc = pp.get("teamContext", {})
        d = tc.get("data", {})

        # ── name / mascot / city ───────────────────────────────────────────
        school_name = d.get("schoolName") or ""
        mascot_raw = d.get("schoolMascot") or ""
        city = d.get("schoolCity") or None

        # Build display name like "Starkville Yellowjackets"
        if school_name and mascot_raw:
            name = f"{school_name} {mascot_raw}"
        elif school_name:
            name = school_name
        else:
            name = mascot_raw

        mascot = mascot_raw or None

        # ── classification ─────────────────────────────────────────────────
        classification = _parse_classification(d.get("stateDivisionName"))

        # ── district ───────────────────────────────────────────────────────
        district = d.get("leagueName") or None

        # ── logo ───────────────────────────────────────────────────────────
        logo_url = d.get("schoolMascotUrl") or tc.get("teamPhotoUrl") or None
        if logo_url == "":
            logo_url = None

        # ── head coach ─────────────────────────────────────────────────────
        # Try coachName field first (sometimes populated)
        coach_name_field = d.get("coachName") or ""
        if coach_name_field:
            head_coach = coach_name_field
        else:
            # Fall back to meetTheTeam staff list
            wc = pp.get("wallCards", {})
            if isinstance(wc, dict):
                meet = wc.get("meetTheTeam", {})
                if isinstance(meet, dict):
                    staff_list = (meet.get("data") or {}).get("staffList") or []
                    head_coach = _head_coach(staff_list)

        # ── record ─────────────────────────────────────────────────────────
        # Current season record may be null (future/empty season); use lastYearStandingsData
        standings_data = tc.get("standingsData", {})
        overall = (standings_data or {}).get("overallStanding") if standings_data else None

        if overall:
            record = _parse_record(overall.get("overallWinLossTies"))
        else:
            # Try last year's standings
            last_yr = tc.get("lastYearStandingsData", {})
            last_overall = (last_yr or {}).get("overallStanding") if last_yr else None
            if last_overall:
                record = _parse_record(last_overall.get("overallWinLossTies"))

        # ── rankings ───────────────────────────────────────────────────────
        rankings_data = tc.get("rankingsData", {})
        if isinstance(rankings_data, dict):
            for entry in rankings_data.get("data") or []:
                rank_val = entry.get("rank")
                rank_type = (entry.get("type") or "").lower()
                if "national" in rank_type:
                    rankings["national"] = rank_val
                elif "class" in rank_type or "division" in rank_type:
                    rankings["stateClass"] = rank_val
                else:
                    rankings["stateOverall"] = rank_val

    # ── HTML fallback for name if __NEXT_DATA__ failed ────────────────────
    if not name:
        soup = BeautifulSoup(html, "html.parser")
        h1 = soup.find("h1")
        if h1:
            name = h1.get_text(strip=True)

    return {
        "name": name,
        "mascot": mascot,
        "city": city,
        "classification": classification,
        "district": district,
        "headCoach": head_coach,
        "logoUrl": logo_url,
        "record": record,
        "rankings": rankings,
        "maxprepsUrl": source_url,
    }
