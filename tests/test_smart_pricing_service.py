"""
TDD: 智能定价建议服务测试
先写测试 → 看它失败 → 写最少代码让它通过
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


class TestSmartPricingService:
    """智能定价建议服务 - 纯计算逻辑测试"""

    def setup_method(self):
        from src.services.smart_pricing_service import SmartPricingService
        self.service = SmartPricingService()

    def test_suggest_quick_sell_price(self):
        """快速出手价 = 同类中位价 * 0.9（比中位价低 10%）"""
        similar_prices = [3000, 3200, 3500, 3800, 4000]
        result = self.service.calculate_suggested_prices(similar_prices, condition="good")
        assert result["quick_sell_price"] > 0
        assert result["quick_sell_price"] < result["max_profit_price"]

    def test_suggest_max_profit_price(self):
        """利润最大化价 = 同类中位价 * 1.05（比中位价高 5%）"""
        similar_prices = [3000, 3200, 3500, 3800, 4000]
        result = self.service.calculate_suggested_prices(similar_prices, condition="good")
        assert result["max_profit_price"] > 0

    def test_condition_affects_pricing(self):
        """成色影响定价：excellent > good > fair"""
        prices = [3000, 3200, 3500, 3800, 4000]
        excellent = self.service.calculate_suggested_prices(prices, condition="excellent")
        good = self.service.calculate_suggested_prices(prices, condition="good")
        fair = self.service.calculate_suggested_prices(prices, condition="fair")

        assert excellent["max_profit_price"] > good["max_profit_price"]
        assert good["max_profit_price"] > fair["max_profit_price"]

    def test_empty_similar_prices(self):
        """没有同类价格数据时返回 None"""
        result = self.service.calculate_suggested_prices([], condition="good")
        assert result["quick_sell_price"] is None
        assert result["max_profit_price"] is None

    def test_single_similar_price(self):
        """只有一个同类价格时仍能计算"""
        result = self.service.calculate_suggested_prices([3000], condition="good")
        assert result["quick_sell_price"] is not None
        assert result["max_profit_price"] is not None

    def test_result_includes_market_analysis(self):
        """返回值应包含市场分析摘要"""
        prices = [3000, 3200, 3500, 3800, 4000]
        result = self.service.calculate_suggested_prices(prices, condition="good")
        assert "median_price" in result
        assert "min_price" in result
        assert "max_price" in result
        assert "sample_count" in result
        assert result["sample_count"] == 5
        assert result["median_price"] == 3500

    def test_pricing_with_cost(self):
        """有成本价时，快速出手价不应低于成本"""
        prices = [3000, 3200, 3500, 3800, 4000]
        result = self.service.calculate_suggested_prices(
            prices, condition="good", total_cost=3200
        )
        assert result["quick_sell_price"] >= 3200
        assert "estimated_profit_quick" in result
        assert "estimated_profit_max" in result

    def test_pricing_without_cost(self):
        """没有成本价时不应包含利润估算"""
        prices = [3000, 3200, 3500, 3800, 4000]
        result = self.service.calculate_suggested_prices(prices, condition="good")
        assert result.get("estimated_profit_quick") is None
        assert result.get("estimated_profit_max") is None


class TestSmartPricingConditionMultiplier:
    """成色倍率测试"""

    def setup_method(self):
        from src.services.smart_pricing_service import SmartPricingService
        self.service = SmartPricingService()

    def test_excellent_multiplier(self):
        m = self.service.get_condition_multiplier("excellent")
        assert m > 1.0

    def test_good_multiplier(self):
        m = self.service.get_condition_multiplier("good")
        assert m == 1.0

    def test_fair_multiplier(self):
        m = self.service.get_condition_multiplier("fair")
        assert m < 1.0

    def test_poor_multiplier(self):
        m = self.service.get_condition_multiplier("poor")
        assert m < self.service.get_condition_multiplier("fair")

    def test_unknown_defaults_to_good(self):
        m = self.service.get_condition_multiplier("unknown_value")
        assert m == 1.0
