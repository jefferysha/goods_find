"""测试品类 API 路由"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from src.api.routes.categories import router


@pytest.fixture
def category_client(tmp_path):
    """创建测试用的 API 客户端"""
    import os
    os.environ["TEST_DB_PATH"] = str(tmp_path / "test.db")

    app = FastAPI()
    app.include_router(router)

    # Initialize tables
    import asyncio
    from src.services.category_service import CategoryService
    service = CategoryService(db_path=str(tmp_path / "test.db"))
    asyncio.run(service.init_tables())

    yield TestClient(app)

    # Cleanup
    if "TEST_DB_PATH" in os.environ:
        del os.environ["TEST_DB_PATH"]


def test_create_category(category_client):
    """POST /api/categories 应能创建品类"""
    resp = category_client.post("/api/categories", json={
        "name": "电子产品",
        "level": 1,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "电子产品"
    assert data["level"] == 1
    assert "id" in data


def test_get_category_tree(category_client):
    """GET /api/categories/tree 应返回品类树"""
    # Create data
    resp1 = category_client.post("/api/categories", json={"name": "电子产品", "level": 1})
    parent_id = resp1.json()["id"]
    category_client.post("/api/categories", json={"name": "游戏机", "level": 2, "parent_id": parent_id})

    resp = category_client.get("/api/categories/tree")
    assert resp.status_code == 200
    tree = resp.json()
    assert len(tree) >= 1
    assert tree[0]["name"] == "电子产品"
    assert len(tree[0]["children"]) == 1


def test_get_category_by_id(category_client):
    """GET /api/categories/{id} 应返回指定品类"""
    resp1 = category_client.post("/api/categories", json={"name": "电子产品", "level": 1})
    cat_id = resp1.json()["id"]

    resp = category_client.get(f"/api/categories/{cat_id}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "电子产品"


def test_update_category(category_client):
    """PUT /api/categories/{id} 应能更新品类"""
    resp1 = category_client.post("/api/categories", json={"name": "电子产品", "level": 1})
    cat_id = resp1.json()["id"]

    resp = category_client.put(f"/api/categories/{cat_id}", json={"name": "数码产品"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "数码产品"


def test_delete_category(category_client):
    """DELETE /api/categories/{id} 应能删除品类"""
    resp1 = category_client.post("/api/categories", json={"name": "电子产品", "level": 1})
    cat_id = resp1.json()["id"]

    resp = category_client.delete(f"/api/categories/{cat_id}")
    assert resp.status_code == 200
    assert resp.json()["success"] is True


def test_get_category_path(category_client):
    """GET /api/categories/{id}/path 应返回品类路径"""
    resp1 = category_client.post("/api/categories", json={"name": "电子产品", "level": 1})
    l1_id = resp1.json()["id"]
    resp2 = category_client.post("/api/categories", json={"name": "游戏机", "level": 2, "parent_id": l1_id})
    l2_id = resp2.json()["id"]

    resp = category_client.get(f"/api/categories/{l2_id}/path")
    assert resp.status_code == 200
    assert resp.json()["path"] == "电子产品/游戏机"
