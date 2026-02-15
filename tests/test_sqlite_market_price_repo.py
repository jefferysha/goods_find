"""TDD: SQLite 版 MarketPrice 仓储测试"""
import pytest
import os
import asyncio
from src.domain.models.market_price import MarketPrice

# 使用临时数据库
TEST_DB_PATH = "data/test_market_price.db"


@pytest.fixture(autouse=True)
def clean_test_db():
    """每个测试前后清理测试数据库"""
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    yield
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


def _make_repo():
    """创建使用测试数据库的仓储实例"""
    from src.infrastructure.persistence.sqlite_market_price_repository import SqliteMarketPriceRepository
    return SqliteMarketPriceRepository(db_path=TEST_DB_PATH)


def _sample_price(**overrides) -> MarketPrice:
    defaults = dict(
        task_id=1,
        keyword="科比手办",
        reference_price=200.0,
        fair_used_price=150.0,
        condition="good",
        category="手办",
        platform="xianyu",
        source="京东",
        note="测试",
    )
    defaults.update(overrides)
    return MarketPrice(**defaults)


# ─── CREATE ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_returns_market_price():
    repo = _make_repo()
    price = _sample_price()
    created = await repo.create(price)
    assert created.id == price.id
    assert created.keyword == "科比手办"
    assert created.reference_price == 200.0


# ─── GET BY ID ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_by_id_returns_existing():
    repo = _make_repo()
    price = _sample_price()
    await repo.create(price)
    found = await repo.get_by_id(price.id)
    assert found is not None
    assert found.id == price.id
    assert found.keyword == "科比手办"


@pytest.mark.asyncio
async def test_get_by_id_returns_none_for_missing():
    repo = _make_repo()
    found = await repo.get_by_id("nonexistent-id")
    assert found is None


# ─── GET BY TASK ID ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_by_task_id_filters_correctly():
    repo = _make_repo()
    await repo.create(_sample_price(task_id=1, keyword="A"))
    await repo.create(_sample_price(task_id=1, keyword="B"))
    await repo.create(_sample_price(task_id=2, keyword="C"))

    task1 = await repo.get_by_task_id(1)
    assert len(task1) == 2
    task2 = await repo.get_by_task_id(2)
    assert len(task2) == 1
    assert task2[0].keyword == "C"


# ─── GET ALL ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_all_returns_all():
    repo = _make_repo()
    await repo.create(_sample_price(keyword="A"))
    await repo.create(_sample_price(keyword="B"))
    all_prices = await repo.get_all()
    assert len(all_prices) == 2


@pytest.mark.asyncio
async def test_get_all_empty():
    repo = _make_repo()
    all_prices = await repo.get_all()
    assert all_prices == []


# ─── UPDATE ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_modifies_fields():
    repo = _make_repo()
    price = _sample_price()
    await repo.create(price)
    updated = await repo.update(price.id, {"reference_price": 300.0, "note": "已更新"})
    assert updated is not None
    assert updated.reference_price == 300.0
    assert updated.note == "已更新"
    # 其他字段不变
    assert updated.keyword == "科比手办"


@pytest.mark.asyncio
async def test_update_nonexistent_returns_none():
    repo = _make_repo()
    result = await repo.update("nonexistent", {"reference_price": 100.0})
    assert result is None


# ─── DELETE ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_removes_record():
    repo = _make_repo()
    price = _sample_price()
    await repo.create(price)
    success = await repo.delete(price.id)
    assert success is True
    found = await repo.get_by_id(price.id)
    assert found is None


@pytest.mark.asyncio
async def test_delete_nonexistent_returns_false():
    repo = _make_repo()
    success = await repo.delete("nonexistent")
    assert success is False
