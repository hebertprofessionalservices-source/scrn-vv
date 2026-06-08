import json
from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def fixtures_dir() -> Path:
    return FIXTURES_DIR


@pytest.fixture
def load_fixture(fixtures_dir):
    def _load(name: str) -> str:
        return (fixtures_dir / name).read_text(encoding="utf-8")
    return _load


@pytest.fixture
def load_json_fixture(fixtures_dir):
    def _load(name: str) -> dict:
        return json.loads((fixtures_dir / name).read_text(encoding="utf-8"))
    return _load
