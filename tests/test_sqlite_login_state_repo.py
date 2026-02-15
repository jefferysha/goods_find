"""TDD: SQLite 版 LoginState 仓储测试（统一管理登录状态和账号状态）"""
import pytest
import os
import json

TEST_DB_PATH = "data/test_login_state.db"


@pytest.fixture(autouse=True)
def clean_test_db():
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    yield
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


def _make_repo():
    from src.infrastructure.persistence.sqlite_login_state_repository import SqliteLoginStateRepository
    return SqliteLoginStateRepository(db_path=TEST_DB_PATH)


SAMPLE_STATE = json.dumps({"cookies": [{"name": "test", "value": "123"}]})


# ─── SAVE + GET ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_save_and_get_state():
    repo = _make_repo()
    await repo.save("xianyu_default", SAMPLE_STATE)
    result = await repo.get("xianyu_default")
    assert result is not None
    assert json.loads(result)["cookies"][0]["name"] == "test"


@pytest.mark.asyncio
async def test_get_nonexistent_returns_none():
    repo = _make_repo()
    result = await repo.get("nonexistent")
    assert result is None


@pytest.mark.asyncio
async def test_save_overwrites_existing():
    repo = _make_repo()
    await repo.save("account_a", '{"v":1}')
    await repo.save("account_a", '{"v":2}')
    result = await repo.get("account_a")
    assert json.loads(result)["v"] == 2


# ─── LIST ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_all_accounts():
    repo = _make_repo()
    await repo.save("account_a", '{"a":1}')
    await repo.save("account_b", '{"b":2}')
    await repo.save("xianyu_default", SAMPLE_STATE)
    accounts = await repo.list_all()
    assert len(accounts) == 3
    names = [a["name"] for a in accounts]
    assert "account_a" in names
    assert "account_b" in names
    assert "xianyu_default" in names


@pytest.mark.asyncio
async def test_list_empty():
    repo = _make_repo()
    accounts = await repo.list_all()
    assert accounts == []


# ─── DELETE ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_existing():
    repo = _make_repo()
    await repo.save("account_a", '{"a":1}')
    success = await repo.delete("account_a")
    assert success is True
    result = await repo.get("account_a")
    assert result is None


@pytest.mark.asyncio
async def test_delete_nonexistent():
    repo = _make_repo()
    success = await repo.delete("ghost")
    assert success is False
