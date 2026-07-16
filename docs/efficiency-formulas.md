# How the Dashboard Calculates Efficiency

*Varsity Voices Dashboard — plain-English reference for on-air use*

All underlying numbers (yards, attempts, touchdowns, points) come from MaxPreps,
which is the source of record. The dashboard never invents statistics — when a
number isn't available, it shows **n/a**.

---

## Offensive Efficiency (Player Leaderboards)

When the home page stat dropdown is set to **Efficiency**, each position is
ranked by the standard efficiency measure for that position:

### Quarterbacks — Passer Rating

The passer rating shown is the rating published by MaxPreps, which follows the
**NFL passer rating formula** (verified against our dataset — it matches to
the decimal). It combines four per-attempt components, each capped at 2.375:

```
a = (Completions ÷ Attempts − 0.3) × 5
b = (Yards ÷ Attempts − 3) × 0.25
c = (TDs ÷ Attempts) × 20
d = 2.375 − (INTs ÷ Attempts × 25)

Rating = ((a + b + c + d) ÷ 6) × 100        (each of a–d clamped between 0 and 2.375)
```

The scale runs 0 to 158.3 ("perfect"). Roughly: 90+ is good, 110+ is very
good, 130+ is elite.

### Running Backs — Yards Per Carry (YPC)

```
YPC = Rushing Yards ÷ Rushing Attempts
```

### Receivers — Yards Per Reception (Y/R)

```
Y/R = Receiving Yards ÷ Receptions
```

### Minimum qualifiers

Efficiency stats are misleading in tiny samples (a back with two carries for
40 yards would "lead the state" at 20.0 YPC). To keep the leaderboards honest:

| Position | Minimum to qualify |
|---|---|
| QB | 50 pass attempts |
| RB | 50 carries |
| WR | 20 receptions |

Players under the minimum still appear in the Yards/Touchdowns/volume
leaderboards — they're only excluded from Efficiency.

---

## Defensive Efficiency (Top Defenses)

Defenses are ranked by **Points Allowed Per Game** — the fewest points
surrendered, on average, across all games played:

```
PA/G = Total Points Allowed ÷ Games Played
```

Lower is better. This is the cleanest single defensive measure available at
the high school level, because points allowed is reported for essentially
every game, while defensive yardage is only published for a fraction of teams
(where yardage is unpublished the dashboard shows a dash rather than a
misleading zero).

---

## Team Efficiency — Offense & Defense

These are the team-level efficiency stats that feed the power rankings.
Modeled on college/NFL efficiency measures using the numbers actually
available at the high school level. Where a number can't be computed
honestly, the dashboard shows **n/a** rather than a guess.

### Offense

| Stat | Formula | Availability today |
|---|---|---|
| Off PPG | Points Scored ÷ Games | All 310 teams |
| Yards per Rush | Rushing Yards ÷ Rushing Attempts | ~250 teams (where coaches publish season stats) |
| Yards per Pass Attempt | Passing Yards ÷ Pass Attempts | ~250 teams |
| Yards per Play | (Rush Yds + Pass Yds) ÷ (Rush Att + Pass Att) | ~250 teams |
| Explosive Plays (20+ yd) | Count of plays gaining 20+ yards | **Not available** — MaxPreps publishes season totals and box-score totals, not play-by-play, so 20+ yard plays cannot be counted. Shows n/a. If MaxPreps adds play data or SCRN charts games, this slots straight in. |

Attempts are aggregated from every player's season stats on the roster, so
these can be computed for every team whose coach publishes stats (~80% of
the state).

### Defense

Coaches almost never publish defensive yardage on MaxPreps — in our current
dataset, **0 of 310 teams** have defensive yardage filled in. So, exactly as
suggested, defensive numbers are solved from the **inverse of opponents'
offensive output**: what opponents gained in games against this team, summed
from box scores.

| Stat | Formula | Availability today |
|---|---|---|
| Def PPG | Points Allowed ÷ Games | All 310 teams (scores are always reported) |
| Def Yards per Game | Opponents' total yards vs us ÷ Games charted | **Live** — solved from opponents' box-score output; each value is labeled with its coverage, e.g. "291 (10 of 11 games charted)" |
| Def Yards per Pass Attempt | Opponents' pass yards vs us ÷ their pass attempts | **Live** — same box-score method (pass attempts are in box scores) |
| Def Yards per Rush | Opponents' rush yards vs us ÷ their rush attempts | **n/a** — MaxPreps box scores omit rushing attempt counts, so this cannot be computed honestly |
| Def Yards per Play | Opponents' total yards vs us ÷ their total plays | **n/a** — blocked by the same missing rushing attempts |

Opponent output is attributed to the right sideline by matching box-score
names against both rosters; games where more than 15% of the yardage can't
be attributed are excluded rather than guessed at.

### Composite Efficiency Index (live)

The single Offensive and Defensive Efficiency numbers shown on team pages:

```
Offensive Efficiency = 50% × Off PPG percentile + 50% × Yards-per-Play percentile
Defensive Efficiency = 50% × Def PPG percentile + 50% × Def Yards-per-Game percentile
                       (Def PPG alone when box scores cover under half a team's games)
```

Each stat is converted to a 0–100 percentile against all Mississippi teams,
so "87 offensive efficiency" reads as "better than 87% of the state." Teams
without published offensive yardage show n/a for Offensive Efficiency.

---

## Related: SCRN Power Ranking

The SCRN Power Ranking (team pages) blends offense and defense into one
number using a Simple Rating System (SRS):

```
Team Rating = Average Scoring Margin + Average Opponent Rating
```

- **Scoring margin** = points scored minus points allowed, per game, capped at
  ±28 so running up the score doesn't inflate a rating.
- **Opponent rating** (strength of schedule) is folded in by recalculating the
  ratings repeatedly until they settle — beating good teams moves you up more
  than beating weak ones.
- Only games between two Mississippi teams in our dataset count.

Teams are then ranked #1–#310 overall, and separately within their
classification.

---

*Questions or a different formula preference? The formulas are easy to adjust —
this document reflects what is live on the dashboard today.*
