# YouTube Tags Template — Varsity Voices Episodes

Hard limit: **500 characters total**, punctuation included. Always verify the
count before delivering.

**Counting rule, confirmed by Garret Sep 9 2026:** each tag costs its own
length (including internal spaces) plus 1 for its trailing comma. No quote-
wrapping, no other overhead — an earlier same-day theory guessing YouTube
quote-wraps multi-word tags (+2 chars each) was wrong and is retracted; see
[[youtube-tags-character-counting]].

```python
total = sum(len(tag) + 1 for tag in tags)
```

This is effectively a plain comma-joined length (off by one for a trailing
comma) — a plain `len(','.join(tags))` is accurate enough in practice.

Format (Garret, Sep 2026 — supersedes the Aug 2026 base list below the line):
- Comma-separated, **no spaces after commas**
- The MUST-have list is fixed and goes on **every** video, unchanged
- Fill the remaining budget with relevant episode tags: school names, team
  names, player names, etc. — as many as fit

## MUST-have list — every video (382 chars, 26 tags)

```
SCRN,sports podcast,high school sports,varsity sports,sports talk,sports commentary,college recruiting,sports recruiting,high school football,sports highlights,game analysis,hot takes,sports predictions,high school,athletics,sports news,mississippi,mississippi sports,West Point football,college football,mississippi high school football,mhsaa football,touchdown,football,MHSAA,MAIS
```

That leaves **~117 characters** (383 for the 26-tag base by the confirmed
formula, out of 500) — enough for roughly 5-7 short episode tags. Every added
tag costs its own length + 1 for the comma.

## Picking the episode tags

Prioritize names actually featured in that episode: the marquee matchup
team(s), standout players, and schools tied to top stat lines or Player of
the Week. Spend the full remaining budget when relevant names are available —
don't leave it unused, and verify the final count with the confirmed formula
before delivering.

Example additions and their cost (length + comma):

- Team/school: `MRA football` (13) · `Hartfield Academy` (18) ·
  `Jackson Prep football` (22) · `Tri-County Academy` (19) ·
  `Starkville Academy` (19)
- Player: `Garrett Adcock` (15) · `Cade Hunt` (10)

Worked example (MAIS Week 3/4, Sep 9 2026): base list (383) + all 7 of the
additions above = 499/500 by the confirmed formula, 33 tags total. All fit —
no need to drop any of them.

---

## Superseded — Aug 2026 base list (kept for reference only)

The list below was the standing base list through Sep 2026 and is now
replaced by the MUST-have list above. Do not use it for new episodes.

```
SCRN,SCRN live,SCRN podcast,prep sports network,sports podcast,high school sports,prep spots,varsity sports,sports talk,sports commentary,student athletes,high school athletes,prep athletes,college recruiting,sports recruiting,high school football,sports highlights,game analysis,hot takes,sports predictions,coach interview,player spotlight,high school,athletics,sports news,recruiting news,prep football,mississippi,mississippi sports
```
