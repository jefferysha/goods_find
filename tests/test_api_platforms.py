"""后端 API 路由 platforms 的单元测试"""
import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from src.api.routes.platforms import router
from src.domain.models.platform import PlatformInfo


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


def _make_platform(id: str, name: str, enabled: bool = True) -> PlatformInfo:
    return PlatformInfo(
        id=id,
        name=name,
        icon=id,
        color="#FF6600",
        enabled=enabled,
        description=f"{name} 平台",
    )


# ── GET / ─────────────────────────────────────────────────


@pytest.mark.anyio
async def test_list_all_platforms(app):
    """获取所有平台信息"""
    platforms = [
        _make_platform("xianyu", "闲鱼", enabled=True),
        _make_platform("zhuanzhuan", "转转", enabled=False),
    ]
    with patch("src.api.routes.platforms.get_all_platforms", return_value=platforms):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/platforms")
            assert resp.status_code == 200
            data = resp.json()
            assert len(data) == 2
            assert data[0]["id"] == "xianyu"
            assert data[1]["enabled"] is False


# ── GET /enabled ──────────────────────────────────────────


@pytest.mark.anyio
async def test_list_enabled_platforms(app):
    """获取已启用平台"""
    platforms = [_make_platform("xianyu", "闲鱼", enabled=True)]
    with patch(
        "src.api.routes.platforms.get_enabled_platforms", return_value=platforms
    ):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/platforms/enabled")
            assert resp.status_code == 200
            data = resp.json()
            assert len(data) == 1
            assert data[0]["enabled"] is True


@pytest.mark.anyio
async def test_list_enabled_platforms_empty(app):
    """无启用平台时返回空列表"""
    with patch("src.api.routes.platforms.get_enabled_platforms", return_value=[]):
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/platforms/enabled")
            assert resp.status_code == 200
            data = resp.json()
            assert data == []
