"""后端 API 路由 price_book 的单元测试"""
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from src.app import app

SERVICE = "src.api.routes.price_book.service"


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    """创建测试客户端"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ---------- GET /api/price-book/entries ----------

@pytest.mark.anyio
async def test_get_all_entries_success(client):
    """获取价格本列表 — 正常返回"""
    mock_entries = [
        {"id": "1", "category_name": "MacBook Pro", "market_price": 9500},
        {"id": "2", "category_name": "iPhone 15", "market_price": 5000},
    ]
    with patch(f"{SERVICE}.get_all", new_callable=AsyncMock, return_value=mock_entries):
        response = await client.get("/api/price-book/entries")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["category_name"] == "MacBook Pro"


@pytest.mark.anyio
async def test_get_all_entries_empty(client):
    """获取价格本列表 — 空列表"""
    with patch(f"{SERVICE}.get_all", new_callable=AsyncMock, return_value=[]):
        response = await client.get("/api/price-book/entries")
        assert response.status_code == 200
        assert response.json() == []


# ---------- POST /api/price-book/entries ----------

@pytest.mark.anyio
async def test_create_entry_success(client):
    """创建价格本条目 — 成功"""
    new_entry = {"id": "3", "category_name": "iPad Air", "market_price": 4500}
    with patch(f"{SERVICE}.create", new_callable=AsyncMock, return_value=new_entry):
        response = await client.post(
            "/api/price-book/entries",
            json={"category_name": "iPad Air", "market_price": 4500},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "创建成功"
        assert data["data"]["category_name"] == "iPad Air"


# ---------- GET /api/price-book/entries/{id} ----------

@pytest.mark.anyio
async def test_get_entry_success(client):
    """获取单个条目 — 成功"""
    entry = {"id": "1", "category_name": "MacBook Pro", "market_price": 9500}
    with patch(f"{SERVICE}.get_by_id", new_callable=AsyncMock, return_value=entry):
        response = await client.get("/api/price-book/entries/1")
        assert response.status_code == 200
        assert response.json()["id"] == "1"


@pytest.mark.anyio
async def test_get_entry_not_found(client):
    """获取单个条目 — 不存在返回 404"""
    with patch(f"{SERVICE}.get_by_id", new_callable=AsyncMock, return_value=None):
        response = await client.get("/api/price-book/entries/nonexist")
        assert response.status_code == 404
        assert "未找到" in response.json()["detail"]


# ---------- PUT /api/price-book/entries/{id} ----------

@pytest.mark.anyio
async def test_update_entry_success(client):
    """更新条目 — 成功"""
    updated = {"id": "1", "category_name": "MacBook Pro", "market_price": 9800}
    with patch(f"{SERVICE}.update", new_callable=AsyncMock, return_value=updated):
        response = await client.put(
            "/api/price-book/entries/1",
            json={"market_price": 9800},
        )
        assert response.status_code == 200
        assert response.json()["message"] == "更新成功"
        assert response.json()["data"]["market_price"] == 9800


@pytest.mark.anyio
async def test_update_entry_not_found(client):
    """更新条目 — 不存在返回 404"""
    with patch(f"{SERVICE}.update", new_callable=AsyncMock, return_value=None):
        response = await client.put(
            "/api/price-book/entries/nonexist",
            json={"market_price": 0},
        )
        assert response.status_code == 404


# ---------- DELETE /api/price-book/entries/{id} ----------

@pytest.mark.anyio
async def test_delete_entry_success(client):
    """删除条目 — 成功"""
    with patch(f"{SERVICE}.delete", new_callable=AsyncMock, return_value=True):
        response = await client.delete("/api/price-book/entries/1")
        assert response.status_code == 200
        assert response.json()["message"] == "删除成功"


@pytest.mark.anyio
async def test_delete_entry_not_found(client):
    """删除条目 — 不存在返回 404"""
    with patch(f"{SERVICE}.delete", new_callable=AsyncMock, return_value=False):
        response = await client.delete("/api/price-book/entries/nonexist")
        assert response.status_code == 404


# ---------- GET /api/price-book/match ----------

@pytest.mark.anyio
async def test_match_keyword_found(client):
    """关键词匹配 — 命中"""
    entry = {"id": "1", "category_name": "MacBook Pro", "keywords": ["macbook"]}
    with patch(f"{SERVICE}.get_by_keyword", new_callable=AsyncMock, return_value=entry):
        response = await client.get("/api/price-book/match?keyword=macbook")
        assert response.status_code == 200
        assert response.json()["category_name"] == "MacBook Pro"


@pytest.mark.anyio
async def test_match_keyword_not_found(client):
    """关键词匹配 — 未命中返回 null"""
    with patch(f"{SERVICE}.get_by_keyword", new_callable=AsyncMock, return_value=None):
        response = await client.get("/api/price-book/match?keyword=unknown")
        assert response.status_code == 200
        assert response.json() is None


# ---------- PUT /api/price-book/batch-update ----------

@pytest.mark.anyio
async def test_batch_update_success(client):
    """批量更新 — 成功"""
    with patch(f"{SERVICE}.batch_update", new_callable=AsyncMock, return_value=3):
        response = await client.put(
            "/api/price-book/batch-update",
            json={"ids": ["1", "2", "3"], "market_price": 8000},
        )
        assert response.status_code == 200
        assert response.json()["count"] == 3


@pytest.mark.anyio
async def test_batch_update_empty_ids(client):
    """批量更新 — 空 ID 列表返回 400"""
    response = await client.put(
        "/api/price-book/batch-update",
        json={"ids": []},
    )
    assert response.status_code == 400


# ---------- POST /api/price-book/evaluate ----------

@pytest.mark.anyio
async def test_evaluate_item_success(client):
    """评估单品 — 正常返回评估结果"""
    result = {"level": "good_deal", "premium_rate": -0.15, "message": "低于行情价"}
    with patch(f"{SERVICE}.evaluate_item", new_callable=AsyncMock, return_value=result):
        response = await client.post(
            "/api/price-book/evaluate",
            json={"keyword": "macbook", "price": 8000},
        )
        assert response.status_code == 200
        assert response.json()["level"] == "good_deal"


# ---------- POST /api/price-book/evaluate-batch ----------

@pytest.mark.anyio
async def test_evaluate_batch_success(client):
    """批量评估 — 正常返回"""
    results = [
        {"keyword": "macbook", "level": "good_deal"},
        {"keyword": "iphone", "level": "overpriced"},
    ]
    with patch(f"{SERVICE}.evaluate_items_batch", new_callable=AsyncMock, return_value=results):
        response = await client.post(
            "/api/price-book/evaluate-batch",
            json={"items": [{"keyword": "macbook", "price": 8000}, {"keyword": "iphone", "price": 6000}]},
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2


@pytest.mark.anyio
async def test_evaluate_batch_empty(client):
    """批量评估 — 空列表返回空"""
    with patch(f"{SERVICE}.evaluate_items_batch", new_callable=AsyncMock, return_value=[]):
        response = await client.post(
            "/api/price-book/evaluate-batch",
            json={"items": []},
        )
        assert response.status_code == 200
        assert response.json() == []


# ---------- POST /api/price-book/auto-update-market-prices ----------

@pytest.mark.anyio
async def test_auto_update_market_prices_success(client):
    """自动更新行情价 — 成功"""
    with patch(f"{SERVICE}.auto_update_market_prices", new_callable=AsyncMock):
        response = await client.post("/api/price-book/auto-update-market-prices")
        assert response.status_code == 200
        assert "更新完成" in response.json()["message"]
