"""后端 API 路由 purchases 的单元测试"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from src.app import app

SERVICE = "src.api.routes.purchases.service"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    """创建测试客户端"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------- GET /api/purchases/ ----------

@pytest.mark.anyio
async def test_get_purchases_success(client):
    """获取采购列表 — 正常返回"""
    items = [
        {"id": "p1", "title": "MacBook Air M2", "status": "pending", "assignee": "Alice"},
        {"id": "p2", "title": "iPhone 15", "status": "purchased", "assignee": "Bob"},
    ]
    with patch(f"{SERVICE}.get_all", new_callable=AsyncMock, return_value=items):
        response = await client.get("/api/purchases/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2


@pytest.mark.anyio
async def test_get_purchases_with_filter(client):
    """获取采购列表 — 按状态过滤"""
    items = [{"id": "p1", "title": "MacBook Air M2", "status": "pending"}]
    with patch(f"{SERVICE}.get_all", new_callable=AsyncMock, return_value=items) as mock_get:
        response = await client.get("/api/purchases/?status=pending&assignee=Alice")
        assert response.status_code == 200
        mock_get.assert_called_once_with(status="pending", assignee="Alice")


@pytest.mark.anyio
async def test_get_purchases_empty(client):
    """获取采购列表 — 空列表"""
    with patch(f"{SERVICE}.get_all", new_callable=AsyncMock, return_value=[]):
        response = await client.get("/api/purchases/")
        assert response.status_code == 200
        assert response.json() == []


# ---------- GET /api/purchases/stats ----------

@pytest.mark.anyio
async def test_get_purchase_stats_success(client):
    """获取采购统计 — 正常"""
    stats = {"total": 10, "pending": 5, "purchased": 3, "cancelled": 2}
    with patch(f"{SERVICE}.get_stats", new_callable=AsyncMock, return_value=stats):
        response = await client.get("/api/purchases/stats")
        assert response.status_code == 200
        assert response.json()["total"] == 10


@pytest.mark.anyio
async def test_get_purchase_stats_with_assignee(client):
    """获取采购统计 — 带负责人过滤"""
    stats = {"total": 3, "pending": 2, "purchased": 1, "cancelled": 0}
    with patch(f"{SERVICE}.get_stats", new_callable=AsyncMock, return_value=stats) as mock_stats:
        response = await client.get("/api/purchases/stats?assignee=Alice")
        assert response.status_code == 200
        mock_stats.assert_called_once_with(assignee="Alice")


# ---------- POST /api/purchases/ ----------

@pytest.mark.anyio
async def test_create_purchase_success(client):
    """创建采购项 — 成功"""
    new_item = {"id": "p3", "title": "AirPods Pro", "status": "pending"}
    with patch(f"{SERVICE}.create", new_callable=AsyncMock, return_value=new_item):
        response = await client.post(
            "/api/purchases/",
            json={"title": "AirPods Pro", "keyword": "airpods", "price": 1200},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "已加入采购清单"
        assert data["data"]["id"] == "p3"


# ---------- GET /api/purchases/{id} ----------

@pytest.mark.anyio
async def test_get_purchase_success(client):
    """获取单个采购项 — 成功"""
    item = {"id": "p1", "title": "MacBook Air M2", "status": "pending"}
    with patch(f"{SERVICE}.get_by_id", new_callable=AsyncMock, return_value=item):
        response = await client.get("/api/purchases/p1")
        assert response.status_code == 200
        assert response.json()["id"] == "p1"


@pytest.mark.anyio
async def test_get_purchase_not_found(client):
    """获取单个采购项 — 不存在返回 404"""
    with patch(f"{SERVICE}.get_by_id", new_callable=AsyncMock, return_value=None):
        response = await client.get("/api/purchases/nonexist")
        assert response.status_code == 404
        assert "未找到" in response.json()["detail"]


# ---------- PUT /api/purchases/{id} ----------

@pytest.mark.anyio
async def test_update_purchase_success(client):
    """更新采购项 — 成功"""
    updated = {"id": "p1", "title": "MacBook Air M2", "status": "purchased"}
    with patch(f"{SERVICE}.update", new_callable=AsyncMock, return_value=updated):
        response = await client.put(
            "/api/purchases/p1",
            json={"status": "purchased"},
        )
        assert response.status_code == 200
        assert response.json()["message"] == "更新成功"


@pytest.mark.anyio
async def test_update_purchase_not_found(client):
    """更新采购项 — 不存在返回 404"""
    with patch(f"{SERVICE}.update", new_callable=AsyncMock, return_value=None):
        response = await client.put("/api/purchases/nonexist", json={"status": "x"})
        assert response.status_code == 404


# ---------- DELETE /api/purchases/{id} ----------

@pytest.mark.anyio
async def test_delete_purchase_success(client):
    """删除采购项 — 成功"""
    with patch(f"{SERVICE}.delete", new_callable=AsyncMock, return_value=True):
        response = await client.delete("/api/purchases/p1")
        assert response.status_code == 200
        assert response.json()["message"] == "删除成功"


@pytest.mark.anyio
async def test_delete_purchase_not_found(client):
    """删除采购项 — 不存在返回 404"""
    with patch(f"{SERVICE}.delete", new_callable=AsyncMock, return_value=False):
        response = await client.delete("/api/purchases/nonexist")
        assert response.status_code == 404


# ---------- POST /api/purchases/batch-assign ----------

@pytest.mark.anyio
async def test_batch_assign_success(client):
    """批量分配 — 成功"""
    with patch(f"{SERVICE}.batch_assign", new_callable=AsyncMock, return_value=3):
        response = await client.post(
            "/api/purchases/batch-assign",
            json={"ids": ["p1", "p2", "p3"], "assignee": "Alice"},
        )
        assert response.status_code == 200
        assert response.json()["count"] == 3


@pytest.mark.anyio
async def test_batch_assign_missing_params(client):
    """批量分配 — 缺少参数返回 400"""
    response = await client.post(
        "/api/purchases/batch-assign",
        json={"ids": [], "assignee": "Alice"},
    )
    assert response.status_code == 400


@pytest.mark.anyio
async def test_batch_assign_missing_assignee(client):
    """批量分配 — 缺少负责人返回 400"""
    response = await client.post(
        "/api/purchases/batch-assign",
        json={"ids": ["p1"], "assignee": ""},
    )
    assert response.status_code == 400


# ---------- POST /api/purchases/{id}/mark-purchased ----------

@pytest.mark.anyio
async def test_mark_purchased_success(client):
    """标记收货 — 成功"""
    inv_item = {"id": "inv1", "title": "MacBook Air M2", "status": "in_stock"}
    with patch(f"{SERVICE}.mark_purchased", new_callable=AsyncMock, return_value=inv_item):
        response = await client.post(
            "/api/purchases/p1/mark-purchased",
            json={"actual_price": 7500},
        )
        assert response.status_code == 200
        assert "入库" in response.json()["message"]
        assert response.json()["data"]["id"] == "inv1"


@pytest.mark.anyio
async def test_mark_purchased_missing_price(client):
    """标记收货 — 缺少价格返回 400"""
    response = await client.post(
        "/api/purchases/p1/mark-purchased",
        json={},
    )
    assert response.status_code == 400


@pytest.mark.anyio
async def test_mark_purchased_not_found(client):
    """标记收货 — 采购项不存在返回 404"""
    with patch(f"{SERVICE}.mark_purchased", new_callable=AsyncMock, return_value=None):
        response = await client.post(
            "/api/purchases/nonexist/mark-purchased",
            json={"actual_price": 7500},
        )
        assert response.status_code == 404
