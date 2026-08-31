---
name: varsity-voices-episode-assets
description: Generates the four YouTube publishing assets for a Varsity Voices episode — Title, Description, Thumbnail image prompts (16:9 and 9:16, SCRN + Varsity Voices + C Spire logos), and Tags — each in its own copy-paste block. Use when asked for a YouTube title, description, thumbnail prompt, or tags for a Varsity Voices / State Championships Radio Network episode (MHSAA or MAIS, season previews, weekly recaps, or Shorts).
---

# Varsity Voices — Episode Publishing Assets

Produces four assets for one episode. Always output **all four**, in this order,
each in its own fenced code block so it can be copied straight into YouTube.
Asset 3 is two blocks — a 16:9 prompt and a 9:16 prompt — not one:

1. **Title**
2. **Description**
3. **Thumbnail prompts** (two: 16:9 and 9:16)
4. **Tags** (with the character count stated)

Keep commentary between blocks to a couple of lines. The blocks are the deliverable.

---

## Step 1 — Collect inputs

You need these. If any are missing, **ask before generating** — never invent them:

| Input | Notes |
|---|---|
| Format | **Full episode or Short** — changes the title format (Asset 1) |
| League | MHSAA or MAIS — changes hosts, partners, hashtags |
| Episode title | e.g. "MHSAA 2026 Season Preview — 4A, 3A, 2A & 1A" |
| Season/episode/part | e.g. S2 E02 - Part 2. Show is in **Season 2 (2026)** |
| Classes covered | e.g. 4A, 3A, 2A, 1A |
| Segments | The per-class bullets, storylines |
| Players to Watch | Name, position, class, school, stat line |
| Week | The **league's own** week number, not the overall count — see Week numbering below |

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

**MAIS and MHSAA are not on the same week count** — MAIS opens **two weeks
earlier**. Use the week number for **that video's league**, not the dashboard's
overall count.

2026 anchors:

| Date | Overall week | MAIS | MHSAA |
|---|---|---|---|
| Aug 14 | Week 1 | Week 1 | — |
| Aug 21 | Week 2 | Week 2 | — |
| Aug 28 | Week 3 | Week 3 | Week 1 |

So an Aug 28 MHSAA video is labeled **Week 1** and an Aug 28 MAIS video is labeled
**Week 3** — same Friday, different label, and that is correct. MAIS's own count
happens to match the overall count because MAIS goes first; MHSAA's runs two behind.

The overall number is a dashboard-internal convention. It does not go on a video.
Each Friday slate advances every count by one.

---

## Asset 1 — Title

Two formats. **Full episodes** use the branded header format; **Shorts** use the
hook-first format. Decide which one applies before writing anything else — if the
user hasn't said, ask.

### Full episodes

The title is the description's header line, verbatim.

```
Varsity Voices | [EPISODE TITLE] (S2 E## - Part N)
```

Em dash before the class list; spaced hyphen inside the parentheses.
Example: `Varsity Voices | MHSAA 2026 Season Preview — 4A, 3A, 2A & 1A (S2 E02 - Part 2)`

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
Varsity Voices | [EPISODE TITLE] (S2 E## - Part N)

The State Championships Radio Network presents Varsity Voices — your home for Mississippi high school football. Host Breck Riley and Co-Hosts Jared Shotts, Brandon Davis, and Jake Wimberly [WHAT THIS EPISODE COVERS — classes, school/region counts, a hook stat].

ON THIS EPISODE
• [CLASS PREVIEW — N schools across N regions. Defending champion + title-game result.]
• [repeat per class]
• Players to Watch —
  [NAME]  [POS] · [CLASS] · [SCHOOL] · [STAT LINE]
• [RECURRING SEGMENT — e.g., 2026 All-State Teams]

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

The partner list is always **one continuous line** with a spaced em dash (` — `)
between every partner. Do not wrap it onto multiple lines or group partners.

---

## Asset 3 — Thumbnail prompts (16:9 and 9:16)

Every thumbnail carries **three logos**: the SCRN shield top-left, the Varsity Voices mark
top-right, and **C Spire bottom-left above the banner**, under a small "PRESENTED BY" label.
Attach all three files when generating. C Spire is the presenting sponsor and appears on every
thumbnail regardless of episode.

Output **two prompts every time**, in this order:

1. **16:9 (1280x720)** — the YouTube video thumbnail.
2. **9:16 (1080x1920)** — the Instagram Reels / TikTok cover.

Both use the **same dial settings** so the pair reads as one piece of art in two
crops. Pick the dials once, apply them to both, then state underneath which ones
you moved. Only the layout changes between the two: horizontal puts the type on
the left and the players on the right; vertical stacks type over players and
keeps the platform safe zones clear.

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

**Never varies:** the three logos (SCRN top-left, Varsity Voices top-right,
C Spire bottom-left above the banner under a "PRESENTED BY" label), their original aspect ratios
(scaled proportionally, matched by height only, never stretched to fill a box),
white-over-red headline
typography, the league chip, the red bottom banner, the red-black-white palette,
and the generic-player block.

Headline: 2–4 words, white line stacked above a larger red line. Banner:
`[LEAGUE] 2026 SEASON PREVIEW · PART [N]`, or an episode-appropriate strip.
Use the same headline and banner text in both prompts.

### Prompt A — 16:9 (YouTube)

```
A high-energy YouTube thumbnail in 16:9 widescreen (1280x720) format for a Mississippi high school football [SHOW TOPIC]. Use the three attached logo files exactly as provided — do not redraw, restyle, recolor, crop, rotate, stretch, squash, distort, change the aspect ratio of, add text to, or apply any texture, grain, haze, or lighting effect to any of them. Place the attached "State Championships Radio Network" shield logo (the black shield crest containing the Mississippi state outline and a radio tower) in the TOP-LEFT corner, and the attached square "Varsity Voices — Mississippi High School Football" logo (the chrome microphone over a football with the navy banner) in the TOP-RIGHT corner. Reproduce each logo at its original aspect ratio exactly: scale it proportionally, width and height together, and never stretch, squash, skew or otherwise alter its native width-to-height ratio. Match the two to each other by HEIGHT ONLY — roughly 12 to 15 percent of the frame height — and let each logo's width fall wherever its own proportions put it, so the tall portrait shield stays narrow and the square logo stays square. Give them equal margins from the top and side edges so the two read as visually balanced despite their different shapes. Additionally, place the attached C Spire logo (the cyan starburst above the lowercase "c spire" wordmark) in the BOTTOM-LEFT area, sitting just above the red banner strip, with a small white all-caps label reading "PRESENTED BY" directly above it. Scale the C Spire logo to roughly 10 percent of the frame height, proportionally and at its original aspect ratio, and keep its cyan exactly as supplied — do not tint, desaturate or shift it toward the red palette. All three logos must stay fully visible and unobstructed: no player cut-out, headline text, stadium haze, or texture overlay may cross any of them, and their original colors are preserved, including the Varsity Voices navy and gold and the C Spire cyan, which are not recolored to match the thumbnail palette. Bold, gritty stadium-style distressed typography dominates the left two-thirds of the frame, reading "[HEADLINE LINE 1]" in huge white all-caps font, stacked above "[HEADLINE LINE 2]" in even larger red distressed all-caps font with a rough, weathered spray-paint texture — oversized lettering that stays readable at small thumbnail size. Directly beneath the headline, a small red chip with white all-caps text reading "[MHSAA / MAIS]." Background is a dramatic night-time football stadium with bright stadium lights flaring, atmospheric haze, and [STADIUM DIAL] blurred into red-tinted bokeh. On the right third of the frame, a tight collage of [2-4] large dynamic action shots of generic high school football players in mid-play — [FOCAL ACTION DIAL] — each cut out with a bold white outline stroke and color-graded with punchy high-contrast editorial lighting, the largest figure dominating the right edge in the popular cut-out-with-glow YouTube style, shot [CAMERA DIAL] with [RIM LIGHT DIAL] rim lighting. [ACCENT PROP DIAL, or omit.] Along the bottom edge, a thin red banner strip with bold white distressed all-caps text reads "[BANNER TEXT]." Overall style: high-contrast, gritty, red-black-white color palette, [TEXTURE DIAL] overlays, dramatic rim lighting on the players, editorial sports photography blended with poster-style typography, optimized for maximum click-through at small sizes. Important: all players must be entirely generic — no readable text of any kind on jerseys, helmets, or scoreboards, no school names or mascots, no brand logos (no Nike swoosh, no Riddell or other manufacturer marks), and no recognizable faces. Plain solid-color uniforms with no wordmark across the chest.
```

### Prompt B — 9:16 (Instagram / TikTok)

```
A high-energy vertical social thumbnail in 9:16 vertical (1080x1920) format for a Mississippi high school football [SHOW TOPIC], sized for Instagram Reels and TikTok covers. Use the three attached logo files exactly as provided — do not redraw, restyle, recolor, crop, rotate, stretch, squash, distort, change the aspect ratio of, add text to, or apply any texture, grain, haze, or lighting effect to any of them. Place the attached "State Championships Radio Network" shield logo (the black shield crest containing the Mississippi state outline and a radio tower) in the TOP-LEFT corner, and the attached square "Varsity Voices — Mississippi High School Football" logo (the chrome microphone over a football with the navy banner) in the TOP-RIGHT corner, the two sitting side by side across the very top of the frame. Reproduce each logo at its original aspect ratio exactly: scale it proportionally, width and height together, and never stretch, squash, skew or otherwise alter its native width-to-height ratio. Match the two to each other by HEIGHT ONLY — roughly 12 to 15 percent of the frame height — and let each logo's width fall wherever its own proportions put it, so the tall portrait shield stays narrow and the square logo stays square. Give them equal margins from the top and side edges so the two read as visually balanced despite their different shapes. Additionally, place the attached C Spire logo (the cyan starburst above the lowercase "c spire" wordmark) in the BOTTOM-LEFT area, sitting just above the red banner strip, with a small white all-caps label reading "PRESENTED BY" directly above it. Scale the C Spire logo to roughly 10 percent of the frame height, proportionally and at its original aspect ratio, and keep its cyan exactly as supplied — do not tint, desaturate or shift it toward the red palette. All three logos must stay fully visible and unobstructed: no player cut-out, headline text, stadium haze, or texture overlay may cross any of them, and their original colors are preserved, including the Varsity Voices navy and gold and the C Spire cyan, which are not recolored to match the thumbnail palette. Bold, gritty stadium-style distressed typography fills the upper third of the frame, reading "[HEADLINE LINE 1]" in huge white all-caps font, stacked above "[HEADLINE LINE 2]" in even larger red distressed all-caps font with a rough, weathered spray-paint texture — oversized lettering that stays readable at small thumbnail size. Directly beneath the headline, a small red chip with white all-caps text reading "[MHSAA / MAIS]." Background is a dramatic night-time football stadium with bright stadium lights flaring, atmospheric haze, and [STADIUM DIAL] blurred into red-tinted bokeh. Filling the middle of the frame below the headline, a tight vertical collage of [2-4] large dynamic action shots of generic high school football players in mid-play — [FOCAL ACTION DIAL] — each cut out with a bold white outline stroke and color-graded with punchy high-contrast editorial lighting, the largest figure anchored centre-left and running tall through the frame in the popular cut-out-with-glow style, shot [CAMERA DIAL] with [RIM LIGHT DIAL] rim lighting. [ACCENT PROP DIAL, or omit.] Above the bottom edge, a thin red banner strip with bold white distressed all-caps text reads "[BANNER TEXT]." Keep the bottom 15 percent and the right 12 percent of the frame clear of important content so the vertical player controls, caption and action buttons do not cover the headline, the banner or the focal player's face. Overall style: high-contrast, gritty, red-black-white color palette, [TEXTURE DIAL] overlays, dramatic rim lighting on the players, editorial sports photography blended with poster-style typography, optimized for maximum click-through at small sizes. Important: all players must be entirely generic — no readable text of any kind on jerseys, helmets, or scoreboards, no school names or mascots, no brand logos (no Nike swoosh, no Riddell or other manufacturer marks), and no recognizable faces. Plain solid-color uniforms with no wordmark across the chest.
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
   end with `| Varsity Voices`. A Short never carries an S2 E## - Part N.
4. The MHSAA block from the studio line down is fixed — verbatim, no rewording.
5. The partner block is the same full network list on **both** leagues, every episode and
   every Short. Never trim it to the deck, never reorder it, never drop a partner.
6. Verify counts, champions and stat lines against the repo data when it's available.
7. Use **that league's own** week number, not the dashboard's overall count. MAIS and
   MHSAA are offset by two — in 2026, an Aug 28 MHSAA video is Week 1 while an Aug 28
   MAIS video is Week 3.
8. Tags must be under 500 characters — always count and report it.
9. Vary the thumbnail every generation; say which dials you moved. The three logos and their
   positions never vary — C Spire is the presenting sponsor and appears on every thumbnail.
10. Output all four assets in copy-paste blocks, in order, every time. Asset 3 is
    always two prompts, 16:9 and 9:16, sharing one set of dial settings.
