"""tests/test_api_prompts.py – Prompt 管理路由单元测试"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from src.api.routes.prompts import router


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def make_app() -> FastAPI:
    app = FastAPI()
    app.include_router(router)
    return app


class MockAsyncFile:
    """轻量 aiofiles mock 对象"""

    def __init__(self, content: str = ""):
        self.content = content
        self.written = ""

    async def read(self):
        return self.content

    async def write(self, data: str):
        self.written = data

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass


@pytest.fixture
def app():
    return make_app()


# ---------------------------------------------------------------------------
# GET /api/prompts — list
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_list_prompts_success(app):
    """prompts 目录存在且有文件时返回 .txt 文件列表"""
    with (
        patch("src.api.routes.prompts.os.path.isdir", return_value=True),
        patch(
            "src.api.routes.prompts.os.listdir",
            return_value=["base.txt", "custom.txt", "notes.md"],
        ),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/prompts")
            assert resp.status_code == 200
            data = resp.json()
            assert data == ["base.txt", "custom.txt"]


@pytest.mark.anyio
async def test_list_prompts_empty_dir(app):
    """prompts 目录存在但为空时返回空列表"""
    with (
        patch("src.api.routes.prompts.os.path.isdir", return_value=True),
        patch("src.api.routes.prompts.os.listdir", return_value=[]),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/prompts")
            assert resp.status_code == 200
            assert resp.json() == []


@pytest.mark.anyio
async def test_list_prompts_dir_not_exists(app):
    """prompts 目录不存在时返回空列表"""
    with patch("src.api.routes.prompts.os.path.isdir", return_value=False):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/prompts")
            assert resp.status_code == 200
            assert resp.json() == []


# ---------------------------------------------------------------------------
# GET /api/prompts/{filename} — read
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_get_prompt_success(app):
    """正常读取 prompt 文件"""
    mock_file = MockAsyncFile(content="Hello prompt")
    with (
        patch("src.api.routes.prompts.os.path.exists", return_value=True),
        patch("src.api.routes.prompts.aiofiles.open", return_value=mock_file),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/prompts/base.txt")
            assert resp.status_code == 200
            data = resp.json()
            assert data["filename"] == "base.txt"
            assert data["content"] == "Hello prompt"


@pytest.mark.anyio
async def test_get_prompt_invalid_filename_dotdot_path(app):
    """文件名含 .. 路径穿越时返回 400"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/prompts/..etc")
        assert resp.status_code == 400


@pytest.mark.anyio
async def test_get_prompt_invalid_filename_dotdot(app):
    """文件名含 .. 时返回 400"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/prompts/..secret.txt")
        assert resp.status_code == 400


@pytest.mark.anyio
async def test_get_prompt_not_found(app):
    """文件不存在时返回 404"""
    with patch("src.api.routes.prompts.os.path.exists", return_value=False):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/prompts/missing.txt")
            assert resp.status_code == 404


# ---------------------------------------------------------------------------
# PUT /api/prompts/{filename} — update
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_update_prompt_success(app):
    """正常更新 prompt 文件"""
    mock_file = MockAsyncFile()
    with (
        patch("src.api.routes.prompts.os.path.exists", return_value=True),
        patch("src.api.routes.prompts.aiofiles.open", return_value=mock_file),
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.put(
                "/api/prompts/base.txt",
                json={"content": "new content"},
            )
            assert resp.status_code == 200
            assert "更新成功" in resp.json()["message"]
            assert mock_file.written == "new content"


@pytest.mark.anyio
async def test_update_prompt_invalid_filename(app):
    """文件名含 .. 时返回 400"""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.put(
            "/api/prompts/..bad.txt",
            json={"content": "x"},
        )
        assert resp.status_code == 400


@pytest.mark.anyio
async def test_update_prompt_not_found(app):
    """文件不存在时返回 404"""
    with patch("src.api.routes.prompts.os.path.exists", return_value=False):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.put(
                "/api/prompts/missing.txt",
                json={"content": "x"},
            )
            assert resp.status_code == 404
