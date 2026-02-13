"""tests/test_api_logs.py – 日志管理路由单元测试"""
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from src.api.routes.logs import router
from src.api.dependencies import get_task_service


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def make_app(mock_task_service):
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_task_service] = lambda: mock_task_service
    return app


def _make_task(task_id: int = 1, task_name: str = "test_task"):
    """创建简易 task mock 对象"""
    task = MagicMock()
    task.task_id = task_id
    task.task_name = task_name
    return task


@pytest.fixture
def mock_task_service():
    return AsyncMock()


@pytest.fixture
def app(mock_task_service):
    return make_app(mock_task_service)


# ---------------------------------------------------------------------------
# GET /api/logs — incremental read
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_get_logs_no_task_id(app):
    """未传 task_id 时返回提示信息"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/logs")
        assert resp.status_code == 200
        data = resp.json()
        assert "请选择任务" in data["new_content"]


@pytest.mark.anyio
async def test_get_logs_task_not_found(app, mock_task_service):
    """task_id 对应任务不存在时返回 404"""
    mock_task_service.get_task.return_value = None
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/logs?task_id=999")
        assert resp.status_code == 404
        data = resp.json()
        assert "不存在" in data["new_content"]


@pytest.mark.anyio
async def test_get_logs_file_not_exists(app, mock_task_service, tmp_path):
    """日志文件不存在时返回空内容"""
    mock_task_service.get_task.return_value = _make_task()
    log_path = str(tmp_path / "nonexistent.log")

    with patch("src.api.routes.logs.resolve_task_log_path", return_value=log_path):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/logs?task_id=1")
            assert resp.status_code == 200
            data = resp.json()
            assert data["new_content"] == ""
            assert data["new_pos"] == 0


@pytest.mark.anyio
async def test_get_logs_success(app, mock_task_service, tmp_path):
    """正常读取日志内容"""
    mock_task_service.get_task.return_value = _make_task()
    log_file = tmp_path / "test.log"
    log_file.write_bytes(b"line1\nline2\n")

    with patch("src.api.routes.logs.resolve_task_log_path", return_value=str(log_file)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/logs?task_id=1&from_pos=0")
            assert resp.status_code == 200
            data = resp.json()
            assert "line1" in data["new_content"]
            assert data["new_pos"] == len(b"line1\nline2\n")


@pytest.mark.anyio
async def test_get_logs_incremental(app, mock_task_service, tmp_path):
    """增量读取：from_pos 大于等于文件大小时返回空"""
    mock_task_service.get_task.return_value = _make_task()
    log_file = tmp_path / "test.log"
    log_file.write_bytes(b"hello")

    with patch("src.api.routes.logs.resolve_task_log_path", return_value=str(log_file)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/logs?task_id=1&from_pos=5")
            assert resp.status_code == 200
            data = resp.json()
            assert data["new_content"] == ""
            assert data["new_pos"] == 5


# ---------------------------------------------------------------------------
# GET /api/logs/tail — line-based tail
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_get_logs_tail_no_task_id(app):
    """tail 接口未传 task_id 返回空"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/logs/tail")
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"] == ""
        assert data["has_more"] is False


@pytest.mark.anyio
async def test_get_logs_tail_task_not_found(app, mock_task_service):
    """tail 接口任务不存在返回 404"""
    mock_task_service.get_task.return_value = None
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/logs/tail?task_id=999")
        assert resp.status_code == 404


@pytest.mark.anyio
async def test_get_logs_tail_success(app, mock_task_service, tmp_path):
    """tail 接口正常返回尾部日志行"""
    mock_task_service.get_task.return_value = _make_task()
    log_file = tmp_path / "test.log"
    lines = "\n".join([f"line{i}" for i in range(10)]) + "\n"
    log_file.write_bytes(lines.encode("utf-8"))

    with patch("src.api.routes.logs.resolve_task_log_path", return_value=str(log_file)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/logs/tail?task_id=1&limit_lines=3")
            assert resp.status_code == 200
            data = resp.json()
            assert data["content"] != ""
            assert data["next_offset"] > 0


@pytest.mark.anyio
async def test_get_logs_tail_file_not_exists(app, mock_task_service, tmp_path):
    """tail 接口日志文件不存在返回空"""
    mock_task_service.get_task.return_value = _make_task()
    log_path = str(tmp_path / "missing.log")

    with patch("src.api.routes.logs.resolve_task_log_path", return_value=log_path):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/logs/tail?task_id=1")
            assert resp.status_code == 200
            data = resp.json()
            assert data["content"] == ""
            assert data["has_more"] is False


# ---------------------------------------------------------------------------
# DELETE /api/logs — clear
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_clear_logs_no_task_id(app):
    """清空日志未传 task_id 返回提示"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.delete("/api/logs")
        assert resp.status_code == 200
        assert "未指定任务" in resp.json()["message"]


@pytest.mark.anyio
async def test_clear_logs_task_not_found(app, mock_task_service):
    """清空日志任务不存在返回提示"""
    mock_task_service.get_task.return_value = None
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.delete("/api/logs?task_id=999")
        assert resp.status_code == 200
        assert "不存在" in resp.json()["message"]


@pytest.mark.anyio
async def test_clear_logs_success(app, mock_task_service, tmp_path):
    """正常清空日志文件"""
    mock_task_service.get_task.return_value = _make_task()
    log_file = tmp_path / "test.log"
    log_file.write_text("some logs", encoding="utf-8")

    with patch("src.api.routes.logs.resolve_task_log_path", return_value=str(log_file)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.delete("/api/logs?task_id=1")
            assert resp.status_code == 200
            assert "清空" in resp.json()["message"]
            # 验证文件确实被清空
            assert log_file.read_text(encoding="utf-8") == ""


@pytest.mark.anyio
async def test_clear_logs_file_not_exists(app, mock_task_service, tmp_path):
    """清空日志文件不存在返回提示"""
    mock_task_service.get_task.return_value = _make_task()
    log_path = str(tmp_path / "missing.log")

    with patch("src.api.routes.logs.resolve_task_log_path", return_value=log_path):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.delete("/api/logs?task_id=1")
            assert resp.status_code == 200
            assert "不存在" in resp.json()["message"]
