"""
测试 WebSocket 新商品事件推送 API
"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from src.api.routes.websocket import router, NewItemEvent


@pytest.fixture()
def ws_app():
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.mark.anyio
async def test_new_item_event_broadcasts(ws_app):
    """POST /api/internal/new-item-event 应广播消息"""
    payload = {
        "task_name": "MacBook",
        "keyword": "macbook",
        "item_id": "123456",
        "title": "MacBook Air M1 95新",
        "price": 3500.0,
        "image_url": "https://example.com/img.jpg",
        "item_link": "https://example.com/item/123456",
        "seller_name": "张三",
        "is_recommended": True,
        "ai_reason": "价格低于行情",
        "instant_notify": False,
    }

    with patch("src.api.routes.websocket.broadcast_message", new_callable=AsyncMock) as mock_broadcast:
        async with AsyncClient(
            transport=ASGITransport(app=ws_app),
            base_url="http://test",
        ) as client:
            resp = await client.post("/api/internal/new-item-event", json=payload)

        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
        mock_broadcast.assert_called_once()
        call_args = mock_broadcast.call_args
        assert call_args[0][0] == "new_item_discovered"
        data = call_args[0][1]
        assert data["item_id"] == "123456"
        assert data["title"] == "MacBook Air M1 95新"
        assert data["price"] == 3500.0


@pytest.mark.anyio
async def test_new_item_event_minimal_fields(ws_app):
    """只填必填字段也应该正常工作"""
    payload = {
        "task_name": "Test",
        "keyword": "test",
        "item_id": "999",
        "title": "Test Item",
    }

    with patch("src.api.routes.websocket.broadcast_message", new_callable=AsyncMock) as mock_broadcast:
        async with AsyncClient(
            transport=ASGITransport(app=ws_app),
            base_url="http://test",
        ) as client:
            resp = await client.post("/api/internal/new-item-event", json=payload)

        assert resp.status_code == 200
        mock_broadcast.assert_called_once()


@pytest.mark.anyio
async def test_new_item_event_missing_required_fields(ws_app):
    """缺少必填字段应返回 422"""
    payload = {"task_name": "Test"}  # 缺少 keyword, item_id, title

    async with AsyncClient(
        transport=ASGITransport(app=ws_app),
        base_url="http://test",
    ) as client:
        resp = await client.post("/api/internal/new-item-event", json=payload)

    assert resp.status_code == 422


class TestNewItemEventModel:
    """NewItemEvent 模型测试"""

    def test_full_payload(self):
        event = NewItemEvent(
            task_name="MacBook",
            keyword="macbook",
            item_id="123",
            title="MacBook Air",
            price=3500.0,
            is_recommended=True,
            ai_reason="好价",
            instant_notify=True,
        )
        assert event.task_name == "MacBook"
        assert event.instant_notify is True

    def test_defaults(self):
        event = NewItemEvent(
            task_name="Test",
            keyword="test",
            item_id="1",
            title="Item",
        )
        assert event.price is None
        assert event.is_recommended is None
        assert event.instant_notify is False
