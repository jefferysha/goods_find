"""tests/test_api_accounts_routes.py – 账号管理路由单元测试"""
import json
import os
import pytest
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from src.api.routes.accounts import router


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def make_app() -> FastAPI:
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture
def app():
    return make_app()


@pytest.fixture
def state_dir(tmp_path):
    """使用 tmp_path 作为账号状态目录"""
    return tmp_path


# ---------------------------------------------------------------------------
# GET /api/accounts — list
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_list_accounts_empty(app, state_dir):
    """空目录返回空列表"""
    with patch("src.api.routes.accounts._state_dir", return_value=str(state_dir)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/accounts")
            assert resp.status_code == 200
            assert resp.json() == []


@pytest.mark.anyio
async def test_list_accounts_with_files(app, state_dir):
    """目录中有 .json 文件时返回账号列表"""
    (state_dir / "alice.json").write_text("{}", encoding="utf-8")
    (state_dir / "bob.json").write_text("{}", encoding="utf-8")
    (state_dir / "readme.txt").write_text("ignore me", encoding="utf-8")

    with patch("src.api.routes.accounts._state_dir", return_value=str(state_dir)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/accounts")
            assert resp.status_code == 200
            data = resp.json()
            names = [a["name"] for a in data]
            assert "alice" in names
            assert "bob" in names
            assert len(data) == 2


@pytest.mark.anyio
async def test_list_accounts_dir_not_exists(app, tmp_path):
    """目录不存在返回空列表"""
    missing = str(tmp_path / "no_such_dir")
    with patch("src.api.routes.accounts._state_dir", return_value=missing):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/accounts")
            assert resp.status_code == 200
            assert resp.json() == []


# ---------------------------------------------------------------------------
# GET /api/accounts/{name} — read
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_get_account_success(app, state_dir):
    """正常读取账号"""
    content = json.dumps({"cookie": "abc"})
    (state_dir / "alice.json").write_text(content, encoding="utf-8")

    with patch("src.api.routes.accounts._state_dir", return_value=str(state_dir)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/accounts/alice")
            assert resp.status_code == 200
            data = resp.json()
            assert data["name"] == "alice"
            assert data["content"] == content


@pytest.mark.anyio
async def test_get_account_not_found(app, state_dir):
    """账号不存在返回 404"""
    with patch("src.api.routes.accounts._state_dir", return_value=str(state_dir)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/accounts/missing")
            assert resp.status_code == 404


@pytest.mark.anyio
async def test_get_account_invalid_name(app, state_dir):
    """非法账号名返回 400"""
    with patch("src.api.routes.accounts._state_dir", return_value=str(state_dir)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/accounts/bad%20name!")
            assert resp.status_code == 400


# ---------------------------------------------------------------------------
# POST /api/accounts — create
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_create_account_success(app, state_dir):
    """正常创建账号"""
    with patch("src.api.routes.accounts._state_dir", return_value=str(state_dir)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/accounts",
                json={"name": "newuser", "content": '{"token": "xyz"}'},
            )
            assert resp.status_code == 200
            assert resp.json()["name"] == "newuser"
            # 确认文件确实写入
            assert (state_dir / "newuser.json").exists()
            assert (state_dir / "newuser.json").read_text(encoding="utf-8") == '{"token": "xyz"}'


@pytest.mark.anyio
async def test_create_account_duplicate(app, state_dir):
    """重复创建同名账号返回 409"""
    (state_dir / "existing.json").write_text("{}", encoding="utf-8")

    with patch("src.api.routes.accounts._state_dir", return_value=str(state_dir)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/accounts",
                json={"name": "existing", "content": "{}"},
            )
            assert resp.status_code == 409


@pytest.mark.anyio
async def test_create_account_invalid_json(app, state_dir):
    """内容不是有效 JSON 返回 400"""
    with patch("src.api.routes.accounts._state_dir", return_value=str(state_dir)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/accounts",
                json={"name": "badcontent", "content": "not json {{{"},
            )
            assert resp.status_code == 400


@pytest.mark.anyio
async def test_create_account_invalid_name(app, state_dir):
    """非法账号名返回 400"""
    with patch("src.api.routes.accounts._state_dir", return_value=str(state_dir)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/accounts",
                json={"name": "bad name!", "content": "{}"},
            )
            assert resp.status_code == 400


# ---------------------------------------------------------------------------
# PUT /api/accounts/{name} — update
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_update_account_success(app, state_dir):
    """正常更新账号"""
    (state_dir / "alice.json").write_text("{}", encoding="utf-8")
    new_content = json.dumps({"cookie": "updated"})

    with patch("src.api.routes.accounts._state_dir", return_value=str(state_dir)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.put(
                "/api/accounts/alice",
                json={"content": new_content},
            )
            assert resp.status_code == 200
            assert "更新" in resp.json()["message"]
            assert (state_dir / "alice.json").read_text(encoding="utf-8") == new_content


@pytest.mark.anyio
async def test_update_account_not_found(app, state_dir):
    """更新不存在的账号返回 404"""
    with patch("src.api.routes.accounts._state_dir", return_value=str(state_dir)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.put(
                "/api/accounts/missing",
                json={"content": "{}"},
            )
            assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/accounts/{name} — delete
# ---------------------------------------------------------------------------

@pytest.mark.anyio
async def test_delete_account_success(app, state_dir):
    """正常删除账号"""
    (state_dir / "alice.json").write_text("{}", encoding="utf-8")

    with patch("src.api.routes.accounts._state_dir", return_value=str(state_dir)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.delete("/api/accounts/alice")
            assert resp.status_code == 200
            assert "删除" in resp.json()["message"]
            assert not (state_dir / "alice.json").exists()


@pytest.mark.anyio
async def test_delete_account_not_found(app, state_dir):
    """删除不存在的账号返回 404"""
    with patch("src.api.routes.accounts._state_dir", return_value=str(state_dir)):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.delete("/api/accounts/missing")
            assert resp.status_code == 404
