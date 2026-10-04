"""Download and dedupe team logos."""
from __future__ import annotations

import io
from pathlib import Path

import httpx
from PIL import Image, UnidentifiedImageError

from scraper.http import StaticFetcher

# Logos render at 96px at most (192px on 2x screens). MaxPreps serves up to
# 1500px originals, and ~290 of them on one rankings page cost ~20 MB per visit.
LOGO_MAX_PX = 256


def shrink_logo(path: Path) -> None:
    """Downscale to LOGO_MAX_PX and palette-quantize in place, if smaller.

    Leaves the file alone when it isn't a readable image.
    """
    raw = path.read_bytes()
    try:
        im = Image.open(io.BytesIO(raw)).convert("RGBA")
    except (UnidentifiedImageError, OSError):
        return
    im.thumbnail((LOGO_MAX_PX, LOGO_MAX_PX), Image.LANCZOS)
    q = im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    buf = io.BytesIO()
    q.save(buf, "PNG", optimize=True)
    if buf.tell() < len(raw):
        path.write_bytes(buf.getvalue())


async def download_team_logo(
    *,
    team_id: str,
    logo_url: str | None,
    out_dir: Path,
    transport: httpx.BaseTransport | None = None,
) -> Path | None:
    """Download a team logo to {out_dir}/{team_id}.png. Idempotent.

    Returns the file path on success (including when already cached on disk —
    a local file wins even without a URL, so manually sourced logos for schools
    MaxPreps has no image for survive re-scrapes), None when the URL is
    missing and no local copy exists, or the download fails.
    """
    target = out_dir / f"{team_id}.png"
    if target.exists():
        return target
    if not logo_url:
        return None
    fetcher = StaticFetcher(transport=transport)
    try:
        ok = await fetcher.download(logo_url, target)
    finally:
        await fetcher.aclose()
    if not ok:
        return None
    shrink_logo(target)
    return target
