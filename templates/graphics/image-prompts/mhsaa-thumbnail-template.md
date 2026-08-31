# Thumbnail Prompt — Varsity Voices MHSAA Episodes (16:9)

Canonical base supplied by Garret (Aug 2026). Generate from this every time, but
**vary it slightly on each request** — consecutive episodes must not look
identical in the sidebar. Rules for what may move and what may not are below.

## Reference images (upload with every generation)

Two logo files are attached to the request. The prompt must tell the model to
**reproduce them exactly**, not to redraw them from a description — describing a
logo in words is what makes generators invent a slightly wrong crest each time.

| File | Shape | Placement |
|---|---|---|
| SCRN shield — black shield crest, Mississippi outline, radio tower | portrait | top-LEFT |
| Varsity Voices — chrome microphone over a football, navy banner | square | top-RIGHT |

Because one is portrait and one is square, size them by **height**, not width, or
the shield reads oversized. The Varsity Voices navy and gold stay as-is — they are
not recolored into the red-black-white palette.

## Never changes

- 16:9 widescreen, readable at small thumbnail size
- Top-left: the attached SCRN shield logo, unaltered
- Top-right: the attached Varsity Voices logo, unaltered
- Headline: white all-caps line stacked above a larger red distressed all-caps
  line, gritty spray-paint texture, occupying the left two-thirds
- Small red "MHSAA" chip directly beneath the headline
- Thin red banner strip along the bottom edge
- Red-black-white palette, torn paper / spray-paint texture overlays
- The generic-player block, verbatim — no jersey/helmet/scoreboard text, no school
  names or mascots, no brand logos (Nike, Riddell), no recognizable faces

## Changes per episode

- Headline line 2 — the classes covered, e.g. `7A-5A?` / `4A-1A?`
- Banner text — `MHSAA 2026 SEASON PREVIEW · PART [N]`, or the episode-appropriate strip

## Variation dials — move 2 to 3 of these on every generation

Never repeat the previous episode's focal action. Pick a different combination each time.

| Dial | Options |
|---|---|
| Focal action | QB mid-throw · RB breaking a tackle · WR leaping catch · defender mid-collision · O-line surge · player celebrating |
| Collage | 2, 3 or 4 supporting cut-outs; largest figure anchored right edge or right-centre |
| Camera | low-angle hero shot · sideline telephoto compression · end-zone perspective · slight dutch tilt |
| Stadium | packed big-school crowd · single light bank, modest bleachers · light rain or mist · smoke from a run-out tunnel |
| Rim lighting | warm gold · cool blue · red-tinted haze |
| Accent prop | gold championship trophy · none (max one prop, never two) |
| Texture | torn paper edges · spray-paint scuff · heavy film grain · chalk dust in the light beams |
| Uniform pairs | plain solid, unmarked: white+navy · black+red · maroon+gold · green+white |

Rule of thumb: big-class episodes (7A-5A) lean spectacle — packed crowd, trophy,
warm light. Small-class episodes (4A-1A) lean grit — single light bank, collision,
cold light, no trophy.

## Base Prompt

A high-energy YouTube thumbnail in 16:9 widescreen format for a Mississippi high
school football season preview show. Use the two attached logo files exactly as
provided — do not redraw, restyle, recolor, crop, rotate, add text to, or apply
any texture, grain, haze, or lighting effect to either one. Place the attached
"State Championships Radio Network" shield logo (the black shield crest
containing the Mississippi state outline and a radio tower) in the TOP-LEFT
corner, and the attached square "Varsity Voices — Mississippi High School
Football" logo (the chrome microphone over a football with the navy banner) in
the TOP-RIGHT corner. Scale them to match each other by height — roughly 12 to 15
percent of the frame height — with equal margins from the top and side edges, so
the portrait shield and the square logo read as visually balanced. Both logos
must stay fully visible and unobstructed: no player cut-out, headline text,
stadium haze, or texture overlay may cross either one, and their original colors
are preserved, including the Varsity Voices navy and gold, which are not
recolored to match the thumbnail palette. Bold, gritty stadium-style distressed
typography dominates the left two-thirds of the frame, reading "WHO WINS" in
huge white all-caps font, stacked above "[CLASSES]?" in even larger red
distressed all-caps font with a rough, weathered spray-paint texture — oversized
lettering that stays readable at small thumbnail size. Directly beneath the
headline, a small red chip with white all-caps text reading "MHSAA." Background
is a dramatic night-time football stadium with bright stadium lights flaring,
atmospheric haze, and [STADIUM DIAL] blurred into red-tinted bokeh. On the right
third of the frame, a tight collage of [2-4] large dynamic action shots of
generic high school football players in mid-play — [FOCAL ACTION DIAL] — each cut
out with a bold white outline stroke and color-graded with punchy high-contrast
editorial lighting, the largest figure dominating the right edge in the popular
cut-out-with-glow YouTube style, shot [CAMERA DIAL] with [RIM LIGHTING DIAL] rim
lighting. [ACCENT PROP DIAL: A gold championship trophy with a subtle glow sits
between the headline and the players, hinting at the title race. | omit
entirely.] Along the bottom edge, a thin red banner strip with bold white
distressed all-caps text reads "MHSAA 2026 SEASON PREVIEW · PART [N]." Overall
style: high-contrast, gritty, red-black-white color palette[ with a single gold
accent], [TEXTURE DIAL] overlays, dramatic rim lighting on the players, editorial
sports photography blended with poster-style typography, optimized for maximum
click-through at small sizes. Important: all players must be entirely generic —
no readable text of any kind on jerseys, helmets, or scoreboards, no school names
or mascots, no brand logos (no Nike swoosh, no Riddell or other manufacturer
marks), and no recognizable faces. Plain solid-color uniforms with no wordmark
across the chest.

## Generation log

Record what was used so the next one differs.

| Episode | Headline | Focal action | Stadium | Light | Prop |
|---|---|---|---|---|---|
| S2 E02 Pt 1 (7A-5A) | WHO WINS 7A-5A? | QB throw + RB tackle-break + celebration | packed crowd | red haze | gold trophy |
| S2 E02 Pt 2 (4A-1A) | WHO WINS 4A-1A? | RB/tackler collision | single light bank | cold blue | none |
