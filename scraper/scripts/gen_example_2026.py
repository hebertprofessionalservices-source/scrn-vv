"""Generate EXAMPLE results for the first 5 weeks of the real 2026-27 schedule.

Demo-only, deterministic (seed 2026). Takes the scraped 2026-27 schedule in
web/public/data/2026-27/ and marks every game in the first five calendar
weeks final with generated scores and box scores; later games stay
scheduled. Rosters are carried over from 2025-26 and player/team season
stats are accumulated from the generated box scores so every page stays
internally consistent.

Restore the real (scores-free) schedule data with:
    .venv/Scripts/python scripts/scrape_2026_schedules.py

Usage:
    .venv/Scripts/python scripts/gen_example_2026.py [--weeks N]
"""

from __future__ import annotations

import argparse
import json
import random
import re
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "web" / "public" / "data"
SRC = DATA / "2025-26"
DEST = DATA / "2026-27"
SEASON = "2026-27"

rng = random.Random(2026)

CLASS_ABBR = {"FR": "Fr", "SO": "So", "JR": "Jr", "SR": "Sr"}


def label(p: dict) -> str:
    return f"{p['name']}({CLASS_ABBR.get(p['class'], 'Sr')})"


def monday_key(d: str) -> str:
    y, m, dd = map(int, d[:10].split("-"))
    dt = date(y, m, dd)
    return (dt - timedelta(days=dt.weekday())).isoformat()


def contest_key(g: dict) -> str:
    m = re.search(r"[?&]c=([\w-]+)", g.get("maxprepsUrl") or "")
    return m.group(1) if m else "id:" + g["id"]


def blank_entry(pid: str) -> dict:
    return {"playerId": pid, "cmp": None, "att": None, "yds": None, "td": None,
            "int": None, "rec": None, "tackles": None, "sacks": None, "ff": None,
            "fgm": None, "fga": None, "xpm": None, "xpa": None}


def entry(pid: str, **kw) -> dict:
    e = blank_entry(pid)
    e.update(kw)
    return e


def split_yds(total: int, n: int) -> list[int]:
    if n == 0:
        return []
    weights = sorted((rng.random() + 0.4 for _ in range(n)), reverse=True)
    s = sum(weights)
    parts = [max(0, int(round(total * w / s))) for w in weights]
    parts[0] += total - sum(parts)
    return parts


def gen_score() -> tuple[int, int, int]:
    """Realistic HS final: TD-heavy, occasional FG. Returns (pts, tds, fgs)."""
    tds = rng.randint(1, 7)
    fgs = rng.choice([0, 0, 0, 1])
    return tds * 7 + fgs * 3, tds, fgs


def quarters(total: int) -> list[int]:
    q = split_yds(total, 4)
    rng.shuffle(q)
    return q


def pick(roster: list[dict], positions: set[str], key, n: int) -> list[dict]:
    pool = [p for p in roster if p["position"] in positions]
    pool.sort(key=key, reverse=True)
    if len(pool) < n:
        pool += [p for p in roster if p["position"] == "ATH" and p not in pool]
    return pool[:n]


def nfl_rating(att: int, cmp_: int, yds: int, td: int, ints: int) -> float:
    if att == 0:
        return 0.0
    clamp = lambda v: max(0.0, min(2.375, v))  # noqa: E731
    a = clamp((cmp_ / att - 0.3) * 5)
    b = clamp((yds / att - 3) * 0.25)
    c = clamp(td / att * 20)
    d = clamp(2.375 - ints / att * 25)
    return round((a + b + c + d) / 6 * 100, 1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--weeks", type=int, default=5)
    args = parser.parse_args()

    teams = json.loads((DEST / "teams.json").read_text(encoding="utf-8"))
    games = json.loads((DEST / "games.json").read_text(encoding="utf-8"))
    players_25 = json.loads((SRC / "players.json").read_text(encoding="utf-8"))
    team_ids = {t["id"] for t in teams}

    rosters: dict[str, list[dict]] = defaultdict(list)
    for p in players_25:
        if p["teamId"] in team_ids:
            rosters[p["teamId"]].append(p)

    # First N calendar weeks (Monday-anchored) that have games.
    week_keys = sorted({monday_key(g["date"]) for g in games})[: args.weeks]
    week_set = set(week_keys)
    print(f"scoring weeks: {week_keys[0]} .. {week_keys[-1]}")

    # One physical game may appear as two perspective rows; group them so
    # both rows get the same result.
    groups: dict[str, list[dict]] = defaultdict(list)
    order: list[str] = []
    for g in games:
        k = contest_key(g)
        if k not in groups:
            order.append(k)
        groups[k].append(g)

    season = defaultdict(lambda: defaultdict(int))     # player id -> stat sums
    tt = defaultdict(lambda: defaultdict(int))         # team id -> totals
    results = defaultdict(list)                        # team id -> [(date, "W"/"L")]
    teams_by_id = {t["id"]: t for t in teams}

    def team_offense(team_id: str, tds: int, box: dict, opp_dbs: list[dict]):
        roster = rosters[team_id]
        qbs = pick(roster, {"QB"}, lambda p: p["stats"]["passing"]["att"], 1)
        rbs = pick(roster, {"RB"}, lambda p: p["stats"]["rushing"]["att"], 2)
        wrs = pick(roster, {"WR", "TE"}, lambda p: p["stats"]["receiving"]["rec"], 4)

        pass_td = rng.randint(0, tds)
        rush_td = tds - pass_td
        pass_yds = rng.randint(90, 210) + pass_td * 30
        rush_yds = rng.randint(80, 180) + rush_td * 25
        ints = rng.choice([0, 0, 0, 1, 1, 2])

        if qbs:
            q = qbs[0]
            att = rng.randint(16, 34)
            cmp_ = int(att * rng.uniform(0.5, 0.72))
            box["passing"].append(entry(label(q), att=att, cmp=cmp_, yds=pass_yds,
                                        td=pass_td, int=ints))
            s = season[q["id"]]
            s["passAtt"] += att; s["passCmp"] += cmp_; s["passYds"] += pass_yds
            s["passTd"] += pass_td; s["passInt"] += ints; s["games"] += 1
            qb_rush = rng.randint(5, 40)
            box["rushing"].append(entry(label(q), yds=qb_rush, td=0))
            s["rushAtt"] += rng.randint(3, 7); s["rushYds"] += qb_rush
            rush_yds_rb = rush_yds - qb_rush
        else:
            rush_yds_rb = rush_yds

        rb_parts = split_yds(max(rush_yds_rb, 0), len(rbs))
        rb_tds = [0] * len(rbs)
        for _ in range(rush_td):
            if rbs:
                rb_tds[rng.randrange(len(rbs))] += 1
        for p, yds, td in zip(rbs, rb_parts, rb_tds):
            box["rushing"].append(entry(label(p), yds=yds, td=td))
            s = season[p["id"]]
            s["rushAtt"] += max(6, yds // 5); s["rushYds"] += yds; s["rushTd"] += td
            s["games"] += 1

        wr_parts = split_yds(pass_yds, len(wrs))
        wr_tds = [0] * len(wrs)
        for _ in range(pass_td):
            if wrs:
                wr_tds[rng.randrange(len(wrs))] += 1
        for p, yds, td in zip(wrs, wr_parts, wr_tds):
            rec = max(1, yds // rng.randint(9, 16))
            box["receiving"].append(entry(label(p), rec=rec, yds=yds, td=td))
            s = season[p["id"]]
            s["rec"] += rec; s["recYds"] += yds; s["recTd"] += td; s["games"] += 1

        for i in range(ints):
            if opp_dbs:
                season[opp_dbs[i % len(opp_dbs)]["id"]]["defInt"] += 1
        return pass_yds, rush_yds, ints

    def team_defense(team_id: str, box: dict, ints_forced: int) -> None:
        roster = rosters[team_id]
        defenders = pick(roster, {"LB", "DL", "DB"},
                         lambda p: p["stats"]["defense"]["tackles"], 6)
        for i, p in enumerate(defenders):
            tackles = max(2, int(rng.gauss(9 - i * 1.2, 2.5)))
            sacks = rng.choice([0, 0, 0, 0, 1, 1, 2]) if p["position"] in ("DL", "LB") else 0
            picked = 1 if i < ints_forced else 0
            box["defense"].append(entry(label(p), tackles=tackles, sacks=sacks,
                                        int=picked or None))
            s = season[p["id"]]
            s["tackles"] += tackles; s["sacks"] += sacks; s["games"] += 1

    scored = 0
    for k in order:
        rows = groups[k]
        if monday_key(rows[0]["date"]) not in week_set:
            continue
        # Physical home/away team ids: prefer the canonical id from any row.
        home_id = next((r["homeTeamId"] for r in rows if r["homeTeamId"] in team_ids), None)
        away_id = next((r["awayTeamId"] for r in rows if r["awayTeamId"] in team_ids), None)

        hs, h_tds, _ = gen_score()
        as_, a_tds, _ = gen_score()
        if hs == as_:
            hs += 7
            h_tds += 1

        box = {"passing": [], "rushing": [], "receiving": [], "defense": []}
        home_dbs = [p for p in rosters.get(home_id, []) if p["position"] == "DB"][:3]
        away_dbs = [p for p in rosters.get(away_id, []) if p["position"] == "DB"][:3]
        h_pass = h_rush = h_ints = a_pass = a_rush = a_ints = 0
        if home_id:
            h_pass, h_rush, h_ints = team_offense(home_id, h_tds, box, away_dbs)
        if away_id:
            a_pass, a_rush, a_ints = team_offense(away_id, a_tds, box, home_dbs)
        if home_id:
            team_defense(home_id, box, a_ints)
        if away_id:
            team_defense(away_id, box, h_ints)

        q = {"home": quarters(hs), "away": quarters(as_)}
        for r in rows:
            r["homeScore"] = hs
            r["awayScore"] = as_
            r["quarterScores"] = q
            r["status"] = "final"
            r["dataStatus"] = "complete"
            r["boxScore"] = box
        scored += 1

        same_region = (
            home_id and away_id
            and teams_by_id[home_id].get("district")
            and teams_by_id[home_id]["district"] == teams_by_id[away_id].get("district")
        )
        for tid, pf, pa, py, ry, pya, rya, tol, tof, side in (
            (home_id, hs, as_, h_pass, h_rush, a_pass, a_rush, h_ints, a_ints, "home"),
            (away_id, as_, hs, a_pass, a_rush, h_pass, h_rush, a_ints, h_ints, "away"),
        ):
            if not tid:
                continue
            t = tt[tid]
            won = pf > pa
            t["pf"] += pf; t["pa"] += pa
            t["passYds"] += py; t["rushYds"] += ry
            t["passYdsA"] += pya; t["rushYdsA"] += rya
            t["toL"] += tol; t["toF"] += tof
            t["w" if won else "l"] += 1
            t[f"{side}W" if won else f"{side}L"] += 1
            if same_region:
                t["regW" if won else "regL"] += 1
            results[tid].append((rows[0]["date"], "W" if won else "L"))

    # Team season aggregates.
    for t in teams:
        s = tt[t["id"]]
        t["record"] = {"wins": s["w"], "losses": s["l"]}
        t["stats"] = {
            "pointsFor": s["pf"], "pointsAgainst": s["pa"],
            "yardsFor": s["passYds"] + s["rushYds"],
            "yardsAgainst": s["passYdsA"] + s["rushYdsA"],
            "passYdsFor": s["passYds"], "rushYdsFor": s["rushYds"],
            "passYdsAgainst": s["passYdsA"], "rushYdsAgainst": s["rushYdsA"],
            "turnoversForced": s["toF"], "turnoversLost": s["toL"],
        }
        t["homeRecord"] = {"wins": s["homeW"], "losses": s["homeL"]}
        t["awayRecord"] = {"wins": s["awayW"], "losses": s["awayL"]}
        t["neutralRecord"] = {"wins": 0, "losses": 0}
        t["regionRecord"] = {"wins": s["regW"], "losses": s["regL"]}
        seq = [r for _, r in sorted(results[t["id"]])]
        if seq:
            count = 1
            for r in reversed(seq[:-1]):
                if r == seq[-1]:
                    count += 1
                else:
                    break
            t["streak"] = {"count": count, "result": seq[-1]}
        else:
            t["streak"] = None

    # Player season stats from the accumulators.
    out_players = []
    for tid in sorted(team_ids):
        for p in rosters[tid]:
            s = season[p["id"]]
            np_ = json.loads(json.dumps(p))
            np_["season"] = SEASON
            np_["gamesPlayed"] = s["games"]
            ypc = round(s["rushYds"] / s["rushAtt"], 1) if s["rushAtt"] else 0.0
            np_["stats"] = {
                "passing": {"att": s["passAtt"], "cmp": s["passCmp"], "yds": s["passYds"],
                            "td": s["passTd"], "int": s["passInt"],
                            "rating": nfl_rating(s["passAtt"], s["passCmp"], s["passYds"],
                                                 s["passTd"], s["passInt"])},
                "rushing": {"att": s["rushAtt"], "yds": s["rushYds"],
                            "td": s["rushTd"], "ypc": ypc},
                "receiving": {"rec": s["rec"], "yds": s["recYds"], "td": s["recTd"]},
                "defense": {"tackles": s["tackles"], "sacks": s["sacks"],
                            "int": s["defInt"], "ff": s["ff"]},
                "kicking": {"fgm": 0, "fga": 0, "xpm": 0, "xpa": 0},
            }
            out_players.append(np_)

    (DEST / "teams.json").write_text(json.dumps(teams, indent=2), encoding="utf-8")
    (DEST / "players.json").write_text(json.dumps(out_players, indent=2), encoding="utf-8")
    (DEST / "games.json").write_text(json.dumps(games, indent=2), encoding="utf-8")
    active = sum(1 for t in teams if t["record"]["wins"] + t["record"]["losses"] > 0)
    print(f"scored {scored} games across {len(week_keys)} weeks; "
          f"{active} teams with results, {len(out_players)} players -> {DEST}")


if __name__ == "__main__":
    main()
