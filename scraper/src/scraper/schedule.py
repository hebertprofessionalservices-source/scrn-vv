"""Parse MaxPreps schedule next/data JSON into normalised game dicts.

Positional indices discovered empirically from team_schedule.json fixture
(Starkville Yellowjackets 2025-26 football season, 15 contests).

Contest tuple (41 elements total):
    [0]  list(2) – duplicate refs to [37] / [38] team sublists
    [1]  str – contestId (UUID)
    [2]  str – lastModified ISO datetime
    [3]  bool – unknown
    [4]  bool – True for active / confirmed contests
    [11] str – game date/time ISO (e.g., "2025-08-29T19:00:00")
    [18] str – boxScoreUrl (full URL or empty string)
    [21] str – contestType ("Game")
    [28] str – status text ("" = active, "ContestState is Deleted." = deleted)
    [29] str – recap/description text
    [37] list(32) – first team sublist
    [38] list(32) – second team sublist

Team sublist (32 elements):
    [1]  str – teamId (UUID)
    [3]  str – W/L score string (e.g., "W 57-54")
    [5]  str – result char ("W" / "L" / "")
    [6]  int|None – this team's score (None when game not yet played)
    [13] str – team schedule URL (used to identify which team is 'ours')
    [14] str – team short name (e.g., "Starkville")
    [15] str – city
    [16] str – state abbreviation
    [19] str – full display name (e.g., "Starkville (MS)")
    [20] str – logo URL
    [21] str – mascot
    [24] str – short abbreviation (e.g., "SHS")
    [25] str – teamId (repeat)

Home/away determination:
    The boxScoreUrl slug follows the pattern "away-vs-home".
    We extract the team slug from the team schedule URL and check whether it
    appears first (away) or second (home) in the boxscore slug.
    If no boxscore URL exists, we fall back to team[4]: 1 = listed first,
    2 = listed second (less reliable).

Status determination:
    - "ContestState is Deleted." → skip the contest entirely
    - team[6] is not None (score present) → "final"
    - otherwise → "scheduled"
"""

from __future__ import annotations

import re
from typing import Any

# --------------------------------------------------------------------------- #
# Contest tuple indices
# --------------------------------------------------------------------------- #
IDX_CONTEST_ID = 1
IDX_GAME_DATETIME = 11
IDX_BOX_SCORE_URL = 18
IDX_STATUS_TEXT = 28
IDX_TEAM_A = 37  # first team sublist
IDX_TEAM_B = 38  # second team sublist

# --------------------------------------------------------------------------- #
# Team sublist indices
# --------------------------------------------------------------------------- #
TEAM_IDX_ID = 1
TEAM_IDX_SCORE_STR = 3       # e.g., "W 57-54"
TEAM_IDX_RESULT = 5          # "W" / "L" / ""
TEAM_IDX_SCORE = 6           # int score, None when not yet played
TEAM_IDX_SCHEDULE_URL = 13   # team schedule page URL
TEAM_IDX_NAME = 14           # short name
TEAM_IDX_CITY = 15
TEAM_IDX_STATE = 16
TEAM_IDX_FULL_NAME = 19      # full display name e.g. "Starkville (MS)"
TEAM_IDX_LOGO = 20
TEAM_IDX_MASCOT = 21
TEAM_IDX_SHORT = 24          # abbreviation

_DELETED_MARKER = "ContestState is Deleted."

_TEAM_SLUG_RE = re.compile(
    r"maxpreps\.com/[a-z]{2}/([^/]+)/[^/]+/(?:football|basketball|soccer|baseball|softball|volleyball)",
)
_BOX_SLUG_RE = re.compile(r"/([^/]+)\.htm")


def _team_slug(schedule_url: str) -> str:
    """Extract the city slug from a MaxPreps team URL.

    MaxPreps boxscore URLs use the city slug (e.g. 'starkville' from
    '/ms/starkville/starkville-yellowjackets/football/') in the
    'away-vs-home' portion of the path, so we extract the city component
    rather than the full team slug.
    """
    m = _TEAM_SLUG_RE.search(schedule_url or "")
    return m.group(1) if m else ""


def _box_score_slug(box_url: str) -> str:
    """Extract the 'away-vs-home' slug from a MaxPreps boxscore URL."""
    m = _BOX_SLUG_RE.search(box_url or "")
    return m.group(1) if m else ""


def _determine_home_away(
    our_slug: str,
    team_a: list,
    team_b: list,
    box_url: str,
) -> tuple[str, str]:
    """Return (our_home_or_away, opponent_home_or_away).

    Uses the boxscore URL slug ('away-vs-home') as the primary signal.
    Falls back to checking which team is 'ours' by matching our_slug
    against team schedule URLs.
    """
    slug = _box_score_slug(box_url)
    if slug and our_slug:
        # slug format: "away-vs-home"
        parts = slug.split("-vs-", 1)
        if len(parts) == 2:
            away_part, home_part = parts
            if our_slug in home_part:
                return "home", "away"
            if our_slug in away_part:
                return "away", "home"

    # Fallback: check which team sublist's URL contains our_slug
    a_url = team_a[TEAM_IDX_SCHEDULE_URL] if len(team_a) > TEAM_IDX_SCHEDULE_URL else ""
    b_url = team_b[TEAM_IDX_SCHEDULE_URL] if len(team_b) > TEAM_IDX_SCHEDULE_URL else ""
    if our_slug and our_slug in (a_url or ""):
        # team_a is ours; check team_b slug in box_url for home/away
        b_slug = _team_slug(b_url)
        if b_slug and slug:
            parts = slug.split("-vs-", 1)
            if len(parts) == 2:
                away_part, home_part = parts
                if b_slug in home_part:
                    return "away", "home"
                if b_slug in away_part:
                    return "home", "away"
        return "away", "home"  # default
    if our_slug and our_slug in (b_url or ""):
        return "away", "home"  # default when team_b is ours

    # Last resort: assume team_a is home (arbitrary)
    return "home", "away"


def _normalize_status(team: list) -> str:
    """Derive canonical status from the team's score field."""
    score = team[TEAM_IDX_SCORE] if len(team) > TEAM_IDX_SCORE else None
    if score is not None and isinstance(score, int):
        return "final"
    return "scheduled"


def _safe_get(lst: list, idx: int, default: Any = None) -> Any:
    try:
        return lst[idx]
    except IndexError:
        return default


def parse_schedule(payload: dict, *, team_url: str) -> list[dict[str, Any]]:
    """Parse a MaxPreps schedule next/data JSON payload.

    Parameters
    ----------
    payload:
        Parsed JSON from the MaxPreps schedule page (top-level keys include
        "props").
    team_url:
        The URL of the team whose schedule this is.  Used to identify which
        team sublist in each contest belongs to 'us', which in turn determines
        homeOrAway and which score is scoreFor vs scoreAgainst.

    Returns
    -------
    List of game dicts with keys:
        date, homeOrAway, opponentName, opponentTeamId, opponentLogoUrl,
        status, scoreFor, scoreAgainst, venue, boxScoreUrl, contestId.
    """
    # Support both legacy schema (props.pageProps) and current schema (pageProps).
    page_props: dict = payload.get("pageProps") or payload.get("props", {}).get("pageProps", {})
    contests: list = page_props.get("contests", [])

    our_slug = _team_slug(team_url)

    games: list[dict[str, Any]] = []
    for contest in contests:
        # Skip deleted / cancelled contests
        status_text: str = _safe_get(contest, IDX_STATUS_TEXT, "") or ""
        if _DELETED_MARKER in status_text:
            continue

        contest_id: str | None = _safe_get(contest, IDX_CONTEST_ID)
        raw_datetime: str = _safe_get(contest, IDX_GAME_DATETIME, "") or ""
        date = raw_datetime[:10] if len(raw_datetime) >= 10 else raw_datetime
        box_url: str = _safe_get(contest, IDX_BOX_SCORE_URL, "") or ""

        team_a: list = _safe_get(contest, IDX_TEAM_A, []) or []
        team_b: list = _safe_get(contest, IDX_TEAM_B, []) or []

        if not team_a and not team_b:
            continue

        # Identify which team is 'ours' by matching the team schedule URL
        a_url = _safe_get(team_a, TEAM_IDX_SCHEDULE_URL, "") or ""
        b_url = _safe_get(team_b, TEAM_IDX_SCHEDULE_URL, "") or ""

        if our_slug and our_slug in a_url:
            our_team, opp_team = team_a, team_b
        elif our_slug and our_slug in b_url:
            our_team, opp_team = team_b, team_a
        else:
            # Fall back to team_a as ours when slug match fails
            our_team, opp_team = team_a, team_b

        home_or_away, _ = _determine_home_away(our_slug, our_team, opp_team, box_url)

        status = _normalize_status(our_team)

        score_for: int | None = _safe_get(our_team, TEAM_IDX_SCORE)
        score_against: int | None = _safe_get(opp_team, TEAM_IDX_SCORE)

        # Coerce to int or None
        score_for = int(score_for) if isinstance(score_for, int) else None
        score_against = int(score_against) if isinstance(score_against, int) else None

        opp_name: str = _safe_get(opp_team, TEAM_IDX_NAME, "") or ""
        opp_team_id: str | None = _safe_get(opp_team, TEAM_IDX_ID)
        opp_logo: str | None = _safe_get(opp_team, TEAM_IDX_LOGO)

        games.append(
            {
                "date": date,
                "homeOrAway": home_or_away,
                "opponentName": opp_name,
                "opponentTeamId": opp_team_id or None,
                "opponentLogoUrl": opp_logo or None,
                "status": status,
                "scoreFor": score_for,
                "scoreAgainst": score_against,
                "venue": None,  # not present in JSON; available in HTML fixture
                "boxScoreUrl": box_url or None,
                "contestId": contest_id or None,
            }
        )

    return games
