"""测试爬虫输出包含 currency 字段"""
from src.scraper_mercari import _parse_mercari_item


def test_mercari_item_includes_currency_jpy():
    """Mercari 解析器输出应包含 currency=JPY"""
    raw = {
        "id": "m123456",
        "name": "PS5 ディスクエディション",
        "price": 38000,
        "status": "ITEM_STATUS_ON_SALE",
        "photos": ["https://example.com/img.jpg"],
        "seller": {"id": "s1", "name": "seller1"},
    }
    result = _parse_mercari_item(raw, keyword="PS5", task_name="PS5监控")
    assert result is not None
    assert result["currency"] == "JPY"


def test_mercari_item_platform_is_mercari():
    """Mercari 解析器输出的 platform 应为 mercari"""
    raw = {
        "id": "m789",
        "name": "Switch",
        "price": 25000,
        "status": "ITEM_STATUS_ON_SALE",
        "photos": [],
    }
    result = _parse_mercari_item(raw, keyword="Switch", task_name="Switch监控")
    assert result is not None
    assert result["platform"] == "mercari"
    assert result["currency"] == "JPY"
