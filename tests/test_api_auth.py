"""后端 API 路由 auth 的单元测试"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from src.api.routes.auth import router
from src.api.auth_middleware import get_current_user
from src.domain.models.user import UserInfo, TokenResponse


def make_app():
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture
def app():
    return make_app()


@pytest.fixture
def anyio_backend():
    return "asyncio"


FAKE_USER = UserInfo(
    id=1,
    username="testuser",
    display_name="Test User",
    is_active=True,
    created_at="2025-01-01T00:00:00",
)

FAKE_TOKEN_RESPONSE = {
    "access_token": "fake-jwt-token",
    "token_type": "bearer",
    "expires_in": 604800,
    "user": FAKE_USER.model_dump(),
}


# ── Register ──────────────────────────────────────────────


@pytest.mark.anyio
async def test_register_success(app):
    """注册成功"""
    with patch("src.api.routes.auth.auth_service", new_callable=AsyncMock) as mock_svc:
        mock_svc.register.return_value = TokenResponse(**FAKE_TOKEN_RESPONSE)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/auth/register",
                json={
                    "username": "newuser",
                    "password": "password123",
                    "display_name": "New User",
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["access_token"] == "fake-jwt-token"
            assert data["user"]["username"] == "testuser"
            mock_svc.register.assert_called_once()


@pytest.mark.anyio
async def test_register_duplicate_username(app):
    """注册时用户名重复返回 400"""
    with patch("src.api.routes.auth.auth_service", new_callable=AsyncMock) as mock_svc:
        mock_svc.register.side_effect = ValueError("用户名已存在")
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/auth/register",
                json={
                    "username": "existing",
                    "password": "password123",
                },
            )
            assert resp.status_code == 400
            assert "用户名已存在" in resp.json()["detail"]


# ── Login ─────────────────────────────────────────────────


@pytest.mark.anyio
async def test_login_success(app):
    """登录成功"""
    with patch("src.api.routes.auth.auth_service", new_callable=AsyncMock) as mock_svc:
        mock_svc.login.return_value = TokenResponse(**FAKE_TOKEN_RESPONSE)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/auth/login",
                json={"username": "testuser", "password": "password123"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["access_token"] == "fake-jwt-token"
            assert data["token_type"] == "bearer"
            mock_svc.login.assert_called_once_with("testuser", "password123")


@pytest.mark.anyio
async def test_login_wrong_password(app):
    """登录密码错误返回 401"""
    with patch("src.api.routes.auth.auth_service", new_callable=AsyncMock) as mock_svc:
        mock_svc.login.side_effect = ValueError("用户名或密码错误")
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/auth/login",
                json={"username": "testuser", "password": "wrong"},
            )
            assert resp.status_code == 401
            assert "用户名或密码错误" in resp.json()["detail"]


# ── Get Me ────────────────────────────────────────────────


@pytest.mark.anyio
async def test_get_me(app):
    """获取当前用户信息"""
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/auth/me")
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "testuser"
        assert data["display_name"] == "Test User"
        assert data["is_active"] is True
    app.dependency_overrides.clear()


# ── Change Password ───────────────────────────────────────


@pytest.mark.anyio
async def test_change_password_success(app):
    """修改密码成功"""
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    with patch("src.api.routes.auth.auth_service", new_callable=AsyncMock) as mock_svc:
        mock_svc.change_password.return_value = None
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/auth/change-password",
                json={"old_password": "old123", "new_password": "new123456"},
            )
            assert resp.status_code == 200
            assert resp.json()["message"] == "密码修改成功"
            mock_svc.change_password.assert_called_once_with(1, "old123", "new123456")
    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_change_password_wrong_old(app):
    """修改密码时旧密码错误返回 400"""
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    with patch("src.api.routes.auth.auth_service", new_callable=AsyncMock) as mock_svc:
        mock_svc.change_password.side_effect = ValueError("旧密码不正确")
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/auth/change-password",
                json={"old_password": "wrong", "new_password": "new123456"},
            )
            assert resp.status_code == 400
            assert "旧密码不正确" in resp.json()["detail"]
    app.dependency_overrides.clear()


# ── Check Auth ────────────────────────────────────────────


@pytest.mark.anyio
async def test_check_auth(app):
    """检查 Token 有效性"""
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/auth/check")
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is True
        assert data["username"] == "testuser"
    app.dependency_overrides.clear()
