---
name: scrn-image-prompt-generator
description: Generate an SCRN / Varsity Voices branded social media image prompt in the network's signature gritty stadium-poster style (bold distressed typography, player action-shot collage, night stadium background, SCRN logo top-left, Varsity Voices logo top-right). Use when the user wants a new social graphic, engagement post, or "who's your pick" style image for State Championships Radio Network or Varsity Voices Mississippi High School Football. Always asks the user for the headline text and the bottom text (and their positions) before generating the prompt.
---

# SCRN / Varsity Voices Image Prompt Generator

This skill produces a single, ready-to-use AI image generation prompt matching the established SCRN / Varsity Voices social graphic style: a gritty, high-contrast football poster with distressed typography, a night-stadium backdrop, a collage of player action shots, and fixed logo placement.

## Step 1 — Ask the user for input

Before generating anything, use the AskUserQuestion tool to gather input. For every question, generate at least two concrete, high-school-football-relevant options rather than a single open-ended prompt — the AskUserQuestion tool requires 2+ options per question, and a user can always pick "Other" to type their own custom text. Tailor the auto-generated options to engagement-style football content (rivalries, predictions, playoffs, records, highlights, etc.) so they're realistic starting points, not generic placeholders.

1. **Headline text** — ask this as a multiple-choice question offering 2–4 sample engagement-style headlines relevant to high school football (e.g., "Who are your favorites to make the state championships?", "What's the toughest road environment in Mississippi?", "What was the craziest game you've ever seen?", "Which team is the biggest playoff sleeper?"). Include an option to let the user type their own via "Other." Also ask (as a follow-up or second question) whether the headline should split into two lines/colors — offer options like "Single line, all white" / "Two lines: white question + red emphasis word or phrase" / "Other."
2. **Bottom text** — ask this as a multiple-choice question offering 2–4 sample closing lines/CTAs relevant to the network's voice (e.g., "Tell us in the comments below", "Comment your pick!", "The mic is hot. The research is cold.", "Let's see which one gets the most mentions!"). Include "Other" so the user can type a custom line.
3. **Text positions** — offer a multiple-choice question with the default layout as one option and a custom option as the other (e.g., "Use defaults (headline upper third, bottom text at the bottom edge)" vs. "Custom — I'll specify placement"). If custom is chosen, follow up to get specifics.
4. **Player/team focus** — offer a multiple-choice question: "Generic action-shot collage (no specific teams)" vs. "Feature specific teams or players — I'll list them."

Do not generate the prompt until the headline text and bottom text are confirmed.

## Step 2 — Fixed brand elements (always include, do not ask about these)

Every image built with this skill must include:

- **Aspect ratio**: 9:16 vertical (per SCRN VV default), unless the user requests otherwise.
- **Top-left corner**: the "State Championships Radio Network" shield logo (black/white/red football shield crest).
- **Top-right corner**: the "Varsity Voices — Mississippi High School Football" microphone logo.
- **Background**: dramatic night-time football stadium, bright stadium lights, atmospheric haze, blurred crowd bokeh.
- **Player collage**: 4–8 dynamic action shots of high school football players (running, pointing, celebrating), each color-graded with high contrast, small team helmet/logo icons near each player where applicable.
- **Typography style**: bold, distressed/weathered stadium-poster lettering, all-caps, red-black-white palette, torn-paper or spray-paint texture overlays.
- **Overall tone**: high-contrast editorial sports photography blended with poster-style graphic design, consistent with prior SCRN VV posts.

## Step 3 — Generate the prompt

Combine the user's headline text, bottom text, and confirmed positions with the fixed brand elements above into a single descriptive image generation prompt. Use this structure as a base and adapt wording to fit the specific text provided:

```
A high-energy sports marketing graphic in 9:16 vertical format for a Mississippi
high school football social media post. In the top-left corner, place the "State
Championships Radio Network" shield logo (black, white, and red football crest
design). In the top-right corner, place the "Varsity Voices — Mississippi High
School Football" microphone logo. Bold, gritty stadium-style distressed typography
dominates [POSITION], reading "[HEADLINE TEXT LINE 1]" in white all-caps font,
followed by "[HEADLINE TEXT LINE 2 / EMPHASIS]" in large red distressed all-caps
font with a rough, weathered texture. Background is a dramatic night-time football
stadium with bright stadium lights, atmospheric haze, and blurred crowd bokeh.
Arranged around the border of the frame are 4 to 8 dynamic action shots of high
school football players in mid-play (running, pointing, celebrating), each cut out
and placed with a slight color-graded, high-contrast editorial look, with small
team helmet or logo icons placed near each player. At [BOTTOM POSITION], bold
white and red distressed text reads "[BOTTOM TEXT]." Overall style: high-contrast,
gritty, red-black-white color palette, torn paper/spray-paint texture overlays,
dramatic lighting, editorial sports photography blended with poster-style
typography.
```

## Step 4 — Deliver

Always save the finished prompt as a `.md` file in `templates/graphics/image-prompts/` within the SCRN VV project folder — do not just print the prompt in chat and stop. Use this file structure:

```
# Image Prompt — "[Short descriptive title based on the headline]"

**Post concept:** [one-line summary of what the post is asking/promoting]
**Headline:** "[headline text]" ([single line / two-line white+red] )
**Bottom text:** "[bottom text]"
**Layout:** [Default / Custom — describe if custom]
**Player collage:** [Generic / Specific teams: list them]

## Full Prompt

[the full generated image prompt]
```

Name the file descriptively in kebab-case based on the headline (e.g., `state-champs-favorites-prompt.md`, `toughest-road-environment-prompt.md`). Present the saved file to the user via `mcp__cowork__present_files` and give a brief confirmation. Also offer to generate the image directly if the user wants.
