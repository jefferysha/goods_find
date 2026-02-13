"""后端 API 路由 history 的单元测试"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from src.api.routes.history import router


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


def _make_history_entry(price: float, crawl_time: str) -> dict:
    return {"price": price, "crawl_time": crawl_time}


# ── GET /{item_id} ────────────────────────────────────────


@pytest.mark.anyio
async def test_get_item_history(app):
    """获取商品价格历史"""
    history = [
        _make_history_entry(100.0, "2025-01-01"),
        _make_history_entry(95.0, "2025-01-02"),
    ]
    with patch("src.api.routes.history.item_repo") as mock_repo:
        mock_repo.get_item_price_history = AsyncMock(return_value=history)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/history/item-123?limit=50")
            assert resp.status_code == 200
            data = resp.json()
            assert data["item_id"] == "item-123"
            assert data["count"] == 2
            assert len(data["history"]) == 2
            mock_repo.get_item_price_history.assert_called_once_with(
                "item-123", limit=50
            )


@pytest.mark.anyio
async def test_get_item_history_empty(app):
    """商品无历史数据时返回空列表"""
    with patch("src.api.routes.history.item_repo") as mock_repo:
        mock_repo.get_item_price_history = AsyncMock(return_value=[])
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/history/item-999")
            assert resp.status_code == 200
            data = resp.json()
            assert data["count"] == 0
            assert data["history"] == []


# ── GET /{item_id}/price-drop ─────────────────────────────


@pytest.mark.anyio
async def test_price_drop_detected(app):
    """检测到降价"""
    # 仓储返回正序（旧→新），路由内会 reverse 为倒序
    history = [
        _make_history_entry(100.0, "2025-01-01"),
        _make_history_entry(80.0, "2025-01-02"),
    ]
    with patch("src.api.routes.history.item_repo") as mock_repo:
        mock_repo.get_item_price_history = AsyncMock(return_value=history)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/history/item-123/price-drop")
            assert resp.status_code == 200
            data = resp.json()
            assert data["dropped"] is True
            assert data["current_price"] == 80.0
            assert data["previous_price"] == 100.0
            assert data["drop_amount"] == 20.0
            assert data["drop_rate"] == 20.0


@pytest.mark.anyio
async def test_no_price_drop(app):
    """价格未降"""
    history = [
        _make_history_entry(80.0, "2025-01-01"),
        _make_history_entry(100.0, "2025-01-02"),
    ]
    with patch("src.api.routes.history.item_repo") as mock_repo:
        mock_repo.get_item_price_history = AsyncMock(return_value=history)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/history/item-123/price-drop")
            assert resp.status_code == 200
            data = resp.json()
            assert data["dropped"] is False


@pytest.mark.anyio
async def test_price_drop_insufficient_data(app):
    """数据不足（少于 2 条）时不判定降价"""
    history = [_make_history_entry(100.0, "2025-01-01")]
    with patch("src.api.routes.history.item_repo") as mock_repo:
        mock_repo.get_item_price_history = AsyncMock(return_value=history)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.get("/api/history/item-123/price-drop")
            assert resp.status_code == 200
            data = resp.json()
            assert data["dropped"] is False


# ── POST /batch ───────────────────────────────────────────


@pytest.mark.anyio
async def test_batch_history_success(app):
    """批量获取价格历史"""
    batch_result = {
        "item-1": [_make_history_entry(100.0, "2025-01-01")],
        "item-2": [_make_history_entry(200.0, "2025-01-01")],
    }
    with patch("src.api.routes.history.item_repo") as mock_repo:
        mock_repo.get_batch_price_history = AsyncMock(return_value=batch_result)
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/history/batch",
                json={"item_ids": ["item-1", "item-2"], "limit_per_item": 50},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert "item-1" in data
            assert "item-2" in data
            mock_repo.get_batch_price_history.assert_called_once_with(
                ["item-1", "item-2"], limit_per_item=50
            )


@pytest.mark.anyio
async def test_batch_history_empty_ids(app):
    """批量查询空 item_ids 返回 400"""
    with patch("src.api.routes.history.item_repo") as mock_repo:
        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            resp = await client.post(
                "/api/history/batch",
                json={"item_ids": []},
            )
            assert resp.status_code == 400
            assert "不能为空" in resp.json()["detail"]
