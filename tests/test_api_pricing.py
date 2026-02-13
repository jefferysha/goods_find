"""pricing API 路由单元测试"""
import json

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI

from src.api.routes.pricing import router
from src.domain.models.market_price import MarketPrice, PremiumThresholds
from src.domain.models.price_analysis import PriceAnalysis, BatchStats


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


@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ===== GET /api/pricing/market-prices =====


@pytest.mark.anyio
async def test_get_market_prices_all(client):
    """获取所有基准价"""
    mock_price = MarketPrice(
        id="p1", task_id=1, keyword="MacBook", reference_price=9000.0
    )
    with patch("src.api.routes.pricing.market_price_repo") as mock_repo:
        mock_repo.get_all = AsyncMock(return_value=[mock_price])
        resp = await client.get("/api/pricing/market-prices")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["keyword"] == "MacBook"


@pytest.mark.anyio
async def test_get_market_prices_by_task_id(client):
    """按 task_id 筛选基准价"""
    mock_price = MarketPrice(
        id="p2", task_id=5, keyword="iPhone", reference_price=5000.0
    )
    with patch("src.api.routes.pricing.market_price_repo") as mock_repo:
        mock_repo.get_by_task_id = AsyncMock(return_value=[mock_price])
        resp = await client.get("/api/pricing/market-prices?task_id=5")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["task_id"] == 5


# ===== POST /api/pricing/market-prices =====


@pytest.mark.anyio
async def test_create_market_price(client):
    """创建基准价"""
    with patch("src.api.routes.pricing.market_price_repo") as mock_repo:
        mock_repo.create = AsyncMock(
            side_effect=lambda p: p
        )
        payload = {
            "task_id": 1,
            "keyword": "MacBook",
            "reference_price": 9000.0,
        }
        resp = await client.post("/api/pricing/market-prices", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "基准价创建成功"
        assert data["data"]["keyword"] == "MacBook"
        assert data["data"]["reference_price"] == 9000.0


# ===== PUT /api/pricing/market-prices/{price_id} =====


@pytest.mark.anyio
async def test_update_market_price_success(client):
    """更新基准价 — 成功"""
    updated_price = MarketPrice(
        id="p1", task_id=1, keyword="MacBook", reference_price=8500.0
    )
    with patch("src.api.routes.pricing.market_price_repo") as mock_repo:
        mock_repo.update = AsyncMock(return_value=updated_price)
        resp = await client.put(
            "/api/pricing/market-prices/p1",
            json={"reference_price": 8500.0},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "基准价更新成功"
        assert data["data"]["reference_price"] == 8500.0


@pytest.mark.anyio
async def test_update_market_price_not_found(client):
    """更新基准价 — 不存在返回 404"""
    with patch("src.api.routes.pricing.market_price_repo") as mock_repo:
        mock_repo.update = AsyncMock(return_value=None)
        resp = await client.put(
            "/api/pricing/market-prices/nonexistent",
            json={"reference_price": 1000.0},
        )
        assert resp.status_code == 404


# ===== DELETE /api/pricing/market-prices/{price_id} =====


@pytest.mark.anyio
async def test_delete_market_price_success(client):
    """删除基准价 — 成功"""
    with patch("src.api.routes.pricing.market_price_repo") as mock_repo:
        mock_repo.delete = AsyncMock(return_value=True)
        resp = await client.delete("/api/pricing/market-prices/p1")
        assert resp.status_code == 200
        assert resp.json()["message"] == "基准价删除成功"


@pytest.mark.anyio
async def test_delete_market_price_not_found(client):
    """删除基准价 — 不存在返回 404"""
    with patch("src.api.routes.pricing.market_price_repo") as mock_repo:
        mock_repo.delete = AsyncMock(return_value=False)
        resp = await client.delete("/api/pricing/market-prices/nonexistent")
        assert resp.status_code == 404


# ===== GET /api/pricing/analysis =====


@pytest.mark.anyio
async def test_get_analysis_success(client):
    """价格分析 — 正常返回"""
    mock_task = MagicMock()
    mock_task.keyword = "MacBook"

    analysis = PriceAnalysis(
        item_id="item1",
        item_price=8000.0,
        reference_price=9000.0,
        premium_rate=-11.1,
        price_level="low_price",
    )

    with (
        patch(
            "src.infrastructure.persistence.json_task_repository.JsonTaskRepository.find_by_id",
            new_callable=AsyncMock,
            return_value=mock_task,
        ),
        patch(
            "src.infrastructure.persistence.item_repository.ItemRepository.get_all_for_keyword",
            new_callable=AsyncMock,
            return_value=[{"商品信息": {"当前售价": "8000"}}],
        ),
        patch("src.api.routes.pricing.pricing_service") as mock_svc,
    ):
        mock_svc.analyze_batch = AsyncMock(return_value=[analysis])

        resp = await client.get("/api/pricing/analysis?task_id=1")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["item_id"] == "item1"
        assert data[0]["price_level"] == "low_price"


@pytest.mark.anyio
async def test_get_analysis_task_not_found(client):
    """价格分析 — 任务不存在返回 404"""
    with patch(
        "src.infrastructure.persistence.json_task_repository.JsonTaskRepository.find_by_id",
        new_callable=AsyncMock,
        return_value=None,
    ):
        resp = await client.get("/api/pricing/analysis?task_id=999")
        assert resp.status_code == 404


# ===== GET /api/pricing/batch-stats =====


@pytest.mark.anyio
async def test_get_batch_stats_success(client):
    """批次统计 — 正常返回"""
    mock_task = MagicMock()
    mock_task.keyword = "iPhone"

    stats = BatchStats(
        avg_price=5000.0,
        median_price=4800.0,
        min_price=3000.0,
        max_price=7000.0,
        total_count=10,
    )

    with (
        patch(
            "src.infrastructure.persistence.json_task_repository.JsonTaskRepository.find_by_id",
            new_callable=AsyncMock,
            return_value=mock_task,
        ),
        patch(
            "src.infrastructure.persistence.item_repository.ItemRepository.get_all_for_keyword",
            new_callable=AsyncMock,
            return_value=[
                {"商品信息": {"当前售价": "5000"}},
                {"商品信息": {"当前售价": "4000"}},
            ],
        ),
        patch("src.api.routes.pricing.pricing_service") as mock_svc,
    ):
        mock_svc.calculate_batch_stats = MagicMock(return_value=stats)

        resp = await client.get("/api/pricing/batch-stats?task_id=1")
        assert resp.status_code == 200
        data = resp.json()
        assert data["avg_price"] == 5000.0
        assert data["total_count"] == 10


# ===== GET /api/pricing/thresholds =====


@pytest.mark.anyio
async def test_get_thresholds_default(client):
    """阈值 — 文件不存在时返回默认值"""
    with patch("os.path.exists", return_value=False):
        resp = await client.get("/api/pricing/thresholds")
        assert resp.status_code == 200
        data = resp.json()
        # PremiumThresholds defaults
        assert data["low_price_max"] == -15.0
        assert data["fair_max"] == 5.0
        assert data["slight_premium_max"] == 20.0


@pytest.mark.anyio
async def test_get_thresholds_from_file(client):
    """阈值 — 从文件读取"""
    stored = [
        {"task_id": None, "low_price_max": -10.0, "fair_max": 10.0, "slight_premium_max": 25.0},
        {"task_id": 5, "low_price_max": -20.0, "fair_max": 3.0, "slight_premium_max": 15.0},
    ]
    mock_open = MagicMock()
    mock_open.return_value.__enter__ = MagicMock(return_value=MagicMock(read=MagicMock(return_value=json.dumps(stored))))
    mock_open.return_value.__exit__ = MagicMock(return_value=False)

    with (
        patch("os.path.exists", return_value=True),
        patch("builtins.open", mock_open),
    ):
        # Without task_id -> global default (task_id=None)
        resp = await client.get("/api/pricing/thresholds")
        assert resp.status_code == 200
        data = resp.json()
        assert data["low_price_max"] == -10.0


@pytest.mark.anyio
async def test_get_thresholds_by_task_id(client):
    """阈值 — 按 task_id 筛选"""
    stored = [
        {"task_id": None, "low_price_max": -10.0, "fair_max": 10.0, "slight_premium_max": 25.0},
        {"task_id": 5, "low_price_max": -20.0, "fair_max": 3.0, "slight_premium_max": 15.0},
    ]
    mock_open = MagicMock()
    mock_open.return_value.__enter__ = MagicMock(return_value=MagicMock(read=MagicMock(return_value=json.dumps(stored))))
    mock_open.return_value.__exit__ = MagicMock(return_value=False)

    with (
        patch("os.path.exists", return_value=True),
        patch("builtins.open", mock_open),
    ):
        resp = await client.get("/api/pricing/thresholds?task_id=5")
        assert resp.status_code == 200
        data = resp.json()
        assert data["task_id"] == 5
        assert data["low_price_max"] == -20.0


# ===== PUT /api/pricing/thresholds =====


@pytest.mark.anyio
async def test_update_thresholds(client):
    """更新阈值"""
    mock_open = MagicMock()
    mock_open.return_value.__enter__ = MagicMock(return_value=MagicMock(
        read=MagicMock(return_value="[]"),
        write=MagicMock(),
    ))
    mock_open.return_value.__exit__ = MagicMock(return_value=False)

    with (
        patch("os.path.exists", return_value=True),
        patch("builtins.open", mock_open),
    ):
        payload = {
            "task_id": 1,
            "low_price_max": -12.0,
            "fair_max": 8.0,
            "slight_premium_max": 18.0,
        }
        resp = await client.put("/api/pricing/thresholds", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "阈值更新成功"
        assert data["data"]["task_id"] == 1
        assert data["data"]["low_price_max"] == -12.0
