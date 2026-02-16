"""测试品类树服务"""
import asyncio
import pytest
import aiosqlite
from src.services.category_service import CategoryService


@pytest.fixture
def category_service(tmp_path):
    """使用临时数据库的 CategoryService"""
    db_path = str(tmp_path / "test.db")
    service = CategoryService(db_path=db_path)
    asyncio.run(service.init_tables())
    return service


def test_create_root_category(category_service):
    """应能创建一级品类"""
    cat = asyncio.run(category_service.create_category(
        name="电子产品",
        level=1,
    ))
    assert cat["name"] == "电子产品"
    assert cat["level"] == 1
    assert cat["parent_id"] is None
    assert "id" in cat


def test_create_child_category(category_service):
    """应能创建子品类"""
    parent = asyncio.run(category_service.create_category(name="电子产品", level=1))
    child = asyncio.run(category_service.create_category(
        name="游戏机",
        level=2,
        parent_id=parent["id"],
    ))
    assert child["name"] == "游戏机"
    assert child["level"] == 2
    assert child["parent_id"] == parent["id"]


def test_create_three_level_category(category_service):
    """应能创建三级品类"""
    l1 = asyncio.run(category_service.create_category(name="电子产品", level=1))
    l2 = asyncio.run(category_service.create_category(name="游戏机", level=2, parent_id=l1["id"]))
    l3 = asyncio.run(category_service.create_category(name="PS5", level=3, parent_id=l2["id"]))
    assert l3["level"] == 3
    assert l3["parent_id"] == l2["id"]


def test_get_category_tree(category_service):
    """应能获取完整的品类树"""
    l1 = asyncio.run(category_service.create_category(name="电子产品", level=1))
    asyncio.run(category_service.create_category(name="游戏机", level=2, parent_id=l1["id"]))
    asyncio.run(category_service.create_category(name="相机", level=2, parent_id=l1["id"]))
    
    tree = asyncio.run(category_service.get_category_tree())
    assert len(tree) == 1  # 只有一个根节点
    assert tree[0]["name"] == "电子产品"
    assert len(tree[0]["children"]) == 2


def test_get_category_by_id(category_service):
    """应能按 ID 获取品类"""
    cat = asyncio.run(category_service.create_category(name="电子产品", level=1))
    result = asyncio.run(category_service.get_category(cat["id"]))
    assert result is not None
    assert result["name"] == "电子产品"


def test_update_category(category_service):
    """应能更新品类名称"""
    cat = asyncio.run(category_service.create_category(name="电子产品", level=1))
    updated = asyncio.run(category_service.update_category(cat["id"], name="数码产品"))
    assert updated["name"] == "数码产品"


def test_delete_category(category_service):
    """应能删除品类"""
    cat = asyncio.run(category_service.create_category(name="电子产品", level=1))
    result = asyncio.run(category_service.delete_category(cat["id"]))
    assert result is True
    cat_after = asyncio.run(category_service.get_category(cat["id"]))
    assert cat_after is None


def test_get_category_path(category_service):
    """应能获取品类的完整路径"""
    l1 = asyncio.run(category_service.create_category(name="电子产品", level=1))
    l2 = asyncio.run(category_service.create_category(name="游戏机", level=2, parent_id=l1["id"]))
    l3 = asyncio.run(category_service.create_category(name="PS5", level=3, parent_id=l2["id"]))
    
    path = asyncio.run(category_service.get_category_path(l3["id"]))
    assert path == "电子产品/游戏机/PS5"


def test_category_with_keywords(category_service):
    """品类应支持关联关键词"""
    cat = asyncio.run(category_service.create_category(
        name="PS5",
        level=3,
        keywords=["PS5", "PlayStation 5", "プレイステーション5"],
    ))
    assert cat["keywords"] == ["PS5", "PlayStation 5", "プレイステーション5"]
