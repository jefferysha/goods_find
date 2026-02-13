"""后端 API 路由 inventory 的单元测试"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from src.app import app

SERVICE = "src.api.routes.inventory.service"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    """创建测试客户端"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------- GET /api/inventory/ ----------

@pytest.mark.anyio
async def test_get_inventory_success(client):
    """获取库存列表 — 正常返回"""
    items = [
        {"id": "inv1", "title": "MacBook Air M2", "status": "in_stock", "cost": 7500},
        {"id": "inv2", "title": "iPhone 15", "status": "sold", "cost": 4800},
    ]
    with patch(f"{SERVICE}.get_all", new_callable=AsyncMock, return_value=items):
        response = await client.get("/api/inventory/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2


@pytest.mark.anyio
async def test_get_inventory_with_filters(client):
    """获取库存列表 — 带过滤参数"""
    items = [{"id": "inv1", "title": "MacBook Air M2", "status": "in_stock"}]
    with patch(f"{SERVICE}.get_all", new_callable=AsyncMock, return_value=items) as mock_get:
        response = await client.get("/api/inventory/?status=in_stock&assignee=Alice&keyword=macbook")
        assert response.status_code == 200
        mock_get.assert_called_once_with(status="in_stock", assignee="Alice", keyword="macbook")


@pytest.mark.anyio
async def test_get_inventory_empty(client):
    """获取库存列表 — 空列表"""
    with patch(f"{SERVICE}.get_all", new_callable=AsyncMock, return_value=[]):
        response = await client.get("/api/inventory/")
        assert response.status_code == 200
        assert response.json() == []


# ---------- GET /api/inventory/summary ----------

@pytest.mark.anyio
async def test_get_inventory_summary_success(client):
    """获取库存摘要 — 正常"""
    summary = {"total": 15, "in_stock": 10, "sold": 5, "total_cost": 75000}
    with patch(f"{SERVICE}.get_summary", new_callable=AsyncMock, return_value=summary):
        response = await client.get("/api/inventory/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 15
        assert data["in_stock"] == 10


@pytest.mark.anyio
async def test_get_inventory_summary_with_assignee(client):
    """获取库存摘要 — 带负责人过滤"""
    summary = {"total": 5, "in_stock": 3, "sold": 2, "total_cost": 25000}
    with patch(f"{SERVICE}.get_summary", new_callable=AsyncMock, return_value=summary) as mock_sum:
        response = await client.get("/api/inventory/summary?assignee=Bob")
        assert response.status_code == 200
        mock_sum.assert_called_once_with(assignee="Bob")


# ---------- GET /api/inventory/aging-alerts ----------

@pytest.mark.anyio
async def test_get_aging_alerts_success(client):
    """获取库龄预警 — 正常返回"""
    alerts = [
        {"id": "inv1", "title": "MacBook Air M2", "days_in_stock": 14},
        {"id": "inv3", "title": "iPad Pro", "days_in_stock": 10},
    ]
    with patch(f"{SERVICE}.get_aging_alerts", new_callable=AsyncMock, return_value=alerts):
        response = await client.get("/api/inventory/aging-alerts?days=7")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2


@pytest.mark.anyio
async def test_get_aging_alerts_empty(client):
    """获取库龄预警 — 无预警"""
    with patch(f"{SERVICE}.get_aging_alerts", new_callable=AsyncMock, return_value=[]):
        response = await client.get("/api/inventory/aging-alerts")
        assert response.status_code == 200
        assert response.json() == []


@pytest.mark.anyio
async def test_get_aging_alerts_with_params(client):
    """获取库龄预警 — 自定义天数和负责人"""
    with patch(f"{SERVICE}.get_aging_alerts", new_callable=AsyncMock, return_value=[]) as mock_aging:
        response = await client.get("/api/inventory/aging-alerts?days=14&assignee=Alice")
        assert response.status_code == 200
        mock_aging.assert_called_once_with(days_threshold=14, assignee="Alice")


# ---------- GET /api/inventory/{id} ----------

@pytest.mark.anyio
async def test_get_inventory_item_success(client):
    """获取单个库存项 — 成功"""
    item = {"id": "inv1", "title": "MacBook Air M2", "status": "in_stock", "cost": 7500}
    with patch(f"{SERVICE}.get_by_id", new_callable=AsyncMock, return_value=item):
        response = await client.get("/api/inventory/inv1")
        assert response.status_code == 200
        assert response.json()["id"] == "inv1"


@pytest.mark.anyio
async def test_get_inventory_item_not_found(client):
    """获取单个库存项 — 不存在返回 404"""
    with patch(f"{SERVICE}.get_by_id", new_callable=AsyncMock, return_value=None):
        response = await client.get("/api/inventory/nonexist")
        assert response.status_code == 404
        assert "未找到" in response.json()["detail"]


# ---------- POST /api/inventory/ ----------

@pytest.mark.anyio
async def test_create_inventory_item_success(client):
    """创建库存项 — 成功"""
    new_item = {"id": "inv3", "title": "AirPods Pro", "status": "in_stock", "cost": 1200}
    with patch(f"{SERVICE}.create", new_callable=AsyncMock, return_value=new_item):
        response = await client.post(
            "/api/inventory/",
            json={"title": "AirPods Pro", "keyword": "airpods", "cost": 1200},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "入库成功"
        assert data["data"]["id"] == "inv3"


# ---------- PUT /api/inventory/{id} ----------

@pytest.mark.anyio
async def test_update_inventory_item_success(client):
    """更新库存项 — 成功"""
    updated = {"id": "inv1", "title": "MacBook Air M2", "status": "in_stock", "cost": 7200}
    with patch(f"{SERVICE}.update", new_callable=AsyncMock, return_value=updated):
        response = await client.put(
            "/api/inventory/inv1",
            json={"cost": 7200},
        )
        assert response.status_code == 200
        assert response.json()["message"] == "更新成功"
        assert response.json()["data"]["cost"] == 7200


@pytest.mark.anyio
async def test_update_inventory_item_not_found(client):
    """更新库存项 — 不存在返回 404"""
    with patch(f"{SERVICE}.update", new_callable=AsyncMock, return_value=None):
        response = await client.put("/api/inventory/nonexist", json={"cost": 0})
        assert response.status_code == 404


# ---------- POST /api/inventory/{id}/mark-sold ----------

@pytest.mark.anyio
async def test_mark_sold_success(client):
    """标记售出 — 成功"""
    sold_item = {"id": "inv1", "title": "MacBook Air M2", "status": "sold", "sold_price": 9000}
    with patch(f"{SERVICE}.mark_sold", new_callable=AsyncMock, return_value=sold_item):
        response = await client.post(
            "/api/inventory/inv1/mark-sold",
            json={"sold_price": 9000, "sold_channel": "闲鱼"},
        )
        assert response.status_code == 200
        assert "售出" in response.json()["message"]
        assert response.json()["data"]["sold_price"] == 9000


@pytest.mark.anyio
async def test_mark_sold_missing_price(client):
    """标记售出 — 缺少售价返回 400"""
    response = await client.post(
        "/api/inventory/inv1/mark-sold",
        json={},
    )
    assert response.status_code == 400


@pytest.mark.anyio
async def test_mark_sold_not_found(client):
    """标记售出 — 库存项不存在返回 404"""
    with patch(f"{SERVICE}.mark_sold", new_callable=AsyncMock, return_value=None):
        response = await client.post(
            "/api/inventory/nonexist/mark-sold",
            json={"sold_price": 9000},
        )
        assert response.status_code == 404


# ---------- DELETE /api/inventory/{id} ----------

@pytest.mark.anyio
async def test_delete_inventory_item_success(client):
    """删除库存项 — 成功"""
    with patch(f"{SERVICE}.delete", new_callable=AsyncMock, return_value=True):
        response = await client.delete("/api/inventory/inv1")
        assert response.status_code == 200
        assert response.json()["message"] == "删除成功"


@pytest.mark.anyio
async def test_delete_inventory_item_not_found(client):
    """删除库存项 — 不存在返回 404"""
    with patch(f"{SERVICE}.delete", new_callable=AsyncMock, return_value=False):
        response = await client.delete("/api/inventory/nonexist")
        assert response.status_code == 404
