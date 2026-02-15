"""
TDD: AI 议价话术 API 测试
"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
import src.api.routes.bargain as bargain_module


@pytest.fixture()
def bargain_app():
    app = FastAPI()
    app.include_router(bargain_module.router)
    return app


@pytest.mark.anyio
async def test_generate_bargain_scripts(bargain_app):
    """POST /api/bargain/generate 应返回议价话术"""
    mock_result = {
        "scripts": [
            {
                "opening": "您好，能否优惠到3000？",
                "reasoning": "同类行情价3000左右",
                "follow_up": "诚意要，马上付款",
            }
        ]
    }

    with patch.object(bargain_module, "bargain_service") as mock_svc:
        mock_svc.generate_bargain_scripts = AsyncMock(return_value=mock_result)

        async with AsyncClient(
            transport=ASGITransport(app=bargain_app),
            base_url="http://test",
        ) as client:
            resp = await client.post("/api/bargain/generate", json={
                "item_info": {"title": "MacBook", "price": 3500},
                "target_price": 3000,
                "strategy": "gentle",
            })

    assert resp.status_code == 200
    data = resp.json()
    assert "scripts" in data
    assert len(data["scripts"]) == 1


@pytest.mark.anyio
async def test_list_strategies(bargain_app):
    """GET /api/bargain/strategies 应返回策略列表"""
    with patch.object(bargain_module, "bargain_service") as mock_svc:
        mock_svc.get_available_strategies.return_value = [
            {"id": "gentle", "name": "温和型", "description": "友好协商"},
        ]

        async with AsyncClient(
            transport=ASGITransport(app=bargain_app),
            base_url="http://test",
        ) as client:
            resp = await client.get("/api/bargain/strategies")

    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.anyio
async def test_generate_missing_fields(bargain_app):
    """缺少必填字段应返回 422"""
    with patch.object(bargain_module, "bargain_service"):
        async with AsyncClient(
            transport=ASGITransport(app=bargain_app),
            base_url="http://test",
        ) as client:
            resp = await client.post("/api/bargain/generate", json={
                "item_info": {"title": "MacBook"},
                # 缺少 target_price
            })

    assert resp.status_code == 422
