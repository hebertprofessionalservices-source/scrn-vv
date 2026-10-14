---
name: varsity-voices-episode-assets
description: Generates the four YouTube publishing assets for a Varsity Voices episode — Title, Description, Thumbnail image prompts (full episode: 16:9 generation + 3:4 conversion prompt; Short: a single standalone 9:16 generation prompt, no 3:4 — torn-poster style with placeholder logo "wells" and real-team matchup blocks; single-subject nameplate carve-out for Player/Team of the Week), and Tags — each in its own copy-paste block. Use when asked for a YouTube title, description, thumbnail prompt, or tags for a Varsity Voices / State Championships Radio Network episode (MHSAA or MAIS, season previews, weekly recaps, Player/Team of the Week, or Shorts).
---

# Varsity Voices — Episode Publishing Assets

Produces four assets for one episode. Always output **all four**, in this order,
each in its own fenced code block so it can be copied straight into YouTube.
Asset 3's block count depends on format, per Garret's rule set 2026-09-11
(revised same day): a **full episode gets two blocks** — a 16:9 generation
prompt and a 3:4 conversion prompt run against the finished 16:9. A **Short
gets exactly one block** — a standalone 9:16 generation prompt. Shorts get
**no 3:4 at all** and never get a conversion step:

1. **Title**
2. **Description**
3. **Thumbnail prompt(s)** — two for a full episode, one for a Short (see Asset 3)
4. **Tags** (with the character count stated)

Keep commentary between blocks to a couple of lines. The blocks are the deliverable.

---

## Step 0 — Read memory FIRST, before anything else

**Before collecting inputs, reading a transcript, or writing a single asset,
read Garret's memory directory:**
`C:\Users\garre\.claude\projects\C--Users-garre-OneDrive-Desktop-Claude-Code-varsity-voices-dashboard\memory\`

Read `MEMORY.md` (the index), then open **every** memory file whose one-line
hook touches this skill — episode/asset formatting, thumbnails, tags, week or
episode numbering, POTW/TOTW, descriptions, partners, file-saving, or
communication style. When in doubt, open it; a missed rule costs a regenerated
package, an unread file costs seconds.

**Why this step exists** (Garret, Sep 22 2026): *"Update the skill to read
memory when I call on the assets skill. I know it's supposed to, but many
times it doesn't do stuff I've saved previously."* Rules he has already set
have repeatedly been violated on later runs — the POTW gate, the tags
exclusions, the logo-list placement — because the run started from this file
alone. **This file is not the whole rule set.** Memory carries corrections
that post-date it, and memory wins on any conflict.

Do not announce that you're doing this. Read, then work.

### Output style while working

Garret does **not** want a play-by-play. No narration between tool calls, no
"checking X now", no explaining what you found along the way, no closing
summary of what you did. Produce the four blocks and stop. Speak up only for
something genuinely critical — a wrong stat about to go on air, a factual
error in already-published copy, a destructive action. See
[[communication-style]].

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
- **MHSAA episode numbering (supersedes the plain sequential count above for
  MHSAA): the episode number is the week number being covered, with a
  dash-suffix marking which of that week's two episodes it is — `-1` for
  Preview, `-2` for Recap.** Garret's rule, Sep 10 2026 ("I want to label the
  MHSAA episodes the same as the week they are covering... do this unless
  otherwise specified"). So MHSAA Week 3 Preview is `S2 E03-1` and MHSAA Week
  3 Recap is `S2 E03-2`. This is MHSAA-only; MAIS keeps its own count (below).
  Confirmed anchor: Week 2 Recap (aired Sun Sep 7 2026) was published before
  this rule existed and stands as plain `S2 E02` — don't retroactively relabel
  already-published episodes.
- **MAIS numbers a combined Recap/Preview episode by the later (Preview) week,
  not the week it recaps.** A MAIS episode combines "Week N Recap / Week N+1
  Preview" and airs during MAIS Week N+1, so its number is `E0(N+1)`. Example:
  `Varsity Voices | MAIS 2026 Week 3 Recap / Week 4 Preview — MRA vs. Hartfield — S2 E04`.
  Self-check: the episode number must match the later (Preview) week named in
  the title. MHSAA runs Recap and Preview as two *separate* weekly episodes
  (Recap Sunday, Preview Tuesday) instead of one combined show, which is why it
  needs the `-1`/`-2` suffix above rather than this MAIS pattern.

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
Listen to the Varsity Voices podcast on Spotify: https://open.spotify.com/show/2CeFipDI38NrwLhkhCX1jL?si=0787fe8af3334aed

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
optional studio line, THANKS TO OUR PARTNERS, FOLLOW THE NETWORK (with the Spotify podcast line), closing line, hashtags.

Keep the first line under ~100 characters — it's what shows before "…more".

### Podcast link — every description, every format

**Every description carries the Spotify podcast link.** Garret's rule, Oct 1 2026
("Add our podcast link to every description"). It is a new rule: previously
published descriptions are not regenerated.

- Put this exact line directly under the `@STATECHAMPRADIO on YouTube, Instagram,
  TikTok, Facebook & Twitter` line in the FOLLOW THE NETWORK block, with the
  `New episodes every week.` line staying below it:

```
Listen to the Varsity Voices podcast on Spotify: https://open.spotify.com/show/2CeFipDI38NrwLhkhCX1jL?si=0787fe8af3334aed
```

- Use the URL **exactly as given, `?si=` tracking parameter included** — never
  shorten, clean up, or swap it.
- It applies to **both leagues and every format**: full episodes, Shorts,
  segments, Team of the Week / Player of the Week, and non-football videos (the
  Hinds soccer video included).
- It is separate from the **video's own YouTube link**, which still goes on its
  own line between the header line and the intro paragraph.
- When a description is revised and reprinted, the full block still carries it.

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

## Asset 3 — Thumbnail prompts (block count depends on format)

**What you output** (set by Garret, confirmed Sep 1 2026, revised twice on
Sep 11 2026 — see history below):

| Format | Output |
|---|---|
| **Full episode** | Two blocks: **16:9 (1280x720)** generation prompt — YouTube video thumbnail — plus a **3:4 (1080x1440) conversion prompt** run against the finished, logo-composited 16:9 image |
| **Short** | **One block only: a standalone 9:16 (1080x1920) generation prompt.** No 3:4, no conversion step — 9:16 is generated directly, the same way the 16:9 is for a full episode |

**Current rule (Garret, Sep 11 2026, second revision same day): Shorts get a
single standalone 9:16 prompt, full stop — no 3:4 for Shorts at all.** This
reverses an earlier same-day change that had briefly moved Shorts to
3:4-only; that change is dead. Full episodes were never touched by either
revision and stay on 16:9 generation + 3:4 conversion throughout.

3:4 is **portrait** — taller than wide (1080x1440), never `4:3` landscape
(`1440x1080`). Garret corrected this directly on Sep 1 2026; if a crop ever
comes back `1440x1080`, this file has drifted. It now applies to **full
episodes only** — never generate a 3:4 anything for a Short.

**For a full episode, the 3:4 block is not a second from-scratch prompt.**
Garret's production workflow, set Sep 8 2026: generate the 16:9 → composite
the real logo files into it externally → feed that *finished,
logo-composited* image back into the generator as an image-to-image edit with
a short conversion prompt. See Prompt C below; it must call out that every
logo circle stays a perfect 1:1 circle, scaled uniformly — an early attempt
without that explicit callout squished the circles into ovals when everything
else was reflowed for the taller frame. **A Short never goes through this
conversion step** — a Short's 9:16 prompt is a full standalone description,
written the same way the 16:9 prompt is for a full episode (composition,
wells, matchup blocks or POTW carve-out, dials, all spelled out fresh), and
that single prompt is the entire thumbnail job for a Short.

### Logo handling — placeholder "wells," never rendered artwork

Image generators render supplied logo files badly (flattened, squashed,
white-backgrounded), so **every logo is described as an empty placeholder
well, never as an attached file to reproduce.** Current instruction, set
Sep 8 2026 and refined Sep 9 2026 (this reversed an even earlier "leave truly
blank negative space" rule — that one is dead too):

- Each logo gets its own **clean circular well**: filled with a solid dark
  charcoal/near-black tone matching the poster's night-stadium shadow values —
  **explicitly say "not white, not transparent"** (white is the model's
  default fill for an empty circle and reads as an unfinished stamp against
  the red-black-white palette) — with a thin red rim-light ring at the edge,
  so it reads as a sunken "logo well" built into the poster.
- Size every well modestly **smaller** than its final reserved space so the
  real PNG composited in later drops in cleanly without overflow.
- Standing wells, every thumbnail: **SCRN** (top-left corner), **Varsity
  Voices** (top-right corner), **C Spire** (bottom-left, just above the
  banner, with a small white all-caps "PRESENTED BY" label centered directly
  above it, not offset).
- **The league mark (MHSAA/MAIS) is NOT a logo well.** Garret's correction,
  2026-09-11: render it as an actual small red chip/badge with bold white
  all-caps text reading "MHSAA" or "MAIS" directly in the image — real
  rendered text, not a placeholder circle for a logo file. This is the one
  exception to "every logo is a well": there is no MHSAA/MAIS logo file being
  composited in later, so there is nothing to reserve space for.
- Team logo wells (matchup blocks, or the single POTW/TOTW well) use the same
  dark-charcoal/red-rim treatment.
- **No well carries a text label, caption, or name rendered next to it —
  except C Spire, which alone gets "PRESENTED BY" centered above it.** Garret
  caught this on 2026-09-11: naming each well in the prompt's own bullet list
  ("SCRN well," "Varsity Voices well," "MHSAA league mark well," "Pass
  Christian Pirates well") got read by the image model as caption text and
  rendered literally next to the circles — "SCRN," "Varsity Voices," "MHSAA
  league mark," "PASS CHRISTIAN PIRATES" all showed up as tiny text on the
  poster. The prompt must say explicitly: *do not write any text, caption,
  initials, or name on or beside any well except the C Spire "PRESENTED BY"
  label — every other well is a bare, unlabeled circle, identified only by
  its position in the frame for whoever composites the real logo in later.*
  Say this once, plainly, near the well list — don't rely on the list's own
  wording to keep the labels out of the rendered image.
- **Always list every logo the prompt needs as a bulleted "LOGOS NEEDED FOR
  THIS PROMPT" line directly under the prompt itself** — not in a separate
  notes file. SCRN, Varsity Voices, and C Spire plus every team logo the
  prompt calls for, so the full upload list is visible at a glance. **The
  league mark is never in this list** — it's rendered text, not a composited
  file. POTW/TOTW prompts name exactly **one** team logo; full episodes/Shorts
  name every team in every matchup block (2-4 total, see below). This list is
  documentation for the person compositing logos afterward — it is separate
  from the prompt text itself and must never be copied into the
  image-generation prompt as visible on-poster text.

### Composition — torn-poster, not a player-photo collage

The current recipe generates **background, bold gritty typography, and
card/frame compositions only** — it does not describe generic player
action-shot photography at all. (That whole approach, and the old
Focal-action/Collage/Camera/Uniforms dial rows from an earlier version of this
file, is retired as of Sep 8 2026.) Every prompt should read like a
torn-newspaper / poster cutout: layered card shapes, white/red torn-paper
stripe edges, high energy — not a flat, clean, minimal layout.

- **Typography:** big, heavy, impact-style all-caps, gritty/distressed (rough
  spray-paint or torn edges, strong outline or drop shadow) — not clean/flat
  lettering. Headline: 2-4 words, white line stacked above a larger, even
  bigger red line. Judge scale as if viewed at ~250px wide, not full-size —
  Garret's first-draft rejection of this style was "too small and too clean"
  at actual thumbnail scale.
- **Banner:** always name the league (MHSAA/MAIS), the week number (or date,
  per Week numbering above, when the week isn't settled), and "Recap" /
  "Preview" / the special's name as applicable — e.g. `MHSAA WEEK 2 · RECAP`
  or `MHSAA WEEK 2 · PLAYER OF THE WEEK`.
- **Explicitly exclude:** a section label in a corner, publish date or kickoff
  time (unless Garret asks for it), ad-style tagline copy ("your home for
  Mississippi high school football," "watch · listen · follow," etc.), and any
  social-platform icon row. Website (`scrn.live/varsity-voices`) only appears
  if Garret explicitly wants a URL on that thumbnail.
- **No periods anywhere in the rendered image.** Every image prompt must carry
  an explicit instruction that no text in the image ends with or contains a
  period — not the headline, not the nameplate, not the score card, not the
  banner, not the league chip. Garret's correction, 2026-09-23, on a Petal /
  Gulfport Short whose score card generated as `40-39.` — the model keeps
  tacking on a trailing period and it reads as a typo at thumbnail scale.
  Write the instruction as its own sentence near the exclusion line, e.g.:
  *"No periods anywhere in the image: none of the rendered text — headline,
  nameplate, cards, score, league chip, or banner — ends with or contains a
  period or full stop."* Abbreviations that need a period in real life
  (`ST. STANISLAUS`, `MT. OLIVE`) are the one exception — set those in the
  prompt as the school's name spelled out or without the period (`SAINT
  STANISLAUS` / `ST STANISLAUS`) so the blanket rule stays unambiguous.
  This also means: **never end a card's text with a period in the prompt
  itself.** If the prompt says `reading "40-39."` the model reproduces the
  period — close the quote before the punctuation, `reading "40-39"`.
- **Fill the frame — no large dead zones.** Garret's correction, 2026-09-11,
  comparing a finished reference poster (frame filled edge-to-edge with
  layered cards) against a fresh POTW generation that had a big empty
  stadium-background gap between the nameplate and the bottom section:
  "there's a lot of blank space" — but he does **not** want it cluttered
  either, so don't solve this by piling on new design elements. For non-POTW
  prompts the 2-4 matchup cards plus headline usually fill the frame on their
  own. For POTW/TOTW, which otherwise only has a headline + nameplate + one
  small team well, add the single stat-highlight card described in the
  POTW/TOTW section below to close the gap — that's the one addition, not a
  license to add more cards, icons, or text blocks. As a rough guide, no more
  than ~15-20 percent of the frame should read as plain, uninterrupted
  background.
- **Vary 2-3 dials per generation**, never repeat the last episode's exact
  combination:

| Dial | Options |
|---|---|
| Stadium backdrop | packed big-school crowd · single light bank, modest bleachers · light rain or mist · run-out tunnel smoke |
| Rim light / haze tint | warm gold · cool blue · red-tinted haze |
| Accent prop | gold championship trophy graphic · none (max one, never two) |
| Texture | torn paper edges · spray-paint scuff · heavy film grain · chalk dust in the light beams |
| Matchup card tilt (non-POTW) | slight clockwise dynamic tilt · slight counter-clockwise tilt · flat |

Tone guide: big classes (7A-5A, MAIS 4A) lean spectacle — packed crowd, trophy,
warm light. Small classes (4A-1A, 8-Man) lean grit — single light bank, cold
light, no trophy.

**Never varies:** the logo-well treatment and standing well positions,
white-over-red headline typography, the league chip, the red bottom banner,
the red-black-white palette.

### Full episodes and Shorts — real-team matchup blocks

Include **2-4 real-team rivalry/matchup blocks** (helmet-vs-helmet or
logo-vs-logo) picked from the episode's actual big games — **never invented
matchups**. If the transcript/deck surfaces more than 4 candidate games,
**stop and ask Garret which 3-4 to feature** — don't pick unilaterally. Each
block is large and full of flair: jagged/torn card edges, a bold diagonal
"VS" chevron, drop shadow, slight dynamic tilt — ESPN/Bleacher Report-style
comparison graphics, not a spreadsheet row. This is the standing style for the
foreseeable future, on **all** thumbnails, episodes and Shorts alike —
Garret's instruction, Sep 8 2026.

### Player of the Week / Team of the Week — single-subject carve-out

**POTW/TOTW thumbnails are a deliberate exception to the matchup-block style
above** — Garret's rule, Sep 10 2026, given right after a Player of the Week
package shipped with a two-team matchup card and got flagged.

**Gate — only use this style when Garret explicitly says "Player of the Week"
or "Team of the Week" in the invocation.** Garret's rule, Sep 22 2026: "Paris
Trivillion is not the player of the week. We did the player of the week
already... I will explicitly mention Player of the Week." A clip that happens
to feature someone who *was* a POTW/TOTW in some earlier week does **not**
inherit the framing — each award is claimed by exactly one package, and a
re-cut, flashback, or follow-up clip about that same player is just a
highlight Short. Never infer POTW/TOTW from the subject being a past winner,
from the source footage being the same interview, or from the stat line
looking award-worthy. When it isn't stated, use the single-subject highlight
recipe below instead.

**Single-subject clips that are NOT POTW/TOTW** — one player or team, no
award framing:

- Keep the single-subject layout (one team logo well, no "VS" card, a
  nameplate card identifying the subject) — the matchup-block style still
  doesn't fit a one-player clip.
- **Headline is the stat hook itself**, not an award name: `"516 YARDS"`
  white over `"6 TDS"` red, pulled from the same number driving the title.
- **Second card carries context, not a repeat of the headline** — the final
  score, the opponent, the record (e.g. `"55-19 WIN OVER PURVIS"`). It still
  fills the lower-frame gap the same way the stat card does on a POTW.
- **Banner names the week and what the clip actually is** —
  `MHSAA WEEK 2 · FLASHBACK`, `MHSAA WEEK 4 · HIGHLIGHT` — never
  "Player of the Week."
- **Add an explicit exclusion line** to the prompt: *no "Player of the Week"
  text or badge anywhere in the image* — the phrase leaks in from the recipe's
  own vocabulary otherwise.

Everything below applies to a real, explicitly-stated POTW/TOTW package:

- **One team logo well only** — the subject's own team (or, for Team of the
  Week, the featured team). **Never a second/opponent logo, never a "VS"
  card.** Drop the matchup-block concept entirely for these specials, even if
  the source clip is itself about a head-to-head matchup (e.g. a
  quarterback-showdown interview) — the thumbnail still spotlights one
  subject only.
- **Add a bold nameplate** in the same white-over-red distressed poster
  typography as the headline, reading the subject's name (player, or team for
  Team of the Week) — so the thumbnail identifies the subject without relying
  on the composited logo alone.
- **Add one stat-highlight card** in the same torn-paper card style, sitting
  between the nameplate and the "PRESENTED BY" section, with bold white
  distressed all-caps text stating the subject's headline stat (e.g. "516
  YARDS · 6 TDS"). Garret's fix, 2026-09-11: a POTW/TOTW thumbnail only has a
  headline, one nameplate, and one small team well, which left a large empty
  background gap in the lower half of the frame compared to a filled-frame
  reference poster. This card closes that gap — it's the one addition, not an
  opening to add more elements. Pull the stat straight from whatever hook
  number is already driving the title/description; never invent one.
- Everything else from the standard recipe stays: the SCRN/Varsity
  Voices/C Spire wells, the rendered league chip text, the red bottom banner
  (league + week + "Player of the Week" / "Team of the Week"),
  red-black-white palette, torn-poster styling, dial variation.
- Update the "LOGOS NEEDED FOR THIS PROMPT" list to name exactly **one** team
  logo, not two.

### Prompt A1 — 16:9 · full episodes (matchup-block style)

Full episodes only. 1280x720, headline left / cards right.

```
A high-energy 16:9 widescreen (1280x720) thumbnail for a Mississippi high school football [SHOW TOPIC — recap/preview/game of the week]. Composition reads like a torn-newspaper / poster cutout: layered card shapes, white/red torn-paper stripe edges, high energy, filling the frame edge-to-edge with no large uninterrupted empty background gaps — not a flat, clean, minimal, or sparse layout. Background is a dramatic night-time football stadium with bright stadium lights flaring, atmospheric haze, and [STADIUM DIAL] blurred into [RIM LIGHT DIAL]-tinted bokeh.

Reserve clean circular logo wells as empty placeholders for SCRN and Varsity Voices — do not render, invent, or approximate any logo artwork inside them. Each well is filled with a solid dark charcoal/near-black tone matching the poster's night-stadium shadow values (explicitly not white, not transparent), with a thin red rim-light ring at the edge. Size each well modestly smaller than its final reserved space so a real PNG composited in later drops in cleanly without overflow. Neither well carries any text, caption, initials, or name rendered on or beside it — they are bare unlabeled circles, distinguishable only by position (top-left, top-right).

Directly beneath the headline, a small red chip with bold white all-caps text actually reading "[MHSAA / MAIS]" — this is real rendered text, not a logo or placeholder.

Bottom-left, just above the banner, a matching dark-charcoal/red-rim circular well for C Spire, with a small white all-caps "PRESENTED BY" label centered directly above it — this is the only OTHER labeled element in the image besides the league chip.

Bold, gritty stadium poster typography fills a large share of the left two-thirds of the frame: "[HEADLINE LINE 1]" in huge white all-caps distressed font, stacked above "[HEADLINE LINE 2]" in even larger red distressed all-caps font, rough spray-paint texture, strong outline/drop shadow, heavy impact-style caps that stay readable at small thumbnail size.

[2-4] large real-team matchup/rivalry blocks on the right side of the frame, filling most of the remaining frame height, each a jagged/torn poster card with a bold diagonal "VS" chevron, drop shadow, and a slight dynamic tilt ([MATCHUP CARD TILT DIAL]) — a bare, unlabeled team-logo well (same dark-charcoal/red-rim treatment, no text) on each side of the chevron, no player photography. Pick real games from the episode's actual slate, never invented.

Along the bottom edge, a thin red banner strip with bold white distressed all-caps text reads "[LEAGUE] WEEK [N] · [RECAP / PREVIEW / etc]" — with no trailing period inside the quoted text.

Explicitly exclude: section labels in a corner, publish date or kickoff time (unless requested), ad-style tagline copy, and any social platform icon row.

Overall style: high-contrast, gritty, red-black-white color palette, [TEXTURE DIAL] overlays, matching the visual energy of major sports YouTube/podcast thumbnails (ESPN, Bleacher Report style) — bold, dynamic, legible at ~250px wide.
```

LOGOS NEEDED FOR THIS PROMPT: SCRN · Varsity Voices · C Spire · [team logo 1]
· [team logo 2] · [...up to 4 teams total]. (No MHSAA/MAIS logo — it's rendered
as text, not a composited file.)

### Prompt A2 — 9:16 · Shorts (matchup-block style, standalone generation)

Shorts only, and this **is** the whole thumbnail job for a Short — one block,
generated fresh, not a conversion of anything else and with no 3:4 companion.
1080x1920, full vertical: stack the headline above the cards and keep the
bottom/right platform safe zones clear.

```
A high-energy vertical thumbnail in 9:16 vertical (1080x1920) format for a Mississippi high school football [SHOW TOPIC — recap/preview/game of the week] Short, sized for YouTube Shorts / Instagram Reels / TikTok. Composition reads like a torn-newspaper / poster cutout: layered card shapes, white/red torn-paper stripe edges, high energy, filling the frame edge-to-edge with no large uninterrupted empty background gaps — not a flat, clean, minimal, or sparse layout. Background is a dramatic night-time football stadium with bright stadium lights flaring, atmospheric haze, and [STADIUM DIAL] blurred into [RIM LIGHT DIAL]-tinted bokeh.

Reserve clean circular logo wells as empty placeholders for SCRN and Varsity Voices, side by side across the very top of the frame — do not render, invent, or approximate any logo artwork inside them. Each well is filled with a solid dark charcoal/near-black tone matching the poster's night-stadium shadow values (explicitly not white, not transparent), with a thin red rim-light ring at the edge. Size each well modestly smaller than its final reserved space so a real PNG composited in later drops in cleanly without overflow. Neither well carries any text, caption, initials, or name rendered on or beside it — they are bare unlabeled circles, distinguishable only by position (top-left, top-right).

Directly beneath the headline, a small red chip with bold white all-caps text actually reading "[MHSAA / MAIS]" — this is real rendered text, not a logo or placeholder.

Bottom-left, just above the banner, a matching dark-charcoal/red-rim circular well for C Spire, with a small white all-caps "PRESENTED BY" label centered directly above it — this is the only OTHER labeled element in the image besides the league chip.

Bold, gritty stadium poster typography fills the upper third of the frame, below the top logo row: "[HEADLINE LINE 1]" in huge white all-caps distressed font, stacked above "[HEADLINE LINE 2]" in even larger red distressed all-caps font, rough spray-paint texture, strong outline/drop shadow, heavy impact-style caps that stay readable at small thumbnail size.

Filling the middle of the frame below the headline, [2-4] large real-team matchup/rivalry blocks stacked vertically, each a jagged/torn poster card with a bold diagonal "VS" chevron, drop shadow, and a slight dynamic tilt ([MATCHUP CARD TILT DIAL]) — a bare, unlabeled team-logo well (same dark-charcoal/red-rim treatment, no text) on each side of the chevron, no player photography. Pick real games from the episode's actual slate, never invented.

Above the bottom edge, a thin red banner strip with bold white distressed all-caps text reads "[LEAGUE] WEEK [N] · [RECAP / PREVIEW / etc]" — with no trailing period inside the quoted text.

Keep the bottom 15 percent and right 12 percent of the frame clear of important content so Shorts/Reels UI does not cover the headline, cards, or banner.

Explicitly exclude: section labels in a corner, publish date or kickoff time (unless requested), ad-style tagline copy, and any social platform icon row.

Overall style: high-contrast, gritty, red-black-white color palette, [TEXTURE DIAL] overlays, matching the visual energy of major sports YouTube/podcast thumbnails (ESPN, Bleacher Report style) — bold, dynamic, legible at ~250px wide.
```

LOGOS NEEDED FOR THIS PROMPT: SCRN · Varsity Voices · C Spire · [team logo 1]
· [team logo 2] · [...up to 4 teams total]. (No MHSAA/MAIS logo — it's rendered
as text, not a composited file.)

### Prompt B1 — 16:9 · full-episode Player of the Week / Team of the Week (single-subject style)

```
A high-energy 16:9 widescreen (1280x720) thumbnail for a Mississippi high school football Player of the Week feature. Composition reads like a torn-newspaper / poster cutout: layered card shapes, white/red torn-paper stripe edges, high energy, filling the frame edge-to-edge with no large uninterrupted empty background gaps — not a flat, clean, minimal, or sparse layout. Background is a dramatic night-time football stadium with bright stadium lights flaring, atmospheric haze, and [STADIUM DIAL] blurred into [RIM LIGHT DIAL]-tinted bokeh.

Reserve clean circular logo wells as empty placeholders for SCRN and Varsity Voices — do not render, invent, or approximate any logo artwork inside them. Each well is filled with a solid dark charcoal/near-black tone matching the poster's night-stadium shadow values (explicitly not white, not transparent), with a thin red rim-light ring at the edge. Neither well carries any text, caption, initials, or name rendered on or beside it — they are bare unlabeled circles, distinguishable only by position (top-left, top-right).

Directly beneath the headline, a small red chip with bold white all-caps text actually reading "[MHSAA / MAIS]" — this is real rendered text, not a logo or placeholder.

Bold, gritty stadium poster typography: "PLAYER OF THE WEEK" (or "TEAM OF THE WEEK") in huge white all-caps distressed font, stacked above a nameplate reading "[SUBJECT NAME]" in even larger red distressed all-caps font, rough spray-paint texture, strong outline/drop shadow. Beside or beneath the nameplate, one additional bare, unlabeled dark-charcoal/red-rim well — the subject's own team, and the ONLY team logo in this composition, no second team, no "VS" card.

Below the nameplate, one more torn-poster card in the same style, spanning most of the frame's width, with bold white distressed all-caps text stating the subject's headline stat: "[STAT LINE]" — no trailing period inside the quoted text. This card fills the space between the nameplate and the "PRESENTED BY" section so the lower half of the frame doesn't read as empty background.

Bottom-left, just above the banner, a matching dark-charcoal/red-rim circular well for C Spire, with a small white all-caps "PRESENTED BY" label centered directly above it — this is the only OTHER labeled element in the image besides the league chip.

Along the bottom edge, a thin red banner strip with bold white distressed all-caps text reads "[LEAGUE] WEEK [N] · PLAYER OF THE WEEK" (or TEAM OF THE WEEK).

Explicitly exclude: section labels, publish date/kickoff time (unless requested), ad-style tagline copy, social platform icon rows.

Overall style: high-contrast, gritty, red-black-white color palette, [TEXTURE DIAL] overlays, matching the visual energy of major sports YouTube/podcast thumbnails — bold, dynamic, legible at ~250px wide.
```

LOGOS NEEDED FOR THIS PROMPT: SCRN · Varsity Voices · C Spire · [subject's team
logo] — exactly one team logo, never two. (No MHSAA/MAIS logo — it's rendered
as text, not a composited file.)

### Prompt B2 — 9:16 · Short Player of the Week / Team of the Week (single-subject style, standalone generation)

Shorts only — one block, generated fresh, not a conversion, no 3:4 companion.
1080x1920, full vertical, bottom/right platform safe zones clear.

```
A high-energy vertical thumbnail in 9:16 vertical (1080x1920) format for a Mississippi high school football Player of the Week Short, sized for YouTube Shorts / Instagram Reels / TikTok. Composition reads like a torn-newspaper / poster cutout: layered card shapes, white/red torn-paper stripe edges, high energy, filling the frame edge-to-edge with no large uninterrupted empty background gaps — not a flat, clean, minimal, or sparse layout. Background is a dramatic night-time football stadium with bright stadium lights flaring, atmospheric haze, and [STADIUM DIAL] blurred into [RIM LIGHT DIAL]-tinted bokeh.

Reserve clean circular logo wells as empty placeholders for SCRN and Varsity Voices, side by side across the very top of the frame — do not render, invent, or approximate any logo artwork inside them. Each well is filled with a solid dark charcoal/near-black tone matching the poster's night-stadium shadow values (explicitly not white, not transparent), with a thin red rim-light ring at the edge. Neither well carries any text, caption, initials, or name rendered on or beside it — they are bare unlabeled circles, distinguishable only by position (top-left, top-right).

Directly beneath the headline, a small red chip with bold white all-caps text actually reading "[MHSAA / MAIS]" — this is real rendered text, not a logo or placeholder.

Bold, gritty stadium poster typography fills the upper third of the frame, below the top logo row: "PLAYER OF THE WEEK" (or "TEAM OF THE WEEK") in huge white all-caps distressed font, stacked above a nameplate reading "[SUBJECT NAME]" in even larger red distressed all-caps font, rough spray-paint texture, strong outline/drop shadow. Beside or beneath the nameplate, one additional bare, unlabeled dark-charcoal/red-rim well — the subject's own team, and the ONLY team logo in this composition, no second team, no "VS" card.

Below the nameplate, one more torn-poster card in the same style, spanning most of the frame's width, with bold white distressed all-caps text stating the subject's headline stat: "[STAT LINE]" — no trailing period inside the quoted text. This card fills the space between the nameplate and the "PRESENTED BY" section so the lower half of the frame doesn't read as empty background.

Bottom-left, just above the banner, a matching dark-charcoal/red-rim circular well for C Spire, with a small white all-caps "PRESENTED BY" label centered directly above it — this is the only OTHER labeled element in the image besides the league chip.

Above the bottom edge, a thin red banner strip with bold white distressed all-caps text reads "[LEAGUE] WEEK [N] · PLAYER OF THE WEEK" (or TEAM OF THE WEEK).

Keep the bottom 15 percent and right 12 percent of the frame clear of important content so Shorts/Reels UI does not cover the headline, cards, or banner.

Explicitly exclude: section labels, publish date/kickoff time (unless requested), ad-style tagline copy, social platform icon rows.

Overall style: high-contrast, gritty, red-black-white color palette, [TEXTURE DIAL] overlays, matching the visual energy of major sports YouTube/podcast thumbnails — bold, dynamic, legible at ~250px wide.
```

LOGOS NEEDED FOR THIS PROMPT: SCRN · Varsity Voices · C Spire · [subject's team
logo] — exactly one team logo, never two. (No MHSAA/MAIS logo — it's rendered
as text, not a composited file.)

### Prompt C — 3:4 conversion (1080x1440, full episodes ONLY)

**This prompt does not apply to Shorts** — a Short has no 3:4 at all; its
entire thumbnail job is the single 9:16 prompt (A2 or B2 above). Prompt C
exists only for full episodes, as the second of their two Asset 3 blocks: not
a fresh description, but a short instruction to run against the *finished,
logo-composited* Prompt A1/B1 (16:9) image as an image-to-image edit:

```
Take the finished, logo-composited image above and convert it into a 3:4 portrait ratio (1080x1440) version. Do not add, invent, or render any logo, brand mark, or text that is not already visibly present in the source image — reproduce only what's actually there. Do not stretch, squash, or distort anything — retain all styling, fonts, colors, and textures exactly, including the rendered "[MHSAA/MAIS]" league-chip text (leave it as text — do not turn it into a logo). Reflow (don't just crop) the existing elements to fill the taller-but-less-extreme portrait frame: the SCRN and Varsity Voices logos stay in a top row; the headline and league chip stack below that; the nameplate and matchup cards (or the single team well + nameplate + stat card, for Player/Team of the Week) sit below that, filling the frame with no large empty gaps; the presented-by sponsor logo (whatever was actually composited into the source image) and its "PRESENTED BY" label stay bottom, center-aligned to each other above the banner. Every composited logo must stay at its original aspect ratio and remain a perfect 1:1 circle, scaled uniformly (same amount horizontally and vertically), never compressed into an oval to fit a row's height.
```

**Never name a specific sponsor by brand in this conversion prompt** — the
presented-by well gets whichever real sponsor logo Garret actually composited
into the source image (C Spire most weeks, but not always — e.g. Mississippi
Army National Guard on the Trivillion package). Naming a brand here caused the
image model to render a second, invented sponsor logo/wordmark next to the
real one that was already in the source image — Garret caught this on
2026-09-11. Describe the well generically ("the presented-by sponsor logo")
and let the source image's own composited logo carry through the conversion.

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

**Team names belong in the tags, not just the base list — every format.**
Garret's rule, Sep 10 2026. Whenever the episode/Short has a clear featured
team (headline matchup, Player/Team of the Week subject's school, etc.), spend
part of the remaining character budget on that team's name as an explicit tag
instead of only generic filler like `mhsaa football`. This applies to full
episodes and Shorts as well as Player/Team of the Week — not just the specials
below.

**Player of the Week / Team of the Week tags specifically** must include the
featured player's (or team's) name and school as explicit tags, plus any other
clearly relevant tag (position, opponent's school if there's a headline
matchup angle, etc.) — not just the 1-2 generic additions described above.
Worked example (MAIS Week 3 Brennan Templeton package, 478 chars): base list
trimmed of a couple of lower-value generic tags, plus `Brennan Templeton`,
`Starkville Academy`, `Winston Academy`, `linebacker`. Count the string every
time — the budget is tight, so cut a generic tag before dropping a name tag.

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
9. Vary the thumbnail's stadium/rim-light/texture/tilt dials every generation; say
   which ones you moved. Every logo (brand and team) is described as a dark-charcoal,
   red-rimmed circular placeholder "well" for compositing in post — never as an
   attached file to reproduce, and never as truly blank negative space either.
   **Exception: the MHSAA/MAIS league mark is rendered as actual text in a red
   chip, never a well** — there's no logo file being composited for it. Every
   prompt lists its full logo needs (never including the league mark) in a
   "LOGOS NEEDED FOR THIS PROMPT" bullet line directly underneath it. Garret,
   Sep 8-9 2026 and Sep 11 2026. Fill the frame — no large uninterrupted empty
   background gaps; for POTW/TOTW, which otherwise runs sparse, add the single
   stat-highlight card described in that section rather than piling on new
   elements. Garret, Sep 11 2026.
10. Output all four assets in copy-paste blocks, in order, every time. Asset 3's
    block count depends on format — **a full episode gets two blocks (16:9
    generation + 3:4 conversion), a Short gets exactly one block (a standalone
    9:16 generation prompt)**. A Short gets **no 3:4 at all** and never a
    conversion step — Garret, Sep 11 2026, second revision that day
    (superseding a same-day intermediate rule that had put Shorts on
    3:4-only). **For full episodes, 3:4 is portrait (1080x1440), not 4:3
    landscape** — Garret, Sep 1 2026.
11. Expect **league, format and publish date** on every invocation; derive the week
    from the publish date and don't re-ask for those three.
12. **Player of the Week / Team of the Week thumbnails get one team logo, never a
    matchup block, plus the subject's name as text on the thumbnail** — full
    episodes and Shorts keep the 2-4 team matchup-block style. Garret, Sep 10 2026.
    **Only treat a package as POTW/TOTW when Garret explicitly says so** — he
    always names it. A clip featuring a past winner is not a new POTW; give it
    the single-subject highlight recipe (stat headline, context card, non-award
    banner) and exclude "Player of the Week" from the image. Garret, Sep 22 2026.
13. **Tags include team names for every format**, not just generic filler — and
    Player/Team of the Week tags specifically must name the featured player/team
    and school. Garret, Sep 10 2026.
14. **Read the memory directory before doing anything else** (Step 0). This file
    is not the complete rule set — memory holds later corrections and wins on
    conflict. Garret, Sep 22 2026, after repeated runs ignored rules he had
    already saved.
15. **No play-by-play.** No narration between tool calls, no explanation of what
    you found, no closing summary. Output the four blocks and stop; speak up only
    for something genuinely critical. Garret, Sep 22 2026.
16. **No periods in the rendered image.** Every image prompt states that no text
    in the image — headline, nameplate, cards, score, league chip, banner — ends
    with or contains a period, and no quoted string in the prompt itself ends
    with one (`reading "40-39"`, never `reading "40-39."`). The generator copies
    trailing periods and they read as typos at thumbnail size. Garret,
    Sep 23 2026.
17. **Every description carries the Spotify podcast link** — the
    `Listen to the Varsity Voices podcast on Spotify:` line, URL exactly as given,
    directly under the `@STATECHAMPRADIO` handles line in FOLLOW THE NETWORK, in
    both leagues and every format. Garret, Oct 1 2026. Old descriptions are not
    regenerated.
