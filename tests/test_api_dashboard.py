"""后端 API 路由 dashboard 的单元测试"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from src.app import app

# dashboard.py 中变量名为 dashboard_service
SERVICE = "src.api.routes.dashboard.dashboard_service"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    """创建测试客户端"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------- GET /api/dashboard/stats ----------

@pytest.mark.anyio
async def test_get_stats_success(client):
    """获取仪表盘统计 — 正常"""
    stats = {
        "total_tasks": 12,
        "active_tasks": 5,
        "total_items": 320,
        "today_items": 45,
        "total_purchases": 28,
        "total_inventory": 15,
    }
    with patch(f"{SERVICE}.get_stats", new_callable=AsyncMock, return_value=stats):
        response = await client.get("/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total_tasks"] == 12
        assert data["today_items"] == 45


@pytest.mark.anyio
async def test_get_stats_empty(client):
    """获取仪表盘统计 — 全部为零"""
    stats = {
        "total_tasks": 0,
        "active_tasks": 0,
        "total_items": 0,
        "today_items": 0,
    }
    with patch(f"{SERVICE}.get_stats", new_callable=AsyncMock, return_value=stats):
        response = await client.get("/api/dashboard/stats")
        assert response.status_code == 200
        assert response.json()["total_tasks"] == 0


# ---------- GET /api/dashboard/price-trend ----------

@pytest.mark.anyio
async def test_get_price_trend_success(client):
    """获取价格趋势 — 正常"""
    trend = [
        {"date": "2026-02-11", "avg_price": 8500, "count": 10},
        {"date": "2026-02-12", "avg_price": 8300, "count": 12},
    ]
    with patch(f"{SERVICE}.get_price_trend", new_callable=AsyncMock, return_value=trend):
        response = await client.get("/api/dashboard/price-trend?task_id=1&days=7")
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == 1
        assert data["days"] == 7
        assert len(data["trend"]) == 2


@pytest.mark.anyio
async def test_get_price_trend_no_task_id(client):
    """获取价格趋势 — 无 task_id 返回空列表"""
    response = await client.get("/api/dashboard/price-trend")
    assert response.status_code == 200
    data = response.json()
    assert data["task_id"] is None
    assert data["trend"] == []


@pytest.mark.anyio
async def test_get_price_trend_default_days(client):
    """获取价格趋势 — 默认 30 天"""
    trend = []
    with patch(f"{SERVICE}.get_price_trend", new_callable=AsyncMock, return_value=trend) as mock_fn:
        response = await client.get("/api/dashboard/price-trend?task_id=2")
        assert response.status_code == 200
        assert response.json()["days"] == 30
        mock_fn.assert_called_once_with(2, days=30)


# ---------- GET /api/dashboard/premium-distribution ----------

@pytest.mark.anyio
async def test_get_premium_distribution_success(client):
    """获取溢价分布 — 正常"""
    dist = {
        "task_id": 1,
        "total": 50,
        "distribution": [
            {"range": "0-10%", "count": 15},
            {"range": "10-20%", "count": 20},
            {"range": "20-30%", "count": 10},
            {"range": "30%+", "count": 5},
        ],
    }
    with patch(f"{SERVICE}.get_premium_distribution", new_callable=AsyncMock, return_value=dist):
        response = await client.get("/api/dashboard/premium-distribution?task_id=1")
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == 1
        assert data["total"] == 50
        assert len(data["distribution"]) == 4


@pytest.mark.anyio
async def test_get_premium_distribution_no_task_id(client):
    """获取溢价分布 — 无 task_id 返回空"""
    response = await client.get("/api/dashboard/premium-distribution")
    assert response.status_code == 200
    data = response.json()
    assert data["task_id"] is None
    assert data["total"] == 0
    assert data["distribution"] == []


# ---------- GET /api/dashboard/top-keywords ----------

@pytest.mark.anyio
async def test_get_top_keywords_success(client):
    """获取热门关键词 — 正常"""
    keywords = [
        {"keyword": "MacBook Pro", "count": 120},
        {"keyword": "iPhone 15", "count": 95},
        {"keyword": "iPad Air", "count": 60},
    ]
    with patch(f"{SERVICE}.get_top_keywords", new_callable=AsyncMock, return_value=keywords):
        response = await client.get("/api/dashboard/top-keywords?limit=3")
        assert response.status_code == 200
        data = response.json()
        assert "keywords" in data
        assert len(data["keywords"]) == 3
        assert data["keywords"][0]["keyword"] == "MacBook Pro"


@pytest.mark.anyio
async def test_get_top_keywords_default_limit(client):
    """获取热门关键词 — 默认 limit=10"""
    with patch(f"{SERVICE}.get_top_keywords", new_callable=AsyncMock, return_value=[]) as mock_fn:
        response = await client.get("/api/dashboard/top-keywords")
        assert response.status_code == 200
        mock_fn.assert_called_once_with(limit=10)


@pytest.mark.anyio
async def test_get_top_keywords_empty(client):
    """获取热门关键词 — 无数据"""
    with patch(f"{SERVICE}.get_top_keywords", new_callable=AsyncMock, return_value=[]):
        response = await client.get("/api/dashboard/top-keywords")
        assert response.status_code == 200
        assert response.json()["keywords"] == []


# ---------- GET /api/dashboard/bargain-leaderboard ----------

@pytest.mark.anyio
async def test_get_bargain_leaderboard_success(client):
    """获取捡漏排行 — 正常"""
    leaderboard = [
        {
            "title": "MacBook Air M2 全新未拆封",
            "price": 6500,
            "market_price": 9500,
            "premium_rate": -0.3158,
            "link": "http://example.com/1",
        },
        {
            "title": "iPhone 15 Pro 99新",
            "price": 4200,
            "market_price": 5800,
            "premium_rate": -0.2759,
            "link": "http://example.com/2",
        },
    ]
    with patch(f"{SERVICE}.get_bargain_leaderboard", new_callable=AsyncMock, return_value=leaderboard):
        response = await client.get("/api/dashboard/bargain-leaderboard?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["premium_rate"] < 0


@pytest.mark.anyio
async def test_get_bargain_leaderboard_default_limit(client):
    """获取捡漏排行 — 默认 limit=10"""
    with patch(f"{SERVICE}.get_bargain_leaderboard", new_callable=AsyncMock, return_value=[]) as mock_fn:
        response = await client.get("/api/dashboard/bargain-leaderboard")
        assert response.status_code == 200
        mock_fn.assert_called_once_with(limit=10)


@pytest.mark.anyio
async def test_get_bargain_leaderboard_empty(client):
    """获取捡漏排行 — 无数据"""
    with patch(f"{SERVICE}.get_bargain_leaderboard", new_callable=AsyncMock, return_value=[]):
        response = await client.get("/api/dashboard/bargain-leaderboard")
        assert response.status_code == 200
        assert response.json() == []
