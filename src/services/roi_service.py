"""
ROI 投入产出分析服务
提供单品 ROI、聚合 ROI、资金周转率、品类排名等纯计算逻辑。
数据由上层 API 从 ProfitService / InventoryService 获取后传入。
"""
from typing import Dict, List, Any, Optional


class ROIService:
    """ROI 投入产出分析服务"""

    # ── 基础计算 ────────────────────────────────────────────

    @staticmethod
    def calculate_roi(profit: float, cost: float) -> float:
        """ROI = (利润 / 成本) * 100"""
        if cost <= 0:
            return 0.0
        return round(profit / cost * 100, 2)

    @staticmethod
    def calculate_turnover_rate(total_revenue: float, avg_inventory_cost: float) -> float:
        """资金周转率 = 总收入 / 平均库存成本"""
        if avg_inventory_cost <= 0:
            return 0.0
        return round(total_revenue / avg_inventory_cost, 2)

    @staticmethod
    def calculate_daily_roi(roi: float, holding_days: int) -> float:
        """日均 ROI = ROI / 持有天数"""
        if holding_days <= 0:
            return 0.0
        return round(roi / holding_days, 2)

    @staticmethod
    def calculate_annualized_roi(daily_roi: float) -> float:
        """年化 ROI = 日均 ROI * 365"""
        return round(daily_roi * 365, 2)

    # ── 单品分析 ────────────────────────────────────────────

    def analyze_single_item(
        self,
        purchase_price: float,
        total_cost: float,
        sold_price: Optional[float] = None,
        listing_price: Optional[float] = None,
        holding_days: int = 0,
    ) -> Dict[str, Any]:
        """
        分析单个库存商品的 ROI。

        如果商品已售出，用 sold_price 计算实际利润。
        如果尚未售出但有挂牌价，用 listing_price 估算。
        """
        estimated = sold_price is None
        effective_price = sold_price if sold_price is not None else (listing_price or total_cost)

        profit = round(effective_price - total_cost, 2)
        roi = self.calculate_roi(profit, total_cost)
        daily_roi = self.calculate_daily_roi(roi, holding_days)
        annualized_roi = self.calculate_annualized_roi(daily_roi)

        return {
            "purchase_price": purchase_price,
            "total_cost": total_cost,
            "effective_price": effective_price,
            "profit": profit,
            "roi": roi,
            "daily_roi": daily_roi,
            "annualized_roi": annualized_roi,
            "holding_days": holding_days,
            "estimated": estimated,
        }

    # ── 聚合分析 ────────────────────────────────────────────

    def aggregate_roi(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        聚合多条销售记录计算总体 ROI。

        records 中每条需要包含: total_cost, sold_price, profit, holding_days
        """
        if not records:
            return {
                "total_cost": 0,
                "total_revenue": 0,
                "total_profit": 0,
                "overall_roi": 0.0,
                "avg_holding_days": 0.0,
                "count": 0,
            }

        total_cost = sum(r.get("total_cost", 0) for r in records)
        total_revenue = sum(r.get("sold_price", 0) for r in records)
        total_profit = sum(r.get("profit", 0) for r in records)
        avg_holding = sum(r.get("holding_days", 0) for r in records) / len(records)
        overall_roi = self.calculate_roi(total_profit, total_cost)

        return {
            "total_cost": round(total_cost, 2),
            "total_revenue": round(total_revenue, 2),
            "total_profit": round(total_profit, 2),
            "overall_roi": overall_roi,
            "avg_holding_days": round(avg_holding, 2),
            "count": len(records),
        }

    # ── 品类排名 ────────────────────────────────────────────

    def rank_by_roi(self, keyword_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        按 ROI 降序排名品类。

        keyword_data 中每条需要包含: keyword, total_cost, total_profit
        """
        for item in keyword_data:
            item["roi"] = self.calculate_roi(
                item.get("total_profit", 0),
                item.get("total_cost", 0),
            )
        return sorted(keyword_data, key=lambda x: x["roi"], reverse=True)
