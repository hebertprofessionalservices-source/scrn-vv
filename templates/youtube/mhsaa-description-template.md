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
Varsity Voices | MHSAA 2026 Season Preview — 4A, 3A, 2A & 1A (S2 E02 - Part 2)
```

Pattern: `Varsity Voices | [EPISODE TITLE] (S2 E## - Part N)` — em dash before the
class list, spaced hyphen inside the parentheses.

## Fixed facts

- **Host:** Breck Riley
- **Co-hosts:** Jared Shotts, Brandon Davis, Jake Wimberly
  (the MAIS panel — Lee Adams, Cliff Barker, Cooper Sanders — is a different show)
- **Header format:** `Varsity Voices | [EPISODE TITLE] (S2 E## - Part N)`
- **Season:** the show is in Season 2 (2026). The MHSAA 2026 Season Preview is
  **S2 E02**, Parts 1 (7A-5A) and 2 (4A-1A). Don't trust source filenames or slide
  numbers — confirm with Garret.
- **Hashtags:** MHSAA set below; never the MAIS set.

## Template

```
Varsity Voices | [EPISODE TITLE] (S2 E## - Part N)

The State Championships Radio Network presents Varsity Voices — your home for Mississippi high school football. Host Breck Riley and Co-Hosts Jared Shotts, Brandon Davis, and Jake Wimberly [WHAT THIS EPISODE COVERS — classes, school/region counts, a hook stat].

ON THIS EPISODE
• [CLASS PREVIEW — N schools across N regions. Defending champion + title-game result.]
• [repeat per class]
• Players to Watch —
  [NAME]  [POS] · [CLASS] · [SCHOOL] · [SEASON STAT LINE]
  [...]
• [RECURRING SEGMENT — e.g., 2026 All-State Teams]

Broadcasting from the Environment Masters Studio — hassle-free plumbing and AC.

THANKS TO OUR PARTNERS
C SPIRE — Rick's Pro Truck — Environment Masters — Entergy Mississippi — Cherokee Brick
Explore Ridgeland — Farm Families of Mississippi — Hinds Community College
Mississippi Department of Transportation — Lighthouse Limo Services
Mississippi Army National Guard — Mississippi Sports Medicine & Orthopedic
Hebert Professional Services — Case Flooring — Pine Straw America — Genuine MS

FOLLOW THE NETWORK
@STATECHAMPRADIO on YouTube, Instagram, TikTok, Facebook & Twitter

New episodes every week.

#MHSAA #MississippiFootball #HighSchoolFootball #VarsityVoices #MHSAAFootball #FridayNightLights
```

## Sourcing rules

- School counts, region counts and defending champions are verifiable from
  `web/public/data/<season>/teams.json` and `champs.json` — use them, don't guess.
- Players to Watch stat lines come from the deck; they can be cross-checked
  against `web/public/data/2025-26/players.json`. A 2026 senior appears as a
  junior in that file, so verify the **stats**, not the class.
- Never invent hosts, players, stats, or partners.

## Reference example (S2 E02 Part 2, 4A-1A)

```
Varsity Voices | MHSAA 2026 Season Preview — 4A, 3A, 2A & 1A (S2 E02 - Part 2)

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
C SPIRE — Rick's Pro Truck — Environment Masters — Entergy Mississippi — Cherokee Brick
Explore Ridgeland — Farm Families of Mississippi — Hinds Community College
Mississippi Department of Transportation — Lighthouse Limo Services
Mississippi Army National Guard — Mississippi Sports Medicine & Orthopedic
Hebert Professional Services — Case Flooring — Pine Straw America — Genuine MS

FOLLOW THE NETWORK
@STATECHAMPRADIO on YouTube, Instagram, TikTok, Facebook & Twitter

New episodes every week.

#MHSAA #MississippiFootball #HighSchoolFootball #VarsityVoices #MHSAAFootball #FridayNightLights
```

*All 16 Players to Watch stat lines in this example were verified against
`2025-26/players.json` — names, schools, yardage and TD totals all match.*
