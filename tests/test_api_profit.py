"""后端 API 路由 profit 的单元测试"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from src.app import app

SERVICE = "src.api.routes.profit.service"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    """创建测试客户端"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------- GET /api/profit/records ----------

@pytest.mark.anyio
async def test_get_sale_records_success(client):
    """获取销售记录 — 正常返回"""
    records = [
        {"id": "r1", "title": "MacBook Air M2", "sold_price": 9000, "cost": 7500, "profit": 1500},
        {"id": "r2", "title": "iPhone 15", "sold_price": 5500, "cost": 4800, "profit": 700},
    ]
    with patch(f"{SERVICE}.get_sale_records", new_callable=AsyncMock, return_value=records):
        response = await client.get("/api/profit/records")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["profit"] == 1500


@pytest.mark.anyio
async def test_get_sale_records_with_filters(client):
    """获取销售记录 — 带过滤参数"""
    with patch(f"{SERVICE}.get_sale_records", new_callable=AsyncMock, return_value=[]) as mock_get:
        response = await client.get(
            "/api/profit/records?start_date=2026-01-01&end_date=2026-01-31"
            "&keyword=macbook&assignee=Alice"
        )
        assert response.status_code == 200
        mock_get.assert_called_once_with(
            start_date="2026-01-01", end_date="2026-01-31",
            keyword="macbook", assignee="Alice",
        )


@pytest.mark.anyio
async def test_get_sale_records_empty(client):
    """获取销售记录 — 无数据"""
    with patch(f"{SERVICE}.get_sale_records", new_callable=AsyncMock, return_value=[]):
        response = await client.get("/api/profit/records")
        assert response.status_code == 200
        assert response.json() == []


# ---------- GET /api/profit/summary ----------

@pytest.mark.anyio
async def test_get_profit_summary_success(client):
    """获取利润摘要 — 正常"""
    summary = {
        "total_revenue": 14500,
        "total_cost": 12300,
        "total_profit": 2200,
        "profit_rate": 0.1789,
        "count": 2,
    }
    with patch(f"{SERVICE}.get_summary", new_callable=AsyncMock, return_value=summary):
        response = await client.get("/api/profit/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["total_profit"] == 2200
        assert data["count"] == 2


@pytest.mark.anyio
async def test_get_profit_summary_with_dates(client):
    """获取利润摘要 — 带日期和负责人过滤"""
    summary = {"total_revenue": 0, "total_cost": 0, "total_profit": 0, "count": 0}
    with patch(f"{SERVICE}.get_summary", new_callable=AsyncMock, return_value=summary) as mock_sum:
        response = await client.get(
            "/api/profit/summary?start_date=2026-02-01&end_date=2026-02-13&assignee=Bob"
        )
        assert response.status_code == 200
        mock_sum.assert_called_once_with(
            start_date="2026-02-01", end_date="2026-02-13", assignee="Bob",
        )


# ---------- GET /api/profit/by-keyword ----------

@pytest.mark.anyio
async def test_get_profit_by_keyword_success(client):
    """按品类利润 — 正常"""
    data = [
        {"keyword": "macbook", "total_profit": 5000, "count": 3},
        {"keyword": "iphone", "total_profit": 2100, "count": 2},
    ]
    with patch(f"{SERVICE}.get_profit_by_keyword", new_callable=AsyncMock, return_value=data):
        response = await client.get("/api/profit/by-keyword")
        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)
        assert len(result) == 2
        assert result[0]["keyword"] == "macbook"


@pytest.mark.anyio
async def test_get_profit_by_keyword_with_dates(client):
    """按品类利润 — 带日期范围"""
    with patch(f"{SERVICE}.get_profit_by_keyword", new_callable=AsyncMock, return_value=[]) as mock_fn:
        response = await client.get("/api/profit/by-keyword?start_date=2026-01-01&end_date=2026-01-31")
        assert response.status_code == 200
        mock_fn.assert_called_once_with(start_date="2026-01-01", end_date="2026-01-31")


# ---------- GET /api/profit/by-assignee ----------

@pytest.mark.anyio
async def test_get_profit_by_assignee_success(client):
    """按成员利润 — 正常"""
    data = [
        {"assignee": "Alice", "total_profit": 3000, "count": 4},
        {"assignee": "Bob", "total_profit": 2000, "count": 3},
    ]
    with patch(f"{SERVICE}.get_profit_by_assignee", new_callable=AsyncMock, return_value=data):
        response = await client.get("/api/profit/by-assignee")
        assert response.status_code == 200
        result = response.json()
        assert len(result) == 2
        assert result[0]["assignee"] == "Alice"


@pytest.mark.anyio
async def test_get_profit_by_assignee_empty(client):
    """按成员利润 — 无数据"""
    with patch(f"{SERVICE}.get_profit_by_assignee", new_callable=AsyncMock, return_value=[]):
        response = await client.get("/api/profit/by-assignee")
        assert response.status_code == 200
        assert response.json() == []


# ---------- GET /api/profit/daily-trend ----------

@pytest.mark.anyio
async def test_get_daily_profit_success(client):
    """日利润趋势 — 正常"""
    trend = [
        {"date": "2026-02-11", "profit": 800, "count": 2},
        {"date": "2026-02-12", "profit": 1200, "count": 3},
    ]
    with patch(f"{SERVICE}.get_daily_profit", new_callable=AsyncMock, return_value=trend):
        response = await client.get("/api/profit/daily-trend?days=7")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2


@pytest.mark.anyio
async def test_get_daily_profit_with_assignee(client):
    """日利润趋势 — 带负责人过滤"""
    with patch(f"{SERVICE}.get_daily_profit", new_callable=AsyncMock, return_value=[]) as mock_fn:
        response = await client.get("/api/profit/daily-trend?days=14&assignee=Alice")
        assert response.status_code == 200
        mock_fn.assert_called_once_with(days=14, assignee="Alice")


@pytest.mark.anyio
async def test_get_daily_profit_default_days(client):
    """日利润趋势 — 默认天数 30"""
    with patch(f"{SERVICE}.get_daily_profit", new_callable=AsyncMock, return_value=[]) as mock_fn:
        response = await client.get("/api/profit/daily-trend")
        assert response.status_code == 200
        mock_fn.assert_called_once_with(days=30, assignee=None)
