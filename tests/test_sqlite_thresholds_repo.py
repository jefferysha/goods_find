"""TDD: SQLite 版 PricingThresholds 仓储测试"""
import pytest
import os

TEST_DB_PATH = "data/test_thresholds.db"


@pytest.fixture(autouse=True)
def clean_test_db():
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    yield
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


def _make_repo():
    from src.infrastructure.persistence.sqlite_thresholds_repository import SqliteThresholdsRepository
    return SqliteThresholdsRepository(db_path=TEST_DB_PATH)


# ─── GET (empty) ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_returns_default_when_empty():
    repo = _make_repo()
    result = await repo.get(task_id=None)
    # 应返回默认阈值
    assert result["low_price_max"] == -15.0
    assert result["fair_max"] == 5.0
    assert result["slight_premium_max"] == 20.0


# ─── UPSERT + GET ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upsert_creates_then_get_returns_it():
    repo = _make_repo()
    data = {"task_id": None, "low_price_max": -10.0, "fair_max": 8.0, "slight_premium_max": 25.0}
    await repo.upsert(data)
    result = await repo.get(task_id=None)
    assert result["low_price_max"] == -10.0
    assert result["fair_max"] == 8.0
    assert result["slight_premium_max"] == 25.0


@pytest.mark.asyncio
async def test_upsert_updates_existing():
    repo = _make_repo()
    await repo.upsert({"task_id": 1, "low_price_max": -10.0, "fair_max": 5.0, "slight_premium_max": 20.0})
    await repo.upsert({"task_id": 1, "low_price_max": -20.0, "fair_max": 10.0, "slight_premium_max": 30.0})
    result = await repo.get(task_id=1)
    assert result["low_price_max"] == -20.0
    assert result["fair_max"] == 10.0


@pytest.mark.asyncio
async def test_get_task_specific_falls_back_to_global():
    repo = _make_repo()
    # 只设全局
    await repo.upsert({"task_id": None, "low_price_max": -12.0, "fair_max": 6.0, "slight_premium_max": 22.0})
    # 查 task_id=99，应返回全局
    result = await repo.get(task_id=99)
    assert result["low_price_max"] == -12.0


@pytest.mark.asyncio
async def test_get_task_specific_prefers_task_over_global():
    repo = _make_repo()
    await repo.upsert({"task_id": None, "low_price_max": -12.0, "fair_max": 6.0, "slight_premium_max": 22.0})
    await repo.upsert({"task_id": 5, "low_price_max": -5.0, "fair_max": 3.0, "slight_premium_max": 15.0})
    result = await repo.get(task_id=5)
    assert result["low_price_max"] == -5.0
    assert result["task_id"] == 5
