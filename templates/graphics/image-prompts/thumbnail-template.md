# Thumbnail Prompt Template — Varsity Voices YouTube Episodes (16:9)

Reusable base for episode thumbnails, distilled from the S2 E01 Part 1/2 prompts
(`mais-preview-part1-who-wins-4a-thumbnail-prompt.md`,
`mais-preview-part2-end-of-an-era-thumbnail-prompt.md`). Fill the `[BRACKETS]`.

## Logos come from attached files, not from description

Both logo files are uploaded alongside the prompt. Always instruct the model to
reproduce them exactly rather than describing them — a described logo gets
reinvented slightly differently on every generation. Paste this block into any
thumbnail prompt, 16:9 or 9:16:

```
Use the two attached logo files exactly as provided — do not redraw, restyle,
recolor, crop, rotate, add text to, or apply any texture, grain, haze, or
lighting effect to either one. Place the attached "State Championships Radio
Network" shield logo (the black shield crest containing the Mississippi state
outline and a radio tower) in the TOP-LEFT corner, and the attached square
"Varsity Voices — Mississippi High School Football" logo (the chrome microphone
over a football with the navy banner) in the TOP-RIGHT corner. Scale them to
match each other by height — roughly 12 to 15 percent of the frame height — with
equal margins from the top and side edges, so the portrait shield and the square
logo read as visually balanced. Both logos must stay fully visible and
unobstructed: no player cut-out, headline text, stadium haze, or texture overlay
may cross either one, and their original colors are preserved, including the
Varsity Voices navy and gold, which are not recolored to match the thumbnail
palette.
```

## Fixed brand elements (never change)

- 16:9 widescreen, optimized for readability at small thumbnail size
- Top-left: the attached SCRN shield logo, unaltered
- Top-right: the attached Varsity Voices logo, unaltered
- Night-time stadium background: flaring lights, atmospheric haze, crowd bokeh
- Red-black-white palette, distressed spray-paint/torn-paper texture typography
- Bottom edge: thin red banner strip, white all-caps text:
  `[LEAGUE] 2026 SEASON PREVIEW · PART [N]` (or episode-appropriate strip)

## Click-through levers (choose per episode)

- Headline: 2–4 words max, stacked white line + larger red emphasis line
- The league (MAIS/MHSAA) must be visible — in the headline, a small red chip, or the banner
- One dominant cut-out focal subject on the right third with a white outline stroke
  (player mid-play, or an emotional figure like the coach silhouette in Part 2)
- 2–4 supporting cut-out action shots, high-contrast editorial grading
- One single accent-color prop max (e.g., gold trophy) for the storyline
- Generic players only — no real uniforms/likenesses (avoids AI artifacts)

## Full Prompt Template

```
A high-energy YouTube thumbnail in 16:9 widescreen format for a Mississippi high
school football [SHOW TOPIC]. In the top-left corner, place the "State
Championships Radio Network" shield logo (black, white, and red football crest
design). In the top-right corner, place the "Varsity Voices — Mississippi High
School Football" microphone logo. Bold, gritty stadium-style distressed
typography dominates the left two-thirds of the frame, reading "[HEADLINE LINE 1]"
in huge white all-caps font, stacked above "[HEADLINE LINE 2 / EMPHASIS]" in even
larger red distressed all-caps font with a rough, weathered spray-paint texture —
oversized lettering that stays readable at small thumbnail size. [OPTIONAL: small
red chip beneath the headline with white all-caps text reading "[LEAGUE]".]
Background is a dramatic night-time football stadium with bright stadium lights
flaring, atmospheric haze, and blurred crowd bokeh. The right third of the frame
is dominated by [FOCAL SUBJECT — e.g., a large dynamic cut-out of a generic high
school quarterback mid-throw / a back-lit veteran coach silhouette walking off
the field], rendered in the cut-out-with-white-outline YouTube style, with
[2–4] smaller dynamic cut-out action shots of generic high school football
players around it, each with a bold white outline stroke and punchy
high-contrast editorial color grading. [OPTIONAL: one accent prop, e.g., a gold
championship trophy with a subtle glow.] Along the bottom edge, a thin red
banner strip with bold white distressed all-caps text reads "[BANNER TEXT]."
Overall style: high-contrast, gritty, red-black-white color palette, torn
paper/spray-paint texture overlays, dramatic rim lighting, editorial sports
photography blended with poster-style typography, optimized for maximum
click-through at small sizes.
```
