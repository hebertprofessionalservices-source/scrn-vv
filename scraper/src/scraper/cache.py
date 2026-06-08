"""SQLite-backed resumability cache for crawls."""
from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass
from pathlib import Path

import sqlite_utils


@dataclass(frozen=True)
class CacheHit:
    url: str
    body: str
    status: int
    fetched_at: float
    body_hash: str


def _normalize(url: str) -> str:
    return url.rstrip("/")


class CrawlCache:
    """Records HTTP responses so re-runs skip already-fetched URLs."""

    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self._db = sqlite_utils.Database(path)
        if "responses" not in self._db.table_names():
            self._db["responses"].create(
                {
                    "url": str,
                    "body": str,
                    "status": int,
                    "fetched_at": float,
                    "body_hash": str,
                },
                pk="url",
            )

    def get(self, url: str, *, force: bool = False) -> CacheHit | None:
        if force:
            return None
        for r in self._db["responses"].rows_where("url = ?", [_normalize(url)]):
            return CacheHit(
                url=r["url"],
                body=r["body"],
                status=r["status"],
                fetched_at=r["fetched_at"],
                body_hash=r["body_hash"],
            )
        return None

    def put(self, url: str, *, body: str, status: int) -> CacheHit:
        body_hash = hashlib.sha256(body.encode("utf-8")).hexdigest()
        row = {
            "url": _normalize(url),
            "body": body,
            "status": status,
            "fetched_at": time.time(),
            "body_hash": body_hash,
        }
        self._db["responses"].upsert(row, pk="url")
        return CacheHit(**row)

    def stats(self) -> dict[str, int]:
        total = self._db["responses"].count
        query = "SELECT COUNT(*) AS n FROM responses WHERE status BETWEEN 200 AND 299"
        ok = next(self._db.query(query))["n"]
        errors = total - ok
        return {"total": total, "ok": ok, "errors": errors}
