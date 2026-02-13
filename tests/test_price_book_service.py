"""PriceBookService 核心计算逻辑测试"""

import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from src.services.price_book_service import PriceBookService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_row(**overrides) -> dict:
    """构造模拟的 price_book 数据库行"""
    base = {
        "id": "test-id",
        "category_name": "MacBook Pro",
        "keywords": json.dumps(["macbook"]),
        "new_price": 14999,
        "market_price": 9500,
        "market_price_source": "manual",
        "target_sell_price": 10000,
        "shipping_fee": 30,
        "refurbish_fee": 100,
        "platform_fee_rate": 0.05,
        "other_fee": 0,
        "min_profit_rate": 0.15,
        "ideal_profit_rate": 0.25,
        "platform": "xianyu",
        "note": "",
        "created_at": "2026-01-01",
        "updated_at": "2026-01-01",
    }
    base.update(overrides)
    return base


# ===========================================================================
# TestRowToEntry — 纯计算逻辑，无需 mock
# ===========================================================================


class TestRowToEntry:
    """测试 _row_to_entry 的纯计算逻辑"""

    def setup_method(self):
        self.service = PriceBookService()

    # ----- 1. 标准计算 -----
    def test_calculates_purchase_range(self):
        """
        total_fees  = 30 + 100 + 0 + 10000*0.05 = 630
        upper       = 10000 - 630 - 10000*0.15   = 7870
        ideal       = 10000 - 630 - 10000*0.25   = 6870
        """
        row = _make_row()
        entry = self.service._row_to_entry(row)

        assert entry["total_fees"] == 630
        assert entry["purchase_upper"] == 7870
        assert entry["purchase_ideal"] == 6870
        assert entry["purchase_range"] == [6870, 7870]

    # ----- 2. target_sell_price = None -----
    def test_no_target_sell_price(self):
        row = _make_row(target_sell_price=None)
        entry = self.service._row_to_entry(row)

        assert entry["purchase_range"] == [None, None]
        assert entry["purchase_upper"] is None
        assert entry["purchase_ideal"] is None
        assert entry["total_fees"] == 0

    # ----- 3. 所有费用为零 -----
    def test_zero_fees(self):
        row = _make_row(
            shipping_fee=0,
            refurbish_fee=0,
            platform_fee_rate=0,
            other_fee=0,
        )
        entry = self.service._row_to_entry(row)

        assert entry["total_fees"] == 0
        assert entry["purchase_upper"] == 10000 - 0 - 10000 * 0.15  # 8500
        assert entry["purchase_ideal"] == 10000 - 0 - 10000 * 0.25  # 7500

    # ----- 4. 高费用 → 窄利润区间 -----
    def test_high_fees_narrow_range(self):
        row = _make_row(
            shipping_fee=500,
            refurbish_fee=500,
            platform_fee_rate=0.1,
            other_fee=200,
        )
        entry = self.service._row_to_entry(row)

        # total_fees = 500 + 500 + 200 + 10000*0.1 = 2200
        assert entry["total_fees"] == 2200
        # upper = 10000 - 2200 - 1500 = 6300
        assert entry["purchase_upper"] == 6300
        # ideal = 10000 - 2200 - 2500 = 5300
        assert entry["purchase_ideal"] == 5300

    # ----- 5. keywords 正确解析 -----
    def test_keywords_parsed_from_json(self):
        row = _make_row(keywords=json.dumps(["macbook", "apple"]))
        entry = self.service._row_to_entry(row)

        assert entry["keywords"] == ["macbook", "apple"]

    # ----- 6. keywords 为空或 None -----
    def test_keywords_empty_or_none(self):
        for kw_val in [None, "", "[]"]:
            row = _make_row(keywords=kw_val)
            entry = self.service._row_to_entry(row)
            assert entry["keywords"] == []

    # ----- 7. fees 字段正确嵌套 -----
    def test_fees_nested_structure(self):
        row = _make_row()
        entry = self.service._row_to_entry(row)

        assert entry["fees"]["shipping_fee"] == 30
        assert entry["fees"]["refurbish_fee"] == 100
        assert entry["fees"]["platform_fee_rate"] == 0.05
        assert entry["fees"]["other_fee"] == 0

    # ----- 8. target_sell_price=0 等同于 falsy -----
    def test_target_sell_price_zero(self):
        row = _make_row(target_sell_price=0)
        entry = self.service._row_to_entry(row)

        # 0 is falsy → 走 else 分支
        assert entry["purchase_range"] == [None, None]
        assert entry["total_fees"] == 0


# ===========================================================================
# TestEvaluateItem — async 方法，需要 mock get_by_keyword
# ===========================================================================


class TestEvaluateItem:
    """测试 evaluate_item 的评估逻辑"""

    def setup_method(self):
        self.service = PriceBookService()
        # 预构建一个标准 entry 用于 mock 返回
        self.standard_entry = self.service._row_to_entry(_make_row())

    def _mock_get_by_keyword(self, return_value):
        return patch.object(
            self.service, "get_by_keyword", new_callable=AsyncMock, return_value=return_value
        )

    # ----- 1. great_deal: 价格 < ideal -----
    @pytest.mark.anyio
    async def test_great_deal(self):
        with self._mock_get_by_keyword(self.standard_entry):
            result = await self.service.evaluate_item("macbook", 5000)

        assert result["status"] == "great_deal"
        assert result["purchase_range"] == [6870, 7870]

    # ----- 2. good_deal: ideal < 价格 <= upper -----
    @pytest.mark.anyio
    async def test_good_deal(self):
        with self._mock_get_by_keyword(self.standard_entry):
            result = await self.service.evaluate_item("macbook", 7000)

        assert result["status"] == "good_deal"

    # ----- 3. good_deal: 价格刚好 == ideal (边界) -----
    @pytest.mark.anyio
    async def test_good_deal_at_ideal_boundary(self):
        with self._mock_get_by_keyword(self.standard_entry):
            result = await self.service.evaluate_item("macbook", 6870)

        # price <= ideal → great_deal
        assert result["status"] == "great_deal"

    # ----- 4. good_deal: 价格刚好 == upper (边界) -----
    @pytest.mark.anyio
    async def test_good_deal_at_upper_boundary(self):
        with self._mock_get_by_keyword(self.standard_entry):
            result = await self.service.evaluate_item("macbook", 7870)

        # price <= upper → good_deal
        assert result["status"] == "good_deal"

    # ----- 5. overpriced: 价格 > upper -----
    @pytest.mark.anyio
    async def test_overpriced(self):
        with self._mock_get_by_keyword(self.standard_entry):
            result = await self.service.evaluate_item("macbook", 9000)

        assert result["status"] == "overpriced"

    # ----- 6. no_config: 无匹配的价格本 -----
    @pytest.mark.anyio
    async def test_no_config_when_no_entry(self):
        with self._mock_get_by_keyword(None):
            result = await self.service.evaluate_item("unknown_keyword", 5000)

        assert result["status"] == "no_config"
        assert result["purchase_range"] == [None, None]
        assert result["profit"] == 0
        assert result["profit_rate"] == 0

    # ----- 7. no_config: entry 存在但 target_sell_price 为 None -----
    @pytest.mark.anyio
    async def test_no_config_when_no_target(self):
        entry_no_target = self.service._row_to_entry(_make_row(target_sell_price=None))
        with self._mock_get_by_keyword(entry_no_target):
            result = await self.service.evaluate_item("macbook", 5000)

        assert result["status"] == "no_config"

    # ----- 8. profit 计算验证 -----
    @pytest.mark.anyio
    async def test_profit_calculation(self):
        """
        profit = target - (price + total_fees)
        profit = 10000 - (5000 + 630) = 4370
        profit_rate = 4370 / 10000 * 100 = 43.7
        """
        with self._mock_get_by_keyword(self.standard_entry):
            result = await self.service.evaluate_item("macbook", 5000)

        assert result["profit"] == 4370
        assert result["profit_rate"] == 43.7
        assert result["total_cost"] == 5630
        assert result["total_fees"] == 630

    # ----- 9. profit 计算 — 亏损场景 -----
    @pytest.mark.anyio
    async def test_profit_negative(self):
        """价格过高导致亏损：profit < 0"""
        with self._mock_get_by_keyword(self.standard_entry):
            result = await self.service.evaluate_item("macbook", 9500)

        # profit = 10000 - (9500 + 630) = -130
        assert result["profit"] == -130
        assert result["profit_rate"] == -1.3
        assert result["status"] == "overpriced"

    # ----- 10. market_diff_pct 计算 -----
    @pytest.mark.anyio
    async def test_market_diff_pct(self):
        """验证行情差异百分比计算"""
        with self._mock_get_by_keyword(self.standard_entry):
            result = await self.service.evaluate_item("macbook", 9500)

        # market_price = 9500, item_price = 9500
        # market_diff = (9500 - 9500) / 9500 * 100 = 0.0
        assert result["market_diff_pct"] == 0.0

    # ----- 11. price_book_id 返回 -----
    @pytest.mark.anyio
    async def test_returns_price_book_id(self):
        with self._mock_get_by_keyword(self.standard_entry):
            result = await self.service.evaluate_item("macbook", 5000)

        assert result["price_book_id"] == "test-id"


# ===========================================================================
# TestEvaluateItemsBatch — 批量评估
# ===========================================================================


class TestEvaluateItemsBatch:
    """测试 evaluate_items_batch 的批量评估"""

    def setup_method(self):
        self.service = PriceBookService()

    @pytest.mark.anyio
    async def test_batch_mixed_results(self):
        """多个商品批量评估，有匹配和无匹配混合"""
        items = [
            {"keyword": "macbook", "price": 5000},   # great_deal
            {"keyword": "macbook", "price": 7500},   # good_deal
            {"keyword": "macbook", "price": 9000},   # overpriced
            {"keyword": "unknown", "price": 3000},   # no_config
        ]

        all_entries = [self.service._row_to_entry(_make_row())]
        with patch.object(
            self.service, "get_all", new_callable=AsyncMock, return_value=all_entries
        ):
            results = await self.service.evaluate_items_batch(items)

        assert len(results) == 4
        assert results[0]["evaluation"]["status"] == "great_deal"
        assert results[1]["evaluation"]["status"] == "good_deal"
        assert results[2]["evaluation"]["status"] == "overpriced"
        assert results[3]["evaluation"]["status"] == "no_config"

    @pytest.mark.anyio
    async def test_batch_price_string_parsing(self):
        """价格为字符串格式时的解析"""
        items = [
            {"keyword": "macbook", "price": "¥5,000"},
        ]

        all_entries = [self.service._row_to_entry(_make_row())]
        with patch.object(
            self.service, "get_all", new_callable=AsyncMock, return_value=all_entries
        ):
            results = await self.service.evaluate_items_batch(items)

        assert len(results) == 1
        assert results[0]["evaluation"]["status"] == "great_deal"
        assert results[0]["evaluation"]["profit"] == 4370  # 10000 - (5000+630)

    @pytest.mark.anyio
    async def test_batch_uses_搜索关键字_field(self):
        """使用 '搜索关键字' 字段作为匹配键"""
        items = [
            {"搜索关键字": "macbook", "price": 5000},
        ]

        all_entries = [self.service._row_to_entry(_make_row())]
        with patch.object(
            self.service, "get_all", new_callable=AsyncMock, return_value=all_entries
        ):
            results = await self.service.evaluate_items_batch(items)

        assert results[0]["evaluation"]["status"] == "great_deal"

    @pytest.mark.anyio
    async def test_batch_empty_list(self):
        """空商品列表返回空结果"""
        with patch.object(
            self.service, "get_all", new_callable=AsyncMock, return_value=[]
        ):
            results = await self.service.evaluate_items_batch([])

        assert results == []

    @pytest.mark.anyio
    async def test_batch_includes_category_name(self):
        """批量评估结果包含 category_name"""
        items = [{"keyword": "macbook", "price": 5000}]
        all_entries = [self.service._row_to_entry(_make_row())]

        with patch.object(
            self.service, "get_all", new_callable=AsyncMock, return_value=all_entries
        ):
            results = await self.service.evaluate_items_batch(items)

        assert results[0]["evaluation"]["category_name"] == "MacBook Pro"

    @pytest.mark.anyio
    async def test_batch_profit_and_fees(self):
        """批量评估结果中的 profit / total_cost / total_fees"""
        items = [{"keyword": "macbook", "price": 7000}]
        all_entries = [self.service._row_to_entry(_make_row())]

        with patch.object(
            self.service, "get_all", new_callable=AsyncMock, return_value=all_entries
        ):
            results = await self.service.evaluate_items_batch(items)

        ev = results[0]["evaluation"]
        # profit = 10000 - (7000 + 630) = 2370
        assert ev["profit"] == 2370
        assert ev["total_cost"] == 7630
        assert ev["total_fees"] == 630
        assert ev["profit_rate"] == 23.7
