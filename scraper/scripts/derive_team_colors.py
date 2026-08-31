"""
Fill teams.json colors from each school's crest.

MaxPreps does not expose school colors on the pages we scrape, so the field
comes through null for every team and anything that wants to paint in a
school's colors has nothing to work with. The crest is the one source we
already hold that knows them, so read them back out of it.

Neutrals are dropped before counting: nearly every logo is mostly white or
black outline, and a naive "most common colour" returns white for almost
every school in the state. What survives is the saturated ink, which is what
a school actually calls its colours.

Idempotent and safe to re-run; run it after a scrape, which rewrites
teams.json and clears the field again.

    python scraper/scripts/derive_team_colors.py 2026-27
"""

from __future__ import annotations

import colorsys
import json
import sys
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "web" / "public"

# A pixel has to be this colourful, and this far from black or white, before it
# counts as ink rather than outline, shadow or paper.
MIN_SATURATION = 0.25
MIN_VALUE = 0.15
MAX_VALUE = 0.97
# Buckets, so a gradient or a JPEG artefact does not split one colour into
# a hundred near-identical entries that each lose to a flat one.
BUCKET = 32
# How far apart two hues must sit to be worth calling secondary rather than a
# lighter shade of the primary.
MIN_HUE_GAP = 30.0


def _hue(rgb: tuple[int, int, int]) -> float:
    h, _, _ = colorsys.rgb_to_hsv(*[c / 255 for c in rgb])
    return h * 360


def _ink(im: Image.Image) -> Counter:
    """
    Bucketed weight of the saturated, non-neutral pixels in a crest.

    Weighted by saturation rather than counted, because the ring of muddy
    half-tones an anti-aliased edge leaves behind outnumbers the flat fill it
    surrounds. Counting plainly returns that mud — Tupelo's navy-and-gold
    crest reads as a desaturated slate — while weighting lets the vivid ink
    win by being vivid.
    """
    counts: Counter = Counter()
    for r, g, b, a in im.getdata():
        if a < 128:
            continue
        _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if s < MIN_SATURATION or v < MIN_VALUE or v > MAX_VALUE:
            continue
        counts[(r // BUCKET, g // BUCKET, b // BUCKET)] += s * s
    return counts


def _hex(bucket: tuple[int, int, int]) -> str:
    # Centre of the bucket, so a colour is not biased toward its dark edge.
    r, g, b = (min(255, c * BUCKET + BUCKET // 2) for c in bucket)
    return f"#{r:02x}{g:02x}{b:02x}"


def colors_for(path: Path) -> tuple[str | None, str | None]:
    """Primary and secondary colour of one crest, or Nones if it has no ink."""
    try:
        with Image.open(path) as raw:
            im = raw.convert("RGBA")
            # Full resolution buys nothing here and costs seconds per logo.
            im.thumbnail((160, 160))
            counts = _ink(im)
    except (OSError, ValueError):
        return None, None
    if not counts:
        return None, None

    ranked = counts.most_common()
    primary = ranked[0][0]
    primary_hue = _hue(tuple(min(255, c * BUCKET + BUCKET // 2) for c in primary))

    secondary = None
    for bucket, _ in ranked[1:]:
        rgb = tuple(min(255, c * BUCKET + BUCKET // 2) for c in bucket)
        gap = abs(_hue(rgb) - primary_hue)
        if min(gap, 360 - gap) >= MIN_HUE_GAP:
            secondary = bucket
            break

    return _hex(primary), _hex(secondary) if secondary else None


def main(season: str) -> int:
    teams_path = PUBLIC / "data" / season / "teams.json"
    teams = json.loads(teams_path.read_text(encoding="utf-8"))
    rows = teams if isinstance(teams, list) else teams["teams"]

    filled = missing = 0
    for team in rows:
        logo = team.get("logoUrl")
        if not logo:
            missing += 1
            continue
        path = PUBLIC / logo.lstrip("/")
        if not path.exists():
            missing += 1
            continue
        primary, secondary = colors_for(path)
        if not primary:
            missing += 1
            continue
        team["colors"] = {"primary": primary, "secondary": secondary}
        filled += 1

    teams_path.write_text(
        json.dumps(teams, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"{season}: colours set for {filled} teams, {missing} without usable crest")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1] if len(sys.argv) > 1 else "2026-27"))
