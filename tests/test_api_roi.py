"""
TDD: ROI 分析 API 测试
"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
import src.api.routes.profit as profit_module


@pytest.fixture()
def profit_app():
    app = FastAPI()
    app.include_router(profit_module.router)
    return app


@pytest.mark.anyio
async def test_roi_overview(profit_app):
    """GET /api/profit/roi-overview 应返回 ROI 概览"""
    with patch.object(profit_module, "service") as mock_svc, \
         patch.object(profit_module, "roi_service") as mock_roi:
        mock_svc.get_summary = AsyncMock(return_value={
            "sold_count": 10, "total_revenue": 50000,
            "total_cost": 35000, "total_profit": 15000,
        })
        mock_svc.get_profit_by_keyword = AsyncMock(return_value=[
            {"keyword": "macbook", "sold_count": 5, "revenue": 30000,
             "cost": 20000, "profit": 10000, "avg_profit_rate": 50},
        ])
        mock_roi.aggregate_roi.return_value = {
            "total_cost": 35000, "total_revenue": 50000,
            "total_profit": 15000, "overall_roi": 42.86,
            "avg_holding_days": 8.0, "count": 10,
        }
        mock_roi.rank_by_roi.return_value = [
            {"keyword": "macbook", "total_cost": 20000, "total_profit": 10000, "roi": 50.0},
        ]

        async with AsyncClient(
            transport=ASGITransport(app=profit_app),
            base_url="http://test",
        ) as client:
            resp = await client.get("/api/profit/roi-overview")

    assert resp.status_code == 200
    data = resp.json()
    assert "overall_roi" in data
    assert "keyword_ranking" in data


@pytest.mark.anyio
async def test_roi_by_item(profit_app):
    """GET /api/profit/roi-item/{item_id} 应返回单品 ROI"""
    mock_item = {
        "id": "inv-1", "purchase_price": 3000, "total_cost": 3200,
        "sold_price": 4000, "status": "sold", "age_days": 10,
        "listing_price": None,
    }

    with patch.object(profit_module, "inventory_service") as mock_inv, \
         patch.object(profit_module, "roi_service") as mock_roi:
        mock_inv.get_by_id = AsyncMock(return_value=mock_item)
        mock_roi.analyze_single_item.return_value = {
            "purchase_price": 3000, "total_cost": 3200,
            "effective_price": 4000, "profit": 800, "roi": 25.0,
            "daily_roi": 2.5, "annualized_roi": 912.5,
            "holding_days": 10, "estimated": False,
        }

        async with AsyncClient(
            transport=ASGITransport(app=profit_app),
            base_url="http://test",
        ) as client:
            resp = await client.get("/api/profit/roi-item/inv-1")

    assert resp.status_code == 200
    data = resp.json()
    assert data["roi"] == 25.0
    assert data["profit"] == 800


@pytest.mark.anyio
async def test_roi_item_not_found(profit_app):
    """库存项不存在时应返回 404"""
    with patch.object(profit_module, "inventory_service") as mock_inv:
        mock_inv.get_by_id = AsyncMock(return_value=None)

        async with AsyncClient(
            transport=ASGITransport(app=profit_app),
            base_url="http://test",
        ) as client:
            resp = await client.get("/api/profit/roi-item/nonexistent")

    assert resp.status_code == 404
