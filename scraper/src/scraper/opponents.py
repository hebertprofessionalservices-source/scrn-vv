"""Keep same-named out-of-state opponents from resolving onto our teams.

Game rows store the opponent as a mascot-less MaxPreps slug ("germantown"),
which the site resolves back to a team by alias. That silently attaches the
wrong school when an out-of-state opponent shares a name with one of ours:
DeSoto Central plays Germantown, *Tennessee*, but "germantown" resolves to the
Germantown Mavericks of Madison, MS.

The MaxPreps game URL is the tiebreaker — inter-state contests carry each
side's state in the slug (".../desoto-central-southaven-ms-vs-germantown-tn/").
When that state contradicts the team an alias resolved to, the slug gets the
real state appended ("germantown-tn"), which no longer matches any alias, so
the site falls back to showing it as a plain-text opponent.
"""

from __future__ import annotations

import re

from scraper import slugify as slug_mod

# Only states that actually appear in this footprint; a generic two-letter
# match would fire on school names that happen to end in a short word.
STATE_CODES = frozenset({"ms", "tn", "ar", "la", "al", "tx", "ga", "fl", "mo", "ok"})

_GAME_SLUG_RE = re.compile(r"/game/([^/]+)/")
_TEAM_STATE_RE = re.compile(r"maxpreps\.com/([a-z]{2})/")


def school_slug(team: dict) -> str:
    """Mascot-less slug, matching the site's opponentAliasSlug()."""
    name, mascot = team["name"], team.get("mascot")
    if mascot and name.lower().endswith(mascot.lower()):
        name = name[: len(name) - len(mascot)]
    return slug_mod.slugify(name.strip())


def team_state(team: dict) -> str | None:
    m = _TEAM_STATE_RE.search(team.get("maxprepsUrl") or "")
    return m.group(1) if m else None


def build_alias_map(teams: list[dict]) -> dict[str, str]:
    """alias -> team id, dropping ambiguous aliases exactly as the site does."""
    alias: dict[str, str] = {}
    ambiguous: set[str] = set()
    for t in teams:
        a = school_slug(t)
        if a in alias and alias[a] != t["id"]:
            ambiguous.add(a)
        else:
            alias[a] = t["id"]
    for a in ambiguous:
        alias.pop(a, None)
    return alias


def url_side_state(url: str, slug: str) -> str | None:
    """State code of the URL side whose slug starts with `slug`, if any."""
    m = _GAME_SLUG_RE.search(url or "")
    if not m:
        return None
    for part in m.group(1).split("-vs-"):
        if part.startswith(slug):
            tail = part.rsplit("-", 1)[-1]
            if tail in STATE_CODES:
                return tail
    return None


def disambiguate_opponents(games: list[dict], teams: list[dict]) -> list[tuple[str, str, str]]:
    """Rewrite opponent slugs that resolve to a team in the wrong state.

    Mutates `games` in place. Game ids are left alone — they are opaque keys
    that stored references (editorial gameId) point at. Returns the list of
    (game id, old slug, new slug) rewrites made.
    """
    by_id = {t["id"]: t for t in teams}
    alias = build_alias_map(teams)
    fixes: list[tuple[str, str, str]] = []

    for g in games:
        url = g.get("maxprepsUrl") or ""
        for key in ("homeTeamId", "awayTeamId"):
            slug = g[key]
            if slug in by_id:
                continue  # already a canonical id, not an alias guess
            team = by_id.get(alias.get(slug, ""))
            if team is None:
                continue
            expected = team_state(team)
            actual = url_side_state(url, slug)
            if expected and actual and actual != expected:
                g[key] = f"{slug}-{actual}"
                fixes.append((g["id"], slug, g[key]))
    return fixes
