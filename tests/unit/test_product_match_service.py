"""测试商品匹配服务"""
import asyncio
import pytest
from src.services.product_match_service import ProductMatchService


@pytest.fixture
def match_service(tmp_path):
    """使用临时数据库的 ProductMatchService"""
    db_path = str(tmp_path / "test.db")
    service = ProductMatchService(db_path=db_path)
    asyncio.run(service.init_tables())
    return service


def test_create_product_group(match_service):
    """应能创建商品组"""
    group = asyncio.run(match_service.create_product_group(
        name="PS5 光驱版 国行",
        brand="Sony",
        model="CFI-1200A",
        category_path="电子产品/游戏机/PS5",
    ))
    assert group["name"] == "PS5 光驱版 国行"
    assert group["brand"] == "Sony"
    assert group["model"] == "CFI-1200A"
    assert "id" in group


def test_link_item_to_group(match_service):
    """应能将商品关联到商品组"""
    group = asyncio.run(match_service.create_product_group(
        name="PS5 光驱版",
        brand="Sony",
        model="CFI-1200A",
    ))
    link = asyncio.run(match_service.link_item_to_group(
        item_id="x123",
        product_group_id=group["id"],
        condition_tier="like_new",
        condition_detail="9成新，轻微使用痕迹",
        confidence=0.92,
        matched_by="ai",
    ))
    assert link["item_id"] == "x123"
    assert link["product_group_id"] == group["id"]
    assert link["condition_tier"] == "like_new"
    assert link["confidence"] == 0.92


def test_get_group_items(match_service):
    """应能获取商品组下的所有商品"""
    group = asyncio.run(match_service.create_product_group(name="PS5", brand="Sony", model="CFI-1200A"))
    asyncio.run(match_service.link_item_to_group(item_id="x1", product_group_id=group["id"], condition_tier="new", confidence=0.95))
    asyncio.run(match_service.link_item_to_group(item_id="x2", product_group_id=group["id"], condition_tier="like_new", confidence=0.88))
    
    items = asyncio.run(match_service.get_group_items(group["id"]))
    assert len(items) == 2
    item_ids = {i["item_id"] for i in items}
    assert item_ids == {"x1", "x2"}


def test_list_product_groups(match_service):
    """应能列出所有商品组"""
    asyncio.run(match_service.create_product_group(name="PS5", brand="Sony", model="A"))
    asyncio.run(match_service.create_product_group(name="Switch", brand="Nintendo", model="B"))
    
    groups = asyncio.run(match_service.list_product_groups())
    assert len(groups) == 2
    names = {g["name"] for g in groups}
    assert names == {"PS5", "Switch"}


def test_get_product_group(match_service):
    """应能按 ID 获取商品组"""
    group = asyncio.run(match_service.create_product_group(name="PS5", brand="Sony", model="A"))
    result = asyncio.run(match_service.get_product_group(group["id"]))
    assert result is not None
    assert result["name"] == "PS5"


def test_move_item_between_groups(match_service):
    """应能将商品从一个组移到另一个组"""
    g1 = asyncio.run(match_service.create_product_group(name="PS5 光驱", brand="Sony", model="A"))
    g2 = asyncio.run(match_service.create_product_group(name="PS5 数字", brand="Sony", model="B"))
    asyncio.run(match_service.link_item_to_group(item_id="x1", product_group_id=g1["id"], condition_tier="new", confidence=0.9))
    
    # Move item x1 from g1 to g2
    result = asyncio.run(match_service.move_item(item_id="x1", new_group_id=g2["id"]))
    assert result is True
    
    # Verify
    g1_items = asyncio.run(match_service.get_group_items(g1["id"]))
    g2_items = asyncio.run(match_service.get_group_items(g2["id"]))
    assert len(g1_items) == 0
    assert len(g2_items) == 1
    assert g2_items[0]["item_id"] == "x1"


def test_merge_groups(match_service):
    """应能合并多个商品组"""
    g1 = asyncio.run(match_service.create_product_group(name="PS5光驱版", brand="Sony", model="A"))
    g2 = asyncio.run(match_service.create_product_group(name="PS5 Disc Edition", brand="Sony", model="A"))
    asyncio.run(match_service.link_item_to_group(item_id="x1", product_group_id=g1["id"], condition_tier="new", confidence=0.9))
    asyncio.run(match_service.link_item_to_group(item_id="x2", product_group_id=g2["id"], condition_tier="good", confidence=0.85))
    
    # Merge g2 into g1
    result = asyncio.run(match_service.merge_groups(target_group_id=g1["id"], source_group_ids=[g2["id"]]))
    assert result is True
    
    # g1 should have both items now
    items = asyncio.run(match_service.get_group_items(g1["id"]))
    assert len(items) == 2
    
    # g2 should be deleted
    g2_after = asyncio.run(match_service.get_product_group(g2["id"]))
    assert g2_after is None


def test_delete_product_group(match_service):
    """应能删除商品组（同时删除关联映射）"""
    group = asyncio.run(match_service.create_product_group(name="PS5", brand="Sony", model="A"))
    asyncio.run(match_service.link_item_to_group(item_id="x1", product_group_id=group["id"], condition_tier="new", confidence=0.9))
    
    result = asyncio.run(match_service.delete_product_group(group["id"]))
    assert result is True
    
    group_after = asyncio.run(match_service.get_product_group(group["id"]))
    assert group_after is None
    
    items = asyncio.run(match_service.get_group_items(group["id"]))
    assert len(items) == 0


def test_find_similar_groups(match_service):
    """应能按品牌+型号查找相似商品组"""
    asyncio.run(match_service.create_product_group(name="PS5 光驱版", brand="Sony", model="CFI-1200A"))
    asyncio.run(match_service.create_product_group(name="Switch OLED", brand="Nintendo", model="HEG-001"))
    
    results = asyncio.run(match_service.find_similar_groups(brand="Sony", model="CFI-1200A"))
    assert len(results) == 1
    assert results[0]["name"] == "PS5 光驱版"
