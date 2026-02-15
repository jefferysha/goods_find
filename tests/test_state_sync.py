"""TDD: 数据库登录状态同步到文件系统（给 Playwright 爬虫用）"""
import pytest
import os
import json
import tempfile

TEST_DB_PATH = "data/test_state_sync.db"


@pytest.fixture(autouse=True)
def clean_test_files():
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    yield
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)


def _make_repo():
    from src.infrastructure.persistence.sqlite_login_state_repository import SqliteLoginStateRepository
    return SqliteLoginStateRepository(db_path=TEST_DB_PATH)


SAMPLE_STATE = json.dumps({"cookies": [{"name": "sid", "value": "abc123"}]})


@pytest.mark.asyncio
async def test_export_to_file_creates_file():
    """export_to_file 应该把数据库中的 state 导出到指定文件路径"""
    repo = _make_repo()
    await repo.save("xianyu_default", SAMPLE_STATE)

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
        out_path = f.name

    try:
        result = await repo.export_to_file("xianyu_default", out_path)
        assert result is True
        assert os.path.exists(out_path)
        with open(out_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        assert data["cookies"][0]["name"] == "sid"
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)


@pytest.mark.asyncio
async def test_export_to_file_returns_false_if_not_found():
    repo = _make_repo()
    result = await repo.export_to_file("nonexistent", "/tmp/test_no_state.json")
    assert result is False
    assert not os.path.exists("/tmp/test_no_state.json")


@pytest.mark.asyncio
async def test_sync_all_to_dir_creates_files():
    """sync_all_to_dir 应该把所有 state 导出到指定目录"""
    repo = _make_repo()
    await repo.save("account_a", '{"a":1}')
    await repo.save("account_b", '{"b":2}')

    with tempfile.TemporaryDirectory() as tmpdir:
        count = await repo.sync_all_to_dir(tmpdir)
        assert count == 2
        assert os.path.exists(os.path.join(tmpdir, "account_a.json"))
        assert os.path.exists(os.path.join(tmpdir, "account_b.json"))
        with open(os.path.join(tmpdir, "account_a.json"), "r") as f:
            assert json.load(f)["a"] == 1


@pytest.mark.asyncio
async def test_sync_all_to_dir_empty_db():
    repo = _make_repo()
    with tempfile.TemporaryDirectory() as tmpdir:
        count = await repo.sync_all_to_dir(tmpdir)
        assert count == 0
