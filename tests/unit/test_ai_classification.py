"""测试 AI 品类归类服务"""
import asyncio
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from src.services.ai_classification_service import AIClassificationService


@pytest.fixture
def ai_service(tmp_path):
    """使用临时数据库的 AI 分类服务"""
    db_path = str(tmp_path / "test.db")
    service = AIClassificationService(db_path=db_path)
    asyncio.run(service.init())
    return service


def test_build_classification_prompt(ai_service):
    """应能构建品类归类的 prompt"""
    # Setup some categories
    from src.services.category_service import CategoryService
    cat_service = CategoryService(db_path=ai_service.db_path)
    asyncio.run(cat_service.init_tables())
    asyncio.run(cat_service.create_category(name="电子产品", level=1, keywords=["电脑", "手机"]))
    asyncio.run(cat_service.create_category(name="游戏", level=1, keywords=["游戏机", "PS5"]))
    
    prompt = asyncio.run(ai_service.build_classification_prompt(
        title="PS5 光驱版 国行 全新",
        platform="xianyu",
    ))
    assert "PS5 光驱版 国行 全新" in prompt
    assert "电子产品" in prompt or "游戏" in prompt


def test_parse_classification_response(ai_service):
    """应能解析 AI 返回的品类归类结果"""
    response_json = json.dumps({
        "category_path": "电子产品/游戏机/PS5",
        "category_level1": "电子产品",
        "category_level2": "游戏机",
        "category_level3": "PS5",
        "confidence": 0.95,
        "suggested_new_category": None,
    })
    result = ai_service.parse_classification_response(response_json)
    assert result["category_path"] == "电子产品/游戏机/PS5"
    assert result["category_level1"] == "电子产品"
    assert result["confidence"] == 0.95


def test_parse_classification_response_with_new_category(ai_service):
    """当 AI 建议新品类时应正确解析"""
    response_json = json.dumps({
        "category_path": "电子产品/VR设备",
        "category_level1": "电子产品",
        "category_level2": "VR设备",
        "category_level3": None,
        "confidence": 0.8,
        "suggested_new_category": {"name": "VR设备", "parent": "电子产品"},
    })
    result = ai_service.parse_classification_response(response_json)
    assert result["category_path"] == "电子产品/VR设备"
    assert result["suggested_new_category"]["name"] == "VR设备"


def test_parse_classification_response_invalid_json(ai_service):
    """无效 JSON 应返回默认值"""
    result = ai_service.parse_classification_response("not valid json {")
    assert result["category_path"] == ""
    assert result["confidence"] == 0.0


def test_build_product_match_prompt(ai_service):
    """应能构建商品匹配的 prompt"""
    prompt = asyncio.run(ai_service.build_product_match_prompt(
        title="PS5 ディスクエディション 新品",
        platform="mercari",
        description="新品未開封",
        images=["https://example.com/img.jpg"],
    ))
    assert "PS5" in prompt
    assert "brand" in prompt.lower() or "品牌" in prompt


def test_parse_product_match_response(ai_service):
    """应能解析商品匹配结果"""
    response_json = json.dumps({
        "brand": "Sony",
        "model": "CFI-1200A",
        "specs": {"storage": "825GB", "version": "光驱版"},
        "condition_tier": "new",
        "condition_detail": "全新未拆封",
        "suggested_group_name": "PS5 光驱版 国行",
    })
    result = ai_service.parse_product_match_response(response_json)
    assert result["brand"] == "Sony"
    assert result["model"] == "CFI-1200A"
    assert result["condition_tier"] == "new"
