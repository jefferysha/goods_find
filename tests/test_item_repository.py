"""item_repository 纯函数单元测试"""
import json

from src.infrastructure.persistence.item_repository import (
    parse_price,
    parse_int,
    record_to_row,
    row_to_record,
)


# ===== parse_price =====


def test_parse_price_normal():
    assert parse_price("100.50") == 100.50


def test_parse_price_integer_string():
    assert parse_price("200") == 200.0


def test_parse_price_with_yen():
    assert parse_price("¥1,234.56") == 1234.56


def test_parse_price_with_yen_no_comma():
    assert parse_price("¥99.9") == 99.9


def test_parse_price_empty():
    assert parse_price("") == 0.0


def test_parse_price_none():
    assert parse_price(None) == 0.0


def test_parse_price_invalid():
    assert parse_price("abc") == 0.0


def test_parse_price_whitespace():
    assert parse_price("  100  ") == 100.0


# ===== parse_int =====


def test_parse_int_normal_int():
    assert parse_int(42) == 42


def test_parse_int_string():
    assert parse_int("100") == 100


def test_parse_int_with_comma():
    assert parse_int("1,234") == 1234


def test_parse_int_invalid():
    assert parse_int("abc") == 0


def test_parse_int_invalid_with_default():
    assert parse_int("abc", default=5) == 5


def test_parse_int_zero():
    assert parse_int(0) == 0


def test_parse_int_whitespace_string():
    assert parse_int("  50  ") == 50


# ===== record_to_row =====


def test_record_to_row_basic():
    record = {
        "商品信息": {
            "商品ID": "12345",
            "当前售价": "100",
            "商品标题": "Test Product",
            "商品原价": "200",
            "发货地区": "上海",
            "发布时间": "2025-01-01",
            "商品链接": "http://example.com/item/12345",
            "商品主图链接": "http://example.com/img.jpg",
            "\u201c想要\u201d人数": 10,
            "浏览量": 500,
        },
        "卖家信息": {"卖家昵称": "seller1", "卖家信用等级": "5", "卖家注册时长": "3年"},
        "ai_analysis": {
            "is_recommended": True,
            "reason": "good condition",
            "risk_tags": ["价格偏低"],
        },
        "搜索关键字": "test",
        "任务名称": "task1",
        "爬取时间": "2025-01-01T12:00:00",
        "platform": "xianyu",
    }
    row = record_to_row(record)
    assert row["item_id"] == "12345"
    assert row["price"] == 100.0
    assert row["original_price"] == 200.0
    assert row["title"] == "Test Product"
    assert row["keyword"] == "test"
    assert row["task_name"] == "task1"
    assert row["is_recommended"] == 1
    assert row["ai_reason"] == "good condition"
    assert row["seller_name"] == "seller1"
    assert row["platform"] == "xianyu"
    assert row["region"] == "上海"
    assert row["crawl_time"] == "2025-01-01T12:00:00"
    # risk_tags should be JSON string
    assert json.loads(row["risk_tags"]) == ["价格偏低"]


def test_record_to_row_empty_record():
    row = record_to_row({})
    assert row["item_id"] == ""
    assert row["price"] == 0.0
    assert row["original_price"] is None  # 0 price -> None
    assert row["title"] == ""
    assert row["keyword"] == ""
    assert row["is_recommended"] == 0
    assert row["seller_name"] == ""
    assert row["platform"] == "xianyu"  # default


def test_record_to_row_not_recommended():
    record = {
        "商品信息": {"商品ID": "999"},
        "ai_analysis": {"is_recommended": False, "reason": "bad"},
    }
    row = record_to_row(record)
    assert row["is_recommended"] == 0
    assert row["ai_reason"] == "bad"


def test_record_to_row_original_price_zero():
    """original_price 为 0 时应返回 None"""
    record = {
        "商品信息": {"商品ID": "111", "当前售价": "50", "商品原价": "0"},
    }
    row = record_to_row(record)
    assert row["price"] == 50.0
    assert row["original_price"] is None


def test_record_to_row_raw_json_fields():
    """raw_* 字段应包含 JSON 字符串"""
    record = {
        "商品信息": {"商品ID": "abc", "商品标题": "手机"},
        "卖家信息": {"卖家昵称": "张三"},
        "ai_analysis": {"is_recommended": True},
    }
    row = record_to_row(record)
    assert json.loads(row["raw_item_info"])["商品标题"] == "手机"
    assert json.loads(row["raw_seller_info"])["卖家昵称"] == "张三"
    assert json.loads(row["raw_ai_analysis"])["is_recommended"] is True


# ===== row_to_record =====


def test_row_to_record_basic():
    row = {
        "crawl_time": "2025-01-01",
        "keyword": "test",
        "task_name": "task1",
        "platform": "xianyu",
        "raw_item_info": json.dumps({"商品标题": "Test Product"}),
        "raw_seller_info": json.dumps({"卖家昵称": "seller"}),
        "raw_ai_analysis": json.dumps({"is_recommended": True}),
    }
    record = row_to_record(row)
    assert record["搜索关键字"] == "test"
    assert record["任务名称"] == "task1"
    assert record["爬取时间"] == "2025-01-01"
    assert record["platform"] == "xianyu"
    assert record["商品信息"]["商品标题"] == "Test Product"
    assert record["卖家信息"]["卖家昵称"] == "seller"
    assert record["ai_analysis"]["is_recommended"] is True


def test_row_to_record_empty_raw_fields():
    """raw_* 为空字符串或 None 时应返回空 dict"""
    row = {
        "crawl_time": "",
        "keyword": "",
        "task_name": "",
        "platform": "",
        "raw_item_info": None,
        "raw_seller_info": "",
        "raw_ai_analysis": "{}",
    }
    record = row_to_record(row)
    assert record["商品信息"] == {}
    assert record["卖家信息"] == {}
    assert record["ai_analysis"] == {}


def test_row_to_record_roundtrip():
    """record -> row -> record 应保持关键字段一致"""
    original_record = {
        "商品信息": {"商品ID": "roundtrip1", "当前售价": "¥500", "商品标题": "圆滑手机"},
        "卖家信息": {"卖家昵称": "小明"},
        "ai_analysis": {"is_recommended": False, "reason": "太贵了"},
        "搜索关键字": "手机",
        "任务名称": "手机监控",
        "爬取时间": "2025-06-01",
        "platform": "xianyu",
    }
    row = record_to_row(original_record)
    restored = row_to_record(row)
    assert restored["搜索关键字"] == "手机"
    assert restored["任务名称"] == "手机监控"
    assert restored["爬取时间"] == "2025-06-01"
    assert restored["platform"] == "xianyu"
    assert restored["商品信息"]["商品ID"] == "roundtrip1"
    assert restored["卖家信息"]["卖家昵称"] == "小明"
    assert restored["ai_analysis"]["reason"] == "太贵了"
