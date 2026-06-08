from pathlib import Path

from scraper.cache import CrawlCache


def test_miss_then_hit(tmp_path: Path):
    cache = CrawlCache(tmp_path / "c.db")
    assert cache.get("https://example.com/a") is None
    cache.put("https://example.com/a", body="<html>1</html>", status=200)
    hit = cache.get("https://example.com/a")
    assert hit is not None
    assert hit.body == "<html>1</html>"
    assert hit.status == 200


def test_force_bypasses_cache(tmp_path: Path):
    cache = CrawlCache(tmp_path / "c.db")
    cache.put("u", body="old", status=200)
    assert cache.get("u", force=True) is None


def test_put_overwrites_existing(tmp_path: Path):
    cache = CrawlCache(tmp_path / "c.db")
    cache.put("u", body="v1", status=200)
    cache.put("u", body="v2", status=200)
    assert cache.get("u").body == "v2"


def test_url_normalization(tmp_path: Path):
    cache = CrawlCache(tmp_path / "c.db")
    cache.put("https://example.com/a/", body="x", status=200)
    assert cache.get("https://example.com/a") is not None
    assert cache.get("https://example.com/a/") is not None


def test_stats_returns_counts(tmp_path: Path):
    cache = CrawlCache(tmp_path / "c.db")
    cache.put("a", body="x", status=200)
    cache.put("b", body="y", status=404)
    s = cache.stats()
    assert s["total"] == 2
    assert s["ok"] == 1
    assert s["errors"] == 1
