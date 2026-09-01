# YouTube Description Template — Varsity Voices MHSAA Episodes

Canonical format supplied by Garret (Aug 2026). **Everything from the studio line
down is fixed and must be reproduced verbatim** — do not reword, reorder, or trim
it unless Garret says so. Only the header line, the intro paragraph, and the
`ON THIS EPISODE` block change per episode.

For MAIS episodes use `description-template.md` instead — the two leagues have
different hosts and a different partner block.

## The full set of episode deliverables

| Deliverable | Where |
|---|---|
| Title | below — same string as the description's header line |
| Description | this file |
| Thumbnail prompt | `templates/graphics/image-prompts/mhsaa-thumbnail-template.md` |
| Tags | `templates/youtube/tags-template.md` |

## Title

The YouTube title is the description's header line, verbatim:

```
Varsity Voices | MHSAA 2026 Week 1 Recap — 7A Through 1A — S2 E01
```

Pattern: `Varsity Voices | [EPISODE TITLE] — S2 E##`

The episode code trails behind a **spaced em dash**, not in parentheses — set by
Garret on Aug 31 2026; the older `(S2 E##)` form is dead. That puts two em dashes
in a typical title, one before the class list and one before the episode code,
and that is correct.

**Do not append a part number unless Garret says the episode is being split.**
Most episodes are one part and carry none at all.

**Player of the Week and Team of the Week episodes carry no season or episode
code at all** (Garret, Sep 1 2026). End the title after the subject —
`Varsity Voices | MHSAA Week 1 Team of the Week — Meridian's Tony Vance`. They
sit outside the count and do not consume a number, so the next regular episode
keeps the number it would have had. The week number still applies.

## Fixed facts

- **Host:** Breck Riley
- **Co-hosts:** Jared Shotts, Brandon Davis, Jake Wimberly
  (the MAIS panel — Lee Adams, Cliff Barker, Cooper Sanders — is a different show)
- **Header format:** `Varsity Voices | [EPISODE TITLE] — S2 E##`
- **Episode numbers count per league, not across the show; the season number is
  shared.** Garret set the per-league episode count on Aug 31 2026, because the
  two leagues start on different weeks and a shared count is wrong for one of
  them. **Both leagues sit on Season 2** — he confirmed on Sep 1 2026 that MAIS
  is Season 2, not Season 1, correcting an earlier version of this line. The two
  episode counts run independently — there is an Episode 2 in each — so never
  treat a number as taken because the other league used it.
- **A season preview is `E00`** in both leagues, sitting before the count, so the
  first recap is E01 and the sequence reads chronologically. The MHSAA 2026
  Season Preview is **S2 E00** (the MAIS one is `S2 E00` too); the MHSAA Week 1 recap
  (Aug 28 slate, published Aug 30 2026) is **S2 E01**. Don't trust source
  filenames or slide numbers — that episode's transcript was named `edit-05-...`.
  Confirm the number with Garret when the next one isn't obvious.
- **When a week or episode label isn't settled, label it with the date instead**
  (Garret, Aug 31 2026) — don't guess a number and don't leave it blank.
- **Hashtags:** MHSAA set below; never the MAIS set.

## Template

```
Varsity Voices | [EPISODE TITLE] — S2 E##

The State Championships Radio Network presents Varsity Voices — your home for Mississippi high school football. Host Breck Riley and Co-Hosts Jared Shotts, Brandon Davis, and Jake Wimberly [WHAT THIS EPISODE COVERS — classes, school/region counts, a hook stat].

ON THIS EPISODE
• Game of the Week — [MATCHUP + SCORE]
• [BIGGEST STORYLINE — one line]
• [UPSET OR SURPRISE — one line]
• Play of the Week — [WHAT HAPPENED, one line]
• Player of the Week — [NAME, SCHOOL: STAT LINE]
• [RECURRING SEGMENT — e.g., pick'em results and next week's board]

Broadcasting from the Environment Masters Studio — hassle-free plumbing and AC.

THANKS TO OUR PARTNERS
C SPIRE — Rick's Pro Truck — Environment Masters — Entergy Mississippi — Cherokee Brick — Explore Ridgeland — Farm Families of Mississippi — Hinds Community College — Mississippi Department of Transportation — Lighthouse Limo Services — Mississippi Army National Guard — Mississippi Sports Medicine & Orthopedic — Hebert Professional Services — Case Flooring — Pine Straw America — Genuine MS — Oxford Falls

FOLLOW THE NETWORK
@STATECHAMPRADIO on YouTube, Instagram, TikTok, Facebook & Twitter

New episodes every week.

#MHSAA #MississippiFootball #HighSchoolFootball #VarsityVoices #MHSAAFootball #FridayNightLights
```

## ON THIS EPISODE length

**Roughly 6–9 one-line bullets, and no more.** Garret, Sep 1 2026: "Descriptions
are too long. Need to severely shorten the 'in this episode' section." It applies
to both leagues.

- **No per-class scoreboard dumps.** Never write a `• 7A — ` … `• 1A — ` bullet
  that lists every score in the class. Name only the games that got real airtime —
  the game of the week, the upsets, the cross-league wins. The full slate lives
  on the dashboard, not in the description.
- **No full Players to Watch roster.** A block of a dozen-plus names with stat
  lines is far too much. Give the Player of the Week with their line, plus at most
  one or two others if they carried a segment.
- **No filler bullets** — housekeeping like the MaxPreps stats plea doesn't earn
  a line.
- Lead each bullet with its label (`Game of the Week —`, `Play of the Week —`,
  `Player of the Week —`), then the shortest true statement of what happened.
  Scores stay; commentary and qualifiers go.

Only the bullet section is affected — everything from the studio line down stays
fixed and verbatim, and the header and intro paragraph are unchanged. On a season
preview, where a per-class bullet genuinely is the content, keep one short line
per class and still drop the roster. **The 4A-1A preview example below predates
this rule and runs long — copy its sourcing and structure, not its length.**

## Sourcing rules

- School counts, region counts and defending champions are verifiable from
  `web/public/data/<season>/teams.json` and `champs.json` — use them, don't guess.
- Players to Watch stat lines come from the deck; they can be cross-checked
  against `web/public/data/2025-26/players.json`. A 2026 senior appears as a
  junior in that file, so verify the **stats**, not the class.
- Never invent hosts, players, stats, or partners.

## Reference example (4A-1A season preview)

> **Two notes on this example.**
>
> 1. **The header has been renumbered and reformatted.** Garret renumbered this
>    episode from `S2 E02` to **`S2 E00`** on Aug 31 2026 — a season preview sits
>    before the count, so the first recap is E01 and the sequence reads
>    chronologically. The header below also uses the current em-dash format
>    instead of the dead parenthetical one. **The published YouTube title still
>    carries the old `(S2 E02 - Part 2)` string** and would need editing on
>    YouTube to match. How a part number attaches under the em-dash format is not
>    confirmed — `— S2 E00 - Part 2` below is a best guess; ask before relying on
>    it.
> 2. **The partner block was corrected on Aug 31 2026.** It used to sit here
>    split across five lines with Oxford Falls missing — 16 partners instead of
>    17. Both this example and the Template section above now carry the single
>    continuous line with a spaced em dash between all 17, ending `— Genuine MS —
>    Oxford Falls`, matching the MAIS template and the packages in
>    `assets-shorts/`. **The published description for this episode still has the
>    old 16-partner block** and would need editing on YouTube to match.
>
> The structure, sourcing and Players-to-Watch formatting in this example are
> still correct.

```
Varsity Voices | MHSAA 2026 Season Preview — 4A, 3A, 2A & 1A — S2 E00 - Part 2

The State Championships Radio Network presents Varsity Voices — your home for Mississippi high school football. Host Breck Riley and Co-Hosts Jared Shotts, Brandon Davis, and Jake Wimberly wrap up the 2026 MHSAA season preview with Class 4A, 3A, 2A and 1A — 154 schools, and four title games last December that were all decided by 8 points or fewer.

ON THIS EPISODE
• MHSAA Class 4A Preview — 40 schools across 8 regions. Columbia defends its
  crown after a 6-0 shutout of Kosciusko in the title game.
• MHSAA Class 3A Preview — 39 schools across 8 regions. Raleigh returns as
  defending champion following a 12-6 win over Noxubee County.
• MHSAA Class 2A Preview — 39 schools across 8 regions. East Webster is back on
  top after a 28-16 victory over Heidelberg.
• MHSAA Class 1A Preview — 36 schools across 8 regions. Calhoun City defends
  after edging Simmons 14-8.
• Players to Watch —
  Tylan Keys  RB · SR · Poplarville · 3,285 rush yds, 45 TD
  Paris Trivillion  QB · SR · Pass Christian · 2,570 pass yds, 34 TD
  Deavion Watson  RB · SR · Senatobia · 1,785 rush yds, 24 TD
  Caiden Wade  QB · SR · Kosciusko · 2,402 pass yds, 22 TD
  Brady Chancelor  QB · JR · Seminary · 3,419 pass yds, 30 TD
  Smith Stringer  QB · SR · Presbyterian Christian · 2,783 pass yds, 37 TD
  Yoshawn Hudson  RB · SR · Winona · 1,544 rush yds, 22 TD
  Brandon Haines  RB · JR · Hazlehurst · 1,515 rush yds, 15 TD
  Chase Craft  QB · SR · Heidelberg · 2,912 pass yds, 35 TD
  Jordyn Kees  RB · SR · Loyd Star · 2,000 rush yds, 25 TD
  Peyton Perkins  QB · SR · Eupora · 1,907 rush yds, 25 TD
  Rush Watkins  QB · JR · Baldwyn · 1,923 pass yds, 18 TD
  Korben Sanders  RB · SR · Nanih Waiya · 1,809 rush yds, 23 TD
  Jayden Poole  RB · SR · Bogue Chitto · 1,598 rush yds, 29 TD
  Tayshawn Scott  RB · SR · Taylorsville · 1,553 rush yds, 20 TD
  DJ Gatson  RB · SR · Simmons · 1,511 rush yds, 22 TD

Broadcasting from the Environment Masters Studio — hassle-free plumbing and AC.

THANKS TO OUR PARTNERS
C SPIRE — Rick's Pro Truck — Environment Masters — Entergy Mississippi — Cherokee Brick — Explore Ridgeland — Farm Families of Mississippi — Hinds Community College — Mississippi Department of Transportation — Lighthouse Limo Services — Mississippi Army National Guard — Mississippi Sports Medicine & Orthopedic — Hebert Professional Services — Case Flooring — Pine Straw America — Genuine MS — Oxford Falls

FOLLOW THE NETWORK
@STATECHAMPRADIO on YouTube, Instagram, TikTok, Facebook & Twitter

New episodes every week.

#MHSAA #MississippiFootball #HighSchoolFootball #VarsityVoices #MHSAAFootball #FridayNightLights
```

*All 16 Players to Watch stat lines in this example were verified against
`2025-26/players.json` — names, schools, yardage and TD totals all match.*
