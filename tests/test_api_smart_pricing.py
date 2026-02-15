"""
TDD: 智能定价建议 API 测试
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
import src.api.routes.inventory as inv_module


@pytest.fixture()
def inv_app():
    app = FastAPI()
    app.include_router(inv_module.router)
    return app


@pytest.mark.anyio
async def test_get_pricing_suggestion(inv_app):
    """GET /api/inventory/{item_id}/pricing-suggestion 应返回定价建议"""
    mock_item = {
        "id": "inv-1",
        "title": "MacBook Air M1",
        "keyword": "macbook",
        "total_cost": 3000,
        "status": "in_stock",
    }

    with patch.object(inv_module, "service") as mock_svc, \
         patch.object(inv_module, "item_repo") as mock_repo, \
         patch.object(inv_module, "smart_pricing_service") as mock_pricing:

        mock_svc.get_by_id = AsyncMock(return_value=mock_item)
        mock_repo.get_similar_prices = AsyncMock(return_value=[3200, 3500, 3800, 3300, 3600])
        mock_pricing.calculate_suggested_prices.return_value = {
            "quick_sell_price": 3150,
            "max_profit_price": 3675,
            "median_price": 3500,
            "min_price": 3200,
            "max_price": 3800,
            "sample_count": 5,
            "estimated_profit_quick": 150,
            "estimated_profit_max": 675,
        }

        async with AsyncClient(
            transport=ASGITransport(app=inv_app),
            base_url="http://test",
        ) as client:
            resp = await client.get("/api/inventory/inv-1/pricing-suggestion?condition=good")

        assert resp.status_code == 200
        data = resp.json()
        assert "quick_sell_price" in data
        assert "max_profit_price" in data
        assert data["quick_sell_price"] == 3150


@pytest.mark.anyio
async def test_get_pricing_suggestion_item_not_found(inv_app):
    """库存项不存在时应返回 404"""
    with patch.object(inv_module, "service") as mock_svc:
        mock_svc.get_by_id = AsyncMock(return_value=None)

        async with AsyncClient(
            transport=ASGITransport(app=inv_app),
            base_url="http://test",
        ) as client:
            resp = await client.get("/api/inventory/nonexistent/pricing-suggestion?condition=good")

        assert resp.status_code == 404
