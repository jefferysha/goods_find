"""后端 API 路由 team 的单元测试"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from src.app import app

SERVICE = "src.api.routes.team.service"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    """创建测试客户端"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------- GET /api/team/members ----------

@pytest.mark.anyio
async def test_get_members_success(client):
    """获取成员列表 — 正常"""
    members = [
        {"id": 1, "name": "Alice", "role": "buyer"},
        {"id": 2, "name": "Bob", "role": "seller"},
    ]
    with patch(f"{SERVICE}.get_all_members", new_callable=AsyncMock, return_value=members):
        response = await client.get("/api/team/members")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["name"] == "Alice"


@pytest.mark.anyio
async def test_get_members_empty(client):
    """获取成员列表 — 空列表"""
    with patch(f"{SERVICE}.get_all_members", new_callable=AsyncMock, return_value=[]):
        response = await client.get("/api/team/members")
        assert response.status_code == 200
        assert response.json() == []


# ---------- GET /api/team/members/{id} ----------

@pytest.mark.anyio
async def test_get_member_success(client):
    """获取单个成员 — 成功"""
    member = {"id": 1, "name": "Alice", "role": "buyer", "phone": "13800000001"}
    with patch(f"{SERVICE}.get_member", new_callable=AsyncMock, return_value=member):
        response = await client.get("/api/team/members/1")
        assert response.status_code == 200
        assert response.json()["id"] == 1
        assert response.json()["name"] == "Alice"


@pytest.mark.anyio
async def test_get_member_not_found(client):
    """获取单个成员 — 不存在返回 404"""
    with patch(f"{SERVICE}.get_member", new_callable=AsyncMock, return_value=None):
        response = await client.get("/api/team/members/999")
        assert response.status_code == 404
        assert "未找到" in response.json()["detail"]


# ---------- PUT /api/team/members/{id} ----------

@pytest.mark.anyio
async def test_update_member_success(client):
    """更新成员 — 成功"""
    updated = {"id": 1, "name": "Alice", "role": "admin"}
    with patch(f"{SERVICE}.update_member", new_callable=AsyncMock, return_value=updated):
        response = await client.put(
            "/api/team/members/1",
            json={"role": "admin"},
        )
        assert response.status_code == 200
        assert response.json()["message"] == "更新成功"
        assert response.json()["data"]["role"] == "admin"


@pytest.mark.anyio
async def test_update_member_not_found(client):
    """更新成员 — 不存在返回 404"""
    with patch(f"{SERVICE}.update_member", new_callable=AsyncMock, return_value=None):
        response = await client.put("/api/team/members/999", json={"role": "admin"})
        assert response.status_code == 404


# ---------- GET /api/team/performance ----------

@pytest.mark.anyio
async def test_get_team_performance_success(client):
    """获取团队业绩 — 正常"""
    perf = [
        {
            "user_id": 1,
            "name": "Alice",
            "purchases": 10,
            "sales": 8,
            "profit": 5000,
        },
        {
            "user_id": 2,
            "name": "Bob",
            "purchases": 6,
            "sales": 5,
            "profit": 3000,
        },
    ]
    with patch(f"{SERVICE}.get_member_performance", new_callable=AsyncMock, return_value=perf):
        response = await client.get("/api/team/performance")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["profit"] == 5000


@pytest.mark.anyio
async def test_get_team_performance_with_params(client):
    """获取团队业绩 — 带过滤参数"""
    with patch(f"{SERVICE}.get_member_performance", new_callable=AsyncMock, return_value=[]) as mock_fn:
        response = await client.get(
            "/api/team/performance?user_id=1&start_date=2026-01-01&end_date=2026-01-31"
        )
        assert response.status_code == 200
        mock_fn.assert_called_once_with(
            user_id=1, start_date="2026-01-01", end_date="2026-01-31",
        )


@pytest.mark.anyio
async def test_get_team_performance_empty(client):
    """获取团队业绩 — 无数据"""
    with patch(f"{SERVICE}.get_member_performance", new_callable=AsyncMock, return_value=[]):
        response = await client.get("/api/team/performance")
        assert response.status_code == 200
        assert response.json() == []


# ---------- GET /api/team/workspace/{id} ----------

@pytest.mark.anyio
async def test_get_workspace_success(client):
    """获取个人工作台 — 成功"""
    workspace = {
        "user_id": 1,
        "name": "Alice",
        "pending_purchases": 3,
        "in_stock": 5,
        "recent_sales": [
            {"id": "r1", "title": "MacBook", "profit": 1500},
        ],
    }
    with patch(f"{SERVICE}.get_workspace_data", new_callable=AsyncMock, return_value=workspace):
        response = await client.get("/api/team/workspace/1")
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == 1
        assert data["pending_purchases"] == 3
        assert len(data["recent_sales"]) == 1


@pytest.mark.anyio
async def test_get_workspace_not_found(client):
    """获取个人工作台 — 成员不存在返回 404"""
    with patch(f"{SERVICE}.get_workspace_data", new_callable=AsyncMock, return_value=None):
        response = await client.get("/api/team/workspace/999")
        assert response.status_code == 404
        assert "未找到" in response.json()["detail"]
