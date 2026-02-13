"""后端 API 路由 favorites 的单元测试"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from src.api.routes.favorites import router


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


def _make_favorite(**overrides) -> dict:
    defaults = {
        "id": "fav-001",
        "item_id": "item-123",
        "task_id": 1,
        "item_snapshot": {"title": "MacBook Pro", "price": 8000},
        "note": "不错的价格",
        "created_at": "2025-01-01",
    }
    defaults.update(overrides)
    return defaults


# ── GET / ─────────────────────────────────────────────────


@pytest.mark.anyio
async def test_get_favorites(app):
    """获取收藏列表"""
    items = [_make_favorite(), _make_favorite(id="fav-002", item_id="item-456")]
    with patch("src.api.routes.favorites.favorite_service") as mock_svc:
        mock_svc.get_all = AsyncMock(return_value=items)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/favorites")
            assert resp.status_code == 200
            data = resp.json()
            assert data["count"] == 2
            assert len(data["items"]) == 2
            mock_svc.get_all.assert_called_once_with(task_id=None)


@pytest.mark.anyio
async def test_get_favorites_with_task_id(app):
    """按 task_id 筛选收藏"""
    items = [_make_favorite()]
    with patch("src.api.routes.favorites.favorite_service") as mock_svc:
        mock_svc.get_all = AsyncMock(return_value=items)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/favorites?task_id=1")
            assert resp.status_code == 200
            data = resp.json()
            assert data["count"] == 1
            mock_svc.get_all.assert_called_once_with(task_id=1)


# ── POST / ────────────────────────────────────────────────


@pytest.mark.anyio
async def test_create_favorite(app):
    """添加收藏"""
    fav = _make_favorite()
    with patch("src.api.routes.favorites.favorite_service") as mock_svc:
        mock_svc.create = AsyncMock(return_value=fav)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/favorites",
                json={
                    "item_id": "item-123",
                    "task_id": 1,
                    "item_snapshot": {"title": "MacBook Pro", "price": 8000},
                    "note": "不错的价格",
                },
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["message"] == "收藏成功"
            assert data["data"]["item_id"] == "item-123"
            mock_svc.create.assert_called_once_with(
                item_id="item-123",
                task_id=1,
                item_snapshot={"title": "MacBook Pro", "price": 8000},
                note="不错的价格",
            )


# ── DELETE /{fav_id} ──────────────────────────────────────


@pytest.mark.anyio
async def test_delete_favorite_success(app):
    """删除收藏成功"""
    with patch("src.api.routes.favorites.favorite_service") as mock_svc:
        mock_svc.delete = AsyncMock(return_value=True)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.delete("/api/favorites/fav-001")
            assert resp.status_code == 200
            assert resp.json()["message"] == "取消收藏成功"


@pytest.mark.anyio
async def test_delete_favorite_not_found(app):
    """删除不存在的收藏返回 404"""
    with patch("src.api.routes.favorites.favorite_service") as mock_svc:
        mock_svc.delete = AsyncMock(return_value=False)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.delete("/api/favorites/nonexistent")
            assert resp.status_code == 404


# ── POST /compare ─────────────────────────────────────────


@pytest.mark.anyio
async def test_compare_favorites_success(app):
    """对比收藏商品"""
    compare_result = {"items": [_make_favorite(), _make_favorite(id="fav-002")]}
    with patch("src.api.routes.favorites.favorite_service") as mock_svc:
        mock_svc.compare = AsyncMock(return_value=compare_result)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/favorites/compare",
                json={"ids": ["fav-001", "fav-002"]},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "items" in data
            mock_svc.compare.assert_called_once_with(["fav-001", "fav-002"])


@pytest.mark.anyio
async def test_compare_favorites_too_few_ids(app):
    """对比时提供不足 2 个 ID 返回 400"""
    with patch("src.api.routes.favorites.favorite_service") as mock_svc:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/favorites/compare",
                json={"ids": ["fav-001"]},
            )
            assert resp.status_code == 400
            assert "至少需要选择 2 个" in resp.json()["detail"]
