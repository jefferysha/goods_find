"""测试 item_repository 的 currency 字段支持"""
import asyncio
import json
import os
import pytest
from unittest.mock import patch, AsyncMock

from src.infrastructure.persistence.item_repository import (
    record_to_row,
    row_to_record,
    parse_price,
)


def test_record_to_row_includes_currency_from_record():
    """record_to_row 应从记录中提取 currency 字段"""
    record = {
        "爬取时间": "2026-02-16T14:30:00",
        "搜索关键字": "PS5",
        "任务名称": "PS5监控",
        "platform": "mercari",
        "currency": "JPY",
        "商品信息": {
            "商品ID": "m123",
            "商品标题": "PS5 ディスクエディション",
            "当前售价": "¥38,000",
        },
        "卖家信息": {},
        "ai_analysis": {},
    }
    row = record_to_row(record)
    assert row["currency"] == "JPY"


def test_record_to_row_defaults_currency_to_cny():
    """record_to_row 在没有 currency 字段时默认为 CNY"""
    record = {
        "爬取时间": "2026-02-16T14:30:00",
        "搜索关键字": "PS5",
        "任务名称": "PS5监控",
        "platform": "xianyu",
        "商品信息": {
            "商品ID": "x123",
            "商品标题": "PS5光驱版",
            "当前售价": "¥3200",
        },
        "卖家信息": {},
        "ai_analysis": {},
    }
    row = record_to_row(record)
    assert row["currency"] == "CNY"


def test_record_to_row_infers_currency_from_platform():
    """record_to_row 应根据平台推断 currency（当 currency 未显式提供时）"""
    record = {
        "爬取时间": "2026-02-16T14:30:00",
        "搜索关键字": "PS5",
        "任务名称": "PS5监控",
        "platform": "mercari",
        "商品信息": {
            "商品ID": "m456",
            "商品标题": "PS5",
            "当前售价": "¥38,000",
        },
        "卖家信息": {},
        "ai_analysis": {},
    }
    row = record_to_row(record)
    assert row["currency"] == "JPY"


def test_row_to_record_includes_currency():
    """row_to_record 应在输出中包含 currency 字段"""
    row = {
        "crawl_time": "2026-02-16T14:30:00",
        "keyword": "PS5",
        "task_name": "PS5监控",
        "platform": "mercari",
        "currency": "JPY",
        "category_id": None,
        "category_name": None,
        "evaluation_status": None,
        "purchase_range_low": None,
        "purchase_range_high": None,
        "estimated_profit": None,
        "estimated_profit_rate": None,
        "premium_rate": None,
        "raw_item_info": '{"商品ID": "m123"}',
        "raw_seller_info": "{}",
        "raw_ai_analysis": "{}",
    }
    record = row_to_record(row)
    assert record["currency"] == "JPY"


def test_row_to_record_defaults_currency_to_cny():
    """row_to_record 在 currency 为空时默认 CNY"""
    row = {
        "crawl_time": "2026-02-16T14:30:00",
        "keyword": "PS5",
        "task_name": "PS5监控",
        "platform": "xianyu",
        "currency": None,
        "category_id": None,
        "category_name": None,
        "evaluation_status": None,
        "purchase_range_low": None,
        "purchase_range_high": None,
        "estimated_profit": None,
        "estimated_profit_rate": None,
        "premium_rate": None,
        "raw_item_info": '{"商品ID": "x123"}',
        "raw_seller_info": "{}",
        "raw_ai_analysis": "{}",
    }
    record = row_to_record(row)
    assert record["currency"] == "CNY"
