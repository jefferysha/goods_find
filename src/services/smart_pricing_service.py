"""
智能定价建议服务
基于同类商品近期成交价，为库存商品推荐最优挂牌价。
提供「快速出手价」和「利润最大化价」两种策略。
"""
import statistics
from typing import List, Optional, Dict, Any


# 成色对价格的影响倍率
CONDITION_MULTIPLIERS = {
    "excellent": 1.10,  # 95 新及以上
    "good": 1.00,       # 9 成新
    "fair": 0.88,       # 7-8 成新
    "poor": 0.75,       # 6 成新及以下
}

# 定价策略参数
QUICK_SELL_DISCOUNT = 0.90   # 快速出手价 = 中位价 * 成色倍率 * 0.90
MAX_PROFIT_PREMIUM = 1.05    # 利润最大化 = 中位价 * 成色倍率 * 1.05


class SmartPricingService:
    """智能定价建议服务"""

    def get_condition_multiplier(self, condition: str) -> float:
        """获取成色倍率，未知成色默认 good"""
        return CONDITION_MULTIPLIERS.get(condition, CONDITION_MULTIPLIERS["good"])

    def calculate_suggested_prices(
        self,
        similar_prices: List[float],
        condition: str = "good",
        total_cost: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        计算建议挂牌价。

        Args:
            similar_prices: 同类商品近期价格列表
            condition: 成色（excellent/good/fair/poor）
            total_cost: 总成本（含采购价+运费+翻新费等）

        Returns:
            包含快速出手价、利润最大化价、市场分析数据的字典
        """
        if not similar_prices:
            return {
                "quick_sell_price": None,
                "max_profit_price": None,
                "median_price": None,
                "min_price": None,
                "max_price": None,
                "sample_count": 0,
                "estimated_profit_quick": None,
                "estimated_profit_max": None,
            }

        median = statistics.median(similar_prices)
        multiplier = self.get_condition_multiplier(condition)

        quick_sell = round(median * multiplier * QUICK_SELL_DISCOUNT, 2)
        max_profit = round(median * multiplier * MAX_PROFIT_PREMIUM, 2)

        # 如果有成本价，快速出手价不能低于成本
        if total_cost is not None and quick_sell < total_cost:
            quick_sell = round(total_cost, 2)

        result: Dict[str, Any] = {
            "quick_sell_price": quick_sell,
            "max_profit_price": max_profit,
            "median_price": round(median, 2),
            "min_price": round(min(similar_prices), 2),
            "max_price": round(max(similar_prices), 2),
            "sample_count": len(similar_prices),
        }

        if total_cost is not None:
            result["estimated_profit_quick"] = round(quick_sell - total_cost, 2)
            result["estimated_profit_max"] = round(max_profit - total_cost, 2)
        else:
            result["estimated_profit_quick"] = None
            result["estimated_profit_max"] = None

        return result
