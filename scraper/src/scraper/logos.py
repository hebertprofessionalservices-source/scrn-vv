"""Download and dedupe team logos."""
from __future__ import annotations

from pathlib import Path

import httpx

from scraper.http import StaticFetcher


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
    return target if ok else None
