from pathlib import Path

from scraper import config


def test_config_exposes_required_paths():
    assert isinstance(config.OUTPUT_DIR, Path)
    assert isinstance(config.CACHE_DB_PATH, Path)
    assert config.OUTPUT_DIR.name == "output"
    assert config.CACHE_DB_PATH.name == "crawl.db"


def test_config_exposes_crawl_tuning():
    assert config.PAGE_CONCURRENCY >= 1
    assert config.JITTER_MIN_SECONDS < config.JITTER_MAX_SECONDS
    assert config.MAX_BACKOFF_SECONDS >= 60


def test_supported_seasons_present():
    assert "2024-25" in config.SUPPORTED_SEASONS
    assert "2025-26" in config.SUPPORTED_SEASONS


def test_maxpreps_base_url_set():
    assert config.MAXPREPS_BASE.startswith("https://www.maxpreps.com")


def test_ms_football_landing_uses_short_path():
    assert config.MS_FOOTBALL_LANDING.endswith("/ms/football/")


def test_chromium_extra_launch_args_non_empty():
    assert isinstance(config.CHROMIUM_EXTRA_LAUNCH_ARGS, tuple)
    assert len(config.CHROMIUM_EXTRA_LAUNCH_ARGS) > 0


def test_landing_url_template_has_placeholder():
    # Should be formattable with season keyword
    url = config.LANDING_URL_TEMPLATE.format(season="25-26")
    assert "25-26" in url
    assert url.startswith("https://www.maxpreps.com")
