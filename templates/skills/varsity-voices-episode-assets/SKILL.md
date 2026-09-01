---
name: varsity-voices-episode-assets
description: Generates the four YouTube publishing assets for a Varsity Voices episode — Title, Description, Thumbnail image prompts (16:9 + 3:4 for an episode, 9:16 + 3:4 for a Short, with the logo corners left blank for post), and Tags — each in its own copy-paste block. Use when asked for a YouTube title, description, thumbnail prompt, or tags for a Varsity Voices / State Championships Radio Network episode (MHSAA or MAIS, season previews, weekly recaps, or Shorts).
---

# Varsity Voices — Episode Publishing Assets

Produces four assets for one episode. Always output **all four**, in this order,
each in its own fenced code block so it can be copied straight into YouTube.
Asset 3 is two blocks, not one — **16:9 + 3:4** for a full episode, **9:16 + 3:4**
for a Short:

1. **Title**
2. **Description**
3. **Thumbnail prompts** (two crops — see the table in Asset 3)
4. **Tags** (with the character count stated)

Keep commentary between blocks to a couple of lines. The blocks are the deliverable.

---

## Step 1 — Collect inputs

**Garret supplies three things on every invocation** (his instruction, Sep 1 2026):
**league** (MHSAA or MAIS), **format** (Short or Episode), and **publish date**.
Those three are the contract — expect them, and don't re-ask for them. Everything
else is derived from the repo data and the episode's deck or transcript.

| Input | Notes |
|---|---|
| League | **Given.** MHSAA or MAIS — changes hosts, partners, hashtags |
| Format | **Given.** Short or full episode — changes the title format (Asset 1) and which two thumbnail crops you output (Asset 3) |
| Publish date | **Given.** Names the saved file (`<league>-short-MMDDYY.txt` / `<league>-full-episode-MMDDYY.txt`) and fixes the week number |
| Episode title | e.g. "MHSAA 2026 Season Preview — 4A, 3A, 2A & 1A" |
| Season/episode | e.g. S2 E01. **Episode counted per league** — see Episode numbering below |
| Classes covered | e.g. 4A, 3A, 2A, 1A |
| Segments | The per-class bullets, storylines |
| Players to Watch | Name, position, class, school, stat line |
| Week | Derived from the publish date — the **league's own** week number, not the overall count. See Week numbering below |

If something outside the three given inputs is missing and can't be verified from
the repo or the supplied deck, **ask before generating** — never invent it.

If given a YouTube URL, get the real title from
`https://www.youtube.com/oembed?url=<watch-url>&format=json` rather than guessing.

**Never invent hosts, players, stats, or partners.** If the deck or transcript
isn't supplied, produce what you can verify and leave the rest in `[BRACKETS]`,
telling the user exactly what's needed to finish it.

## Step 2 — Verify what you can

If the `varsity-voices-dashboard` repo is available, check facts instead of trusting them:

- School and region counts per classification — `web/public/data/<season>/teams.json`
- Defending champions and title-game scores — `champs.json`
- Players to Watch stat lines — `web/public/data/2025-26/players.json`
  (a 2026 senior appears there as a junior, so verify the **stats**, not the class)

Report any mismatch rather than silently "correcting" it.

### Week numbering

**MAIS and MHSAA are not on the same week count** — MAIS opens **one week
earlier**. Use the week number for **that video's league**, not the dashboard's
overall count.

Weeks are Monday-to-Sunday, named by the Monday. 2026 anchors, confirmed by
Garret on Aug 31 2026:

| Week (Mon–Sun) | Friday slate | MAIS | MHSAA |
|---|---|---|---|
| Aug 17–23 | Aug 21 | Week 1 | — |
| **Aug 24–30** | **Aug 28** | **Week 2** | **Week 1** |
| **Aug 31–Sep 6** | **Sep 4** | **Week 3** | **Week 2** |
| Sep 7–13 | Sep 11 | Week 4 | Week 3 |

Garret restated the Aug 31–Sep 6 row directly on Sep 1 2026 — MAIS Week 3, MHSAA
Week 2 — which confirms the one-week offset still holds. Extend the table by
adding one to both counts per Friday slate rather than re-deriving it.

So an Aug 28 MHSAA video is labeled **Week 1** and an Aug 28 MAIS video is labeled
**Week 2** — same Friday, different label, and that is correct. Each Friday slate
advances both counts by one, so MAIS stays exactly one ahead.

The dashboard's own "overall" week is a separate internal convention. It does not
go on a video.

**When a week has no settled number, label it with the date instead** — Garret's
instruction, Aug 31 2026. Don't guess a number and don't leave it blank. That is
what covers the **Aug 14 2026 MAIS slate**, which falls before MAIS Week 1
(`games.json` carries `"week": 0` on those rows): label it "Aug 14", not "Week 0"
and not "Week 1".

### Episode numbering

**Season and episode numbers are counted per league too, not across the show.**
Garret set this on Aug 31 2026, for the same reason the weeks are offset — the
leagues start on different Fridays, so one shared count is always wrong for one
of them.

- **A season preview is `E00`, in both leagues.** It sits before the count, so
  the first *recap* is E01 and the sequence reads chronologically. Garret set
  this on Aug 31 2026: the MHSAA 2026 Season Preview is **`S2 E00`** (renumbered
  from `S2 E02`) and the MAIS season preview is **`S2 E00`**.
- **Both leagues run on Season 2.** The MHSAA Week 1 recap (Aug 28 slate,
  published Aug 30 2026) is **S2 E01**.
- **MAIS runs its own Season 2 count.** The MAIS Week 1 recap (Aug 21 slate) is
  **S2 E01** and the MAIS Week 2 recap (Aug 28 slate, published Aug 31 2026) is
  **S2 E02**. Garret corrected this on Aug 31 2026 — MAIS is Season 2, not
  Season 1; only the *episode* count is per-league, the season number is shared.
- **The two sequences are independent, so the same number appears in both.**
  There will be an Episode 2 for MAIS and an Episode 2 for MHSAA. Never treat a
  number as taken because the other league used it, and never bump one league's
  count to dodge a clash.
- **Player of the Week and Team of the Week episodes carry NO season or episode
  number at all.** Garret's rule, Sep 1 2026. The title simply ends after the
  subject — no trailing `— S2 E##`, no `E00`, nothing. These specials sit
  outside the league's count entirely, so they **do not consume a number** and
  the next regular episode keeps the number it would have had. Example:

  ```
  Varsity Voices | MHSAA Week 1 Team of the Week — Meridian's Tony Vance
  ```

  They still carry the league's own **week** number — only the episode code is
  dropped.

Never infer the next number from a filename or a slide — the MHSAA Week 1
recap's transcript was named `edit-05-...` and the episode is E01. Work out the
league first, then that league's own count, and ask when it isn't obvious.

One thing is still unconfirmed: how a part number attaches under the em-dash
title format when an episode really is split. Ask if it comes up — parts are now
the exception, not the default.

---

## Asset 1 — Title

Two formats. **Full episodes** use the branded header format; **Shorts** use the
hook-first format. Decide which one applies before writing anything else — if the
user hasn't said, ask.

### Full episodes

The title is the description's header line, verbatim.

```
Varsity Voices | [EPISODE TITLE] — S2 E##
```

The episode code trails behind a **spaced em dash**, not in parentheses. Set by
Garret on Aug 31 2026; the older `(S2 E##)` parenthetical form is dead.

Example, verbatim from Garret:
`Varsity Voices | MHSAA 2026 Week 1 Recap — 7A Through 1A — S2 E01`

That puts two em dashes in a typical title — one before the class list, one
before the episode code — and that is correct.

**Never append a part number unless the user says the episode is being split.**
Most episodes are one part and carry none at all.

**Player of the Week and Team of the Week episodes get no episode code.** Drop
the ` — S2 E##` entirely and end the title after the subject:

```
Varsity Voices | [LEAGUE] Week [N] Team of the Week — [SUBJECT]
```

### Shorts

A Short has no episode numbering and no leading brand — it has to earn the tap in
the first three words. Lead with the hook, then say who, then close with the brand:

```
[HOOK] — [WHO + WHAT THEY'RE DOING] | Varsity Voices
```

Example: `683 Yards in 2 Games — Majure Chandler Is Spinning It | Varsity Voices`

- **Hook first.** A hard number is the strongest opener — `683 Yards in 2 Games`,
  `A 31-Point Fourth Quarter`, `Four Picks in One Half`. If the clip has no stat,
  use the surprise instead — `Nobody Has Scored on Them Yet`.
- **Then the person or team**, with a short active claim about them:
  `Majure Chandler Is Spinning It`, `Madison-Ridgeland Is Not Slowing Down`.
- **Always end with ` | Varsity Voices`** — spaced pipe, exactly that wording.
  No league tag, no season, no part number.
- **Em dash** (` — `, spaced) between hook and subject. One dash only.
- **Title Case** on both halves. No ALL CAPS, no emoji, no `#hashtags` in the title.
- **Keep it under 70 characters** including the brand suffix, or the middle gets
  clipped on mobile. If it runs long, cut words from the claim, never from the hook.
- **The hook must be true and the clip must deliver it.** Verify the stat against
  the repo data (Step 2) before it goes in a title. Never round up, never invent a
  number to make it land harder, and never promise something the clip doesn't show.

More shapes that work: `[N] Straight Wins — [Team] Is the One Nobody Wants | Varsity Voices` ·
`[Player] Just Did Something You Don't See in [Class] | Varsity Voices` ·
`They Were Down [N] at Half — [Team] Didn't Blink | Varsity Voices`

---

## Asset 2 — Description

### MHSAA

Everything from the studio line down is **fixed — reproduce verbatim**. Only the
header, intro paragraph, and ON THIS EPISODE change.

- Host: **Breck Riley**
- Co-hosts: **Jared Shotts, Brandon Davis, Jake Wimberly**

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

### MAIS

Different show, different panel — **do not cross them over**.

- Host: **Lee Adams** · Co-hosts: **Cliff Barker, Cooper Sanders**
- **Guest co-hosts** sit in from time to time (e.g. Spence Shepard). Name a guest in the
  intro paragraph for the episode they appear on, but **never add them to the standing
  panel** — the three above are the regulars. If a voice in the transcript isn't one of
  the three, ask who it is rather than guessing or substituting a regular's name.
- Partners are **the same fixed network block MHSAA uses** — reproduce it verbatim, in full,
  on every episode and every Short. They do **not** rotate and are not trimmed to the deck:

```
THANKS TO OUR PARTNERS
C SPIRE — Rick's Pro Truck — Environment Masters — Entergy Mississippi — Cherokee Brick — Explore Ridgeland — Farm Families of Mississippi — Hinds Community College — Mississippi Department of Transportation — Lighthouse Limo Services — Mississippi Army National Guard — Mississippi Sports Medicine & Orthopedic — Hebert Professional Services — Case Flooring — Pine Straw America — Genuine MS — Oxford Falls
```

- Hashtags: `#MAIS #MississippiFootball #HighSchoolFootball #VarsityVoices #MAISFootball #FridayNightLights`

Same overall shape: header, intro naming the hosts, ON THIS EPISODE bullets,
optional studio line, THANKS TO OUR PARTNERS, FOLLOW THE NETWORK, closing line, hashtags.

Keep the first line under ~100 characters — it's what shows before "…more".

### ON THIS EPISODE length — both leagues

**Roughly 6–9 one-line bullets, and no more.** Garret, Sep 1 2026: "Descriptions
are too long. Need to severely shorten the 'in this episode' section."

- **No per-class scoreboard dumps.** Never write a `• 4A — ` / `• 3A — ` /
  `• 2A — ` / `• 8-Man — ` (or `• 7A — `…`• 1A — `) bullet that lists every score
  in the class. Name only the games that got real airtime — the game of the week,
  the upsets, the cross-league wins. The full slate lives on the dashboard.
- **No full Top Performers / Players to Watch roster.** A block of a dozen-plus
  names with stat lines is far too much. Give the Player of the Week with their
  line, plus at most one or two others if they carried a segment.
- **No filler bullets** — housekeeping like the MaxPreps stats plea doesn't earn
  a line.
- Lead each bullet with its label (`Game of the Week —`, `Play of the Week —`,
  `Player of the Week —`), then the shortest true statement of what happened.
  Scores stay; commentary and qualifiers go.

This governs the bullet section only — header, intro paragraph, partner block,
FOLLOW THE NETWORK, closing line and hashtags are unchanged. On a season preview,
where a per-class bullet genuinely is the content, keep one short line per class
and still drop the roster.

The partner list is always **one continuous line** with a spaced em dash (` — `)
between every partner. Do not wrap it onto multiple lines or group partners.

---

## Asset 3 — Thumbnail prompts (two crops, per format)

**Never name a logo in the prompt.** Image models render logos badly, so the
thumbnail is generated with the logo corners left as empty space and the SCRN
shield, Varsity Voices mark and C Spire logo are dropped in during
post-production. Garret's instruction, Sep 1 2026 — and **not** a placeholder,
box or outline either: the zones are genuinely blank.

Every prompt reserves three zones: **top-left**, **top-right**, and
**bottom-left just above the banner strip**.

**Which two crops you output depends on the format** (set by Garret, Sep 1 2026):

| Format | Crop 1 | Crop 2 |
|---|---|---|
| **Full episode** | **16:9 (1280x720)** — YouTube video thumbnail | **3:4 (1080x1440)** |
| **Short** | **9:16 (1080x1920)** — Reels / TikTok cover | **3:4 (1080x1440)** |

Note a full episode gets **no 9:16** and a Short gets **no 16:9**. 3:4 is on both.

**3:4 is portrait — taller than it is wide.** Garret corrected this on Sep 1 2026;
an earlier version of this table said `4:3 (1440x1080)` landscape, and every crop
generated from it was the wrong shape. If a prompt ever asks for 1440x1080 again,
this file has drifted back.

Both crops use the **same dial settings** so the pair reads as one piece of art
in two shapes. Pick the dials once, apply them to both, then state underneath
which ones you moved. Only the layout changes: horizontal puts the type on the
left and the players on the right; vertical stacks type over players and keeps
the platform safe zones clear; 3:4 stacks like the vertical crop but far less
extreme, so it gets more breathing room between headline and players and has no
platform safe zones to dodge.

**Vary it every time.** Consecutive thumbnails must not look identical. Change
**2–3 dials** per generation and never repeat the last episode's focal action. If
the user says what the previous one used, deliberately differ from it; otherwise
pick a fresh combination and state underneath which dials you used.

| Dial | Options |
|---|---|
| Focal action | QB mid-throw · RB breaking a tackle · WR leaping catch · defender mid-collision · O-line surge · player celebrating |
| Collage | 2, 3 or 4 supporting cut-outs; largest figure anchored right edge or right-centre (16:9) / centre-left (9:16) |
| Camera | low-angle hero · sideline telephoto compression · end-zone perspective · slight dutch tilt |
| Stadium | packed big-school crowd · single light bank, modest bleachers · light rain or mist · run-out tunnel smoke |
| Rim light | warm gold · cool blue · red-tinted haze |
| Accent prop | gold championship trophy · none (max one, never two) |
| Texture | torn paper edges · spray-paint scuff · heavy film grain · chalk dust in the light beams |
| Uniforms | plain solid, unmarked: white+navy · black+red · maroon+gold · green+white |

Tone guide: big classes (7A-5A, MAIS 4A) lean spectacle — packed crowd, trophy,
warm light. Small classes (4A-1A, 8-Man) lean grit — single light bank, collision,
cold light, no trophy.

**Never varies:** the three reserved logo zones (top-left, top-right, bottom-left
above the banner) left as empty negative space, white-over-red headline
typography, the league chip, the red bottom banner, the red-black-white palette,
and the generic-player block.

Headline: 2–4 words, white line stacked above a larger red line. Banner:
`[LEAGUE] 2026 SEASON PREVIEW · PART [N]`, or an episode-appropriate strip.
Use the same headline and banner text in both prompts.

Every prompt below opens with the same **reserved-zone paragraph**. Reproduce it
verbatim — it is the only thing keeping the logo corners clean:

> Leave the TOP-LEFT corner, the TOP-RIGHT corner, and the BOTTOM-LEFT area just above the bottom banner strip completely clear and uncluttered — each reserved as empty negative space roughly 15 percent of the frame height — so network and sponsor logos can be added in post-production. Do not draw, letter, outline or imply any logo, badge, shield, crest, microphone, wordmark, box, frame or placeholder of any kind in those three zones; they must be genuinely empty background. No headline text, player cut-out, stadium haze, texture overlay or other design element may extend into any of them — keep all three clean and unobstructed right to the edges.

### Prompt A — 16:9 (YouTube) · full episodes

```
A high-energy YouTube thumbnail in 16:9 widescreen (1280x720) format for a Mississippi high school football [SHOW TOPIC]. Leave the TOP-LEFT corner, the TOP-RIGHT corner, and the BOTTOM-LEFT area just above the bottom banner strip completely clear and uncluttered — each reserved as empty negative space roughly 15 percent of the frame height — so network and sponsor logos can be added in post-production. Do not draw, letter, outline or imply any logo, badge, shield, crest, microphone, wordmark, box, frame or placeholder of any kind in those three zones; they must be genuinely empty background. No headline text, player cut-out, stadium haze, texture overlay or other design element may extend into any of them — keep all three clean and unobstructed right to the edges. Bold, gritty stadium-style distressed typography dominates the left two-thirds of the frame, reading "[HEADLINE LINE 1]" in huge white all-caps font, stacked above "[HEADLINE LINE 2]" in even larger red distressed all-caps font with a rough, weathered spray-paint texture — oversized lettering that stays readable at small thumbnail size. Directly beneath the headline, a small red chip with white all-caps text reading "[MHSAA / MAIS]." Background is a dramatic night-time football stadium with bright stadium lights flaring, atmospheric haze, and [STADIUM DIAL] blurred into red-tinted bokeh. On the right third of the frame, a tight collage of [2-4] large dynamic action shots of generic high school football players in mid-play — [FOCAL ACTION DIAL] — each cut out with a bold white outline stroke and color-graded with punchy high-contrast editorial lighting, the largest figure dominating the right edge in the popular cut-out-with-glow YouTube style, shot [CAMERA DIAL] with [RIM LIGHT DIAL] rim lighting. [ACCENT PROP DIAL, or omit.] Along the bottom edge, a thin red banner strip with bold white distressed all-caps text reads "[BANNER TEXT]," positioned so it does not encroach on the reserved bottom-left zone. Overall style: high-contrast, gritty, red-black-white color palette, [TEXTURE DIAL] overlays, dramatic rim lighting on the players, editorial sports photography blended with poster-style typography, optimized for maximum click-through at small sizes. Important: all players must be entirely generic — no readable text of any kind on jerseys, helmets, or scoreboards, no school names or mascots, no brand logos (no Nike swoosh, no Riddell or other manufacturer marks), and no recognizable faces. Plain solid-color uniforms with no wordmark across the chest.
```

### Prompt B — 9:16 (Instagram / TikTok) · Shorts

```
A high-energy vertical social thumbnail in 9:16 vertical (1080x1920) format for a Mississippi high school football [SHOW TOPIC], sized for Instagram Reels and TikTok covers. Leave the TOP-LEFT corner, the TOP-RIGHT corner, and the BOTTOM-LEFT area just above the bottom banner strip completely clear and uncluttered — each reserved as empty negative space roughly 15 percent of the frame height — so network and sponsor logos can be added in post-production. Do not draw, letter, outline or imply any logo, badge, shield, crest, microphone, wordmark, box, frame or placeholder of any kind in those three zones; they must be genuinely empty background. No headline text, player cut-out, stadium haze, texture overlay or other design element may extend into any of them — keep all three clean and unobstructed right to the edges. Bold, gritty stadium-style distressed typography fills the upper third of the frame, reading "[HEADLINE LINE 1]" in huge white all-caps font, stacked above "[HEADLINE LINE 2]" in even larger red distressed all-caps font with a rough, weathered spray-paint texture — oversized lettering that stays readable at small thumbnail size. Directly beneath the headline, a small red chip with white all-caps text reading "[MHSAA / MAIS]." Background is a dramatic night-time football stadium with bright stadium lights flaring, atmospheric haze, and [STADIUM DIAL] blurred into red-tinted bokeh. Filling the middle of the frame below the headline, a tight vertical collage of [2-4] large dynamic action shots of generic high school football players in mid-play — [FOCAL ACTION DIAL] — each cut out with a bold white outline stroke and color-graded with punchy high-contrast editorial lighting, the largest figure anchored centre-left and running tall through the frame in the popular cut-out-with-glow style, shot [CAMERA DIAL] with [RIM LIGHT DIAL] rim lighting. [ACCENT PROP DIAL, or omit.] Above the bottom edge, a thin red banner strip with bold white distressed all-caps text reads "[BANNER TEXT]," positioned so it does not encroach on the reserved bottom-left zone. Keep the bottom 15 percent and the right 12 percent of the frame clear of important content so the vertical player controls, caption and action buttons do not cover the headline, the banner or the focal player's face. Overall style: high-contrast, gritty, red-black-white color palette, [TEXTURE DIAL] overlays, dramatic rim lighting on the players, editorial sports photography blended with poster-style typography, optimized for maximum click-through at small sizes. Important: all players must be entirely generic — no readable text of any kind on jerseys, helmets, or scoreboards, no school names or mascots, no brand logos (no Nike swoosh, no Riddell or other manufacturer marks), and no recognizable faces. Plain solid-color uniforms with no wordmark across the chest.
```

### Prompt C — 3:4 portrait · both formats

```
A high-energy thumbnail in 3:4 portrait (1080x1440) format — taller than it is wide — for a Mississippi high school football [SHOW TOPIC]. Leave the TOP-LEFT corner, the TOP-RIGHT corner, and the BOTTOM-LEFT area just above the bottom banner strip completely clear and uncluttered — each reserved as empty negative space roughly 15 percent of the frame height — so network and sponsor logos can be added in post-production. Do not draw, letter, outline or imply any logo, badge, shield, crest, microphone, wordmark, box, frame or placeholder of any kind in those three zones; they must be genuinely empty background. No headline text, player cut-out, stadium haze, texture overlay or other design element may extend into any of them — keep all three clean and unobstructed right to the edges. Bold, gritty stadium-style distressed typography spans the upper portion of the frame, below the reserved top corners, reading "[HEADLINE LINE 1]" in huge white all-caps font, stacked above "[HEADLINE LINE 2]" in even larger red distressed all-caps font with a rough, weathered spray-paint texture — oversized lettering that stays readable at small sizes. Directly beneath the headline, a small red chip with white all-caps text reading "[MHSAA / MAIS]." Background is a dramatic night-time football stadium with bright stadium lights flaring, atmospheric haze, and [STADIUM DIAL] blurred into red-tinted bokeh. Filling the lower two-thirds of the frame beneath the headline, a tight collage of [2-4] large dynamic action shots of generic high school football players in mid-play — [FOCAL ACTION DIAL] — each cut out with a bold white outline stroke and color-graded with punchy high-contrast editorial lighting, the largest figure anchored centre to centre-right and running tall from mid-frame down to the banner in the popular cut-out-with-glow style, shot [CAMERA DIAL] with [RIM LIGHT DIAL] rim lighting. [ACCENT PROP DIAL, or omit.] Along the bottom edge, a thin red banner strip with bold white distressed all-caps text reads "[BANNER TEXT]," positioned so it does not encroach on the reserved bottom-left zone. Because 3:4 is portrait but much less extreme than a 9:16 vertical, stack the headline above the players rather than setting them side by side, but leave generous breathing room between the two — do not crowd them together and do not compose this as a cropped-down 16:9. Let the type wrap onto more lines rather than shrinking. Overall style: high-contrast, gritty, red-black-white color palette, [TEXTURE DIAL] overlays, dramatic rim lighting on the players, editorial sports photography blended with poster-style typography, optimized for maximum click-through at small sizes. Important: all players must be entirely generic — no readable text of any kind on jerseys, helmets, or scoreboards, no school names or mascots, no brand logos (no Nike swoosh, no Riddell or other manufacturer marks), and no recognizable faces. Plain solid-color uniforms with no wordmark across the chest.
```

---

## Asset 4 — Tags

Hard limit **500 characters including punctuation**. Comma-separated, **no spaces
after commas**. Count the final string and state the number.

Base list — every video, unchanged (450 chars, 28 tags):

```
SCRN,SCRN live,SCRN podcast,sports podcast,high school sports,varsity sports,sports talk,sports commentary,college recruiting,sports recruiting,high school football,sports highlights,game analysis,hot takes,sports predictions,coach interview,player spotlight,high school,athletics,sports news,recruiting news,mississippi,mississippi sports,West Point football,football coaching strategy,football offensive schemes,college football,friday night lights
```

That leaves **50 characters** — about 1–2 episode tags, each costing its length
plus one for the comma. Spend it on what the base doesn't already cover;
`mississippi high school football` (33) is usually the best single addition,
and it leaves only 16 characters behind it, so the second tag has to be short.

Candidates: `mhsaa` (6) · `mhsaa football` (15) · `MAIS football` (14) ·
`football season preview` (24) · `high school football 2026` (26) ·
`football highlights 2026` (25) · `game of the week` (17) · `8 man football` (15) ·
`small school football` (22) · `high school football playoffs` (30)

Worked example — MHSAA season preview, **498 chars**: base +
`,mississippi high school football,mhsaa football`

`mississippi high school football` + `football season preview` does **not** fit
(513). Check the count before assuming a pair works.

---

## Hard rules

1. Never invent hosts, players, stats, or partners. Bracket and ask instead.
2. MHSAA and MAIS are different shows with different panels. Confirm the league first.
3. Confirm full episode vs Short before writing the title — the two formats do not
   mix. Full episodes lead with `Varsity Voices |`; Shorts lead with the hook and
   end with `| Varsity Voices`. A Short never carries an S2 E## at all.
4. The MHSAA block from the studio line down is fixed — verbatim, no rewording.
5. The partner block is the same full network list on **both** leagues, every episode and
   every Short. Never trim it to the deck, never reorder it, never drop a partner.
6. Verify counts, champions and stat lines against the repo data when it's available.
7. Use **that league's own** week number, not the dashboard's overall count. MAIS and
   MHSAA are offset by one — in 2026, an Aug 28 MHSAA video is Week 1 while an Aug 28
   MAIS video is Week 2. Episode numbers are per-league too, but both leagues sit on
   **Season 2**, trailing the title behind an em dash as `— S2 E##`. Never append a
   part number unless the user says the episode is split. **Player of the Week and
   Team of the Week episodes get no season/episode code at all** and don't consume a
   number — Garret, Sep 1 2026.
8. Tags must be under 500 characters — always count and report it.
9. Vary the thumbnail every generation; say which dials you moved. Never name or describe
   a logo in a prompt — the top-left, top-right and bottom-left zones are left as empty
   space and the logos go on in post. No placeholders in those zones either.
10. Output all four assets in copy-paste blocks, in order, every time. Asset 3 is
    always two prompts sharing one set of dial settings — **16:9 + 3:4 for a full
    episode, 9:16 + 3:4 for a Short**. A full episode gets no 9:16; a Short gets no 16:9.
    **3:4 is portrait (1080x1440), not 4:3 landscape** — Garret, Sep 1 2026.
11. Expect **league, format and publish date** on every invocation; derive the week
    from the publish date and don't re-ask for those three.
