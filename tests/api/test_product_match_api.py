"""测试商品匹配 API"""
import pytest
import asyncio
from fastapi import FastAPI
from fastapi.testclient import TestClient
from src.api.routes.product_match import router
import os


@pytest.fixture
def match_client(tmp_path):
    """创建测试用的 API 客户端"""
    os.environ["TEST_DB_PATH"] = str(tmp_path / "test.db")
    
    app = FastAPI()
    app.include_router(router)
    
    # Initialize tables
    from src.services.product_match_service import ProductMatchService
    service = ProductMatchService(db_path=str(tmp_path / "test.db"))
    asyncio.run(service.init_tables())
    
    yield TestClient(app)
    
    if "TEST_DB_PATH" in os.environ:
        del os.environ["TEST_DB_PATH"]


def test_create_product_group(match_client):
    """POST /api/product-groups 应能创建商品组"""
    resp = match_client.post("/api/product-groups", json={
        "name": "PS5 光驱版",
        "brand": "Sony",
        "model": "CFI-1200A",
        "category_path": "电子产品/游戏机/PS5",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "PS5 光驱版"
    assert data["brand"] == "Sony"
    assert "id" in data


def test_list_product_groups(match_client):
    """GET /api/product-groups 应返回商品组列表"""
    match_client.post("/api/product-groups", json={"name": "PS5", "brand": "Sony", "model": "A"})
    match_client.post("/api/product-groups", json={"name": "Switch", "brand": "Nintendo", "model": "B"})
    
    resp = match_client.get("/api/product-groups")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2


def test_get_product_group(match_client):
    """GET /api/product-groups/{id} 应返回指定商品组"""
    create_resp = match_client.post("/api/product-groups", json={"name": "PS5", "brand": "Sony", "model": "A"})
    group_id = create_resp.json()["id"]
    
    resp = match_client.get(f"/api/product-groups/{group_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "PS5"


def test_link_item_to_group(match_client):
    """POST /api/product-groups/{id}/items 应能关联商品"""
    create_resp = match_client.post("/api/product-groups", json={"name": "PS5", "brand": "Sony", "model": "A"})
    group_id = create_resp.json()["id"]
    
    resp = match_client.post(f"/api/product-groups/{group_id}/items", json={
        "item_id": "x123",
        "condition_tier": "like_new",
        "condition_detail": "9成新",
        "confidence": 0.92,
    })
    assert resp.status_code == 200
    assert resp.json()["item_id"] == "x123"


def test_get_group_items(match_client):
    """GET /api/product-groups/{id}/items 应返回组内商品"""
    create_resp = match_client.post("/api/product-groups", json={"name": "PS5", "brand": "Sony", "model": "A"})
    group_id = create_resp.json()["id"]
    
    match_client.post(f"/api/product-groups/{group_id}/items", json={
        "item_id": "x1", "condition_tier": "new", "confidence": 0.95,
    })
    match_client.post(f"/api/product-groups/{group_id}/items", json={
        "item_id": "x2", "condition_tier": "good", "confidence": 0.88,
    })
    
    resp = match_client.get(f"/api/product-groups/{group_id}/items")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_merge_groups(match_client):
    """POST /api/product-groups/merge 应能合并商品组"""
    g1 = match_client.post("/api/product-groups", json={"name": "PS5 光驱", "brand": "Sony", "model": "A"}).json()
    g2 = match_client.post("/api/product-groups", json={"name": "PS5 Disc", "brand": "Sony", "model": "A"}).json()
    match_client.post(f"/api/product-groups/{g1['id']}/items", json={"item_id": "x1", "condition_tier": "new", "confidence": 0.9})
    match_client.post(f"/api/product-groups/{g2['id']}/items", json={"item_id": "x2", "condition_tier": "good", "confidence": 0.85})
    
    resp = match_client.post("/api/product-groups/merge", json={
        "target_group_id": g1["id"],
        "source_group_ids": [g2["id"]],
    })
    assert resp.status_code == 200
    assert resp.json()["success"] is True
    
    # Verify
    items_resp = match_client.get(f"/api/product-groups/{g1['id']}/items")
    assert len(items_resp.json()) == 2


def test_move_item(match_client):
    """POST /api/product-groups/{id}/items/{item_id}/move 应能移动商品"""
    g1 = match_client.post("/api/product-groups", json={"name": "G1", "brand": "Sony", "model": "A"}).json()
    g2 = match_client.post("/api/product-groups", json={"name": "G2", "brand": "Sony", "model": "B"}).json()
    match_client.post(f"/api/product-groups/{g1['id']}/items", json={"item_id": "x1", "condition_tier": "new", "confidence": 0.9})
    
    resp = match_client.post(f"/api/product-groups/{g1['id']}/items/x1/move", json={
        "new_group_id": g2["id"],
    })
    assert resp.status_code == 200
    assert resp.json()["success"] is True


def test_delete_product_group(match_client):
    """DELETE /api/product-groups/{id} 应能删除商品组"""
    g = match_client.post("/api/product-groups", json={"name": "PS5", "brand": "Sony", "model": "A"}).json()
    
    resp = match_client.delete(f"/api/product-groups/{g['id']}")
    assert resp.status_code == 200
    assert resp.json()["success"] is True
