"""
TDD: ROI 投入产出分析服务测试
先写测试 → 看它失败 → 写最少代码让它通过
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


class TestROICalculation:
    """ROI 纯计算逻辑测试（不依赖数据库）"""

    def setup_method(self):
        from src.services.roi_service import ROIService
        self.service = ROIService()

    def test_calculate_roi(self):
        """ROI = (利润 / 成本) * 100"""
        roi = self.service.calculate_roi(profit=200, cost=1000)
        assert roi == 20.0  # 200/1000*100 = 20%

    def test_calculate_roi_zero_cost(self):
        """成本为零时 ROI 为 0"""
        roi = self.service.calculate_roi(profit=200, cost=0)
        assert roi == 0.0

    def test_calculate_roi_negative(self):
        """亏损时 ROI 为负"""
        roi = self.service.calculate_roi(profit=-100, cost=1000)
        assert roi == -10.0

    def test_calculate_turnover_rate(self):
        """资金周转率 = 总收入 / 平均库存成本"""
        rate = self.service.calculate_turnover_rate(total_revenue=10000, avg_inventory_cost=5000)
        assert rate == 2.0

    def test_calculate_turnover_rate_zero_inventory(self):
        rate = self.service.calculate_turnover_rate(total_revenue=10000, avg_inventory_cost=0)
        assert rate == 0.0

    def test_calculate_daily_roi(self):
        """日均 ROI = ROI / 持有天数"""
        daily_roi = self.service.calculate_daily_roi(roi=30.0, holding_days=15)
        assert daily_roi == 2.0

    def test_calculate_daily_roi_zero_days(self):
        daily_roi = self.service.calculate_daily_roi(roi=30.0, holding_days=0)
        assert daily_roi == 0.0

    def test_calculate_annualized_roi(self):
        """年化 ROI = 日均ROI * 365"""
        annualized = self.service.calculate_annualized_roi(daily_roi=2.0)
        assert annualized == 730.0

    def test_analyze_single_item(self):
        """单品 ROI 分析"""
        result = self.service.analyze_single_item(
            purchase_price=3000,
            total_cost=3200,
            sold_price=4000,
            holding_days=10,
        )
        assert result["profit"] == 800
        assert result["roi"] == 25.0  # 800/3200*100
        assert result["daily_roi"] == 2.5  # 25/10
        assert result["annualized_roi"] == 912.5  # 2.5*365

    def test_analyze_single_item_unsold(self):
        """未出售商品的潜在 ROI 分析（用挂牌价估算）"""
        result = self.service.analyze_single_item(
            purchase_price=3000,
            total_cost=3200,
            sold_price=None,
            listing_price=3800,
            holding_days=5,
        )
        assert result["estimated"] is True
        assert result["profit"] == 600  # 3800 - 3200
        assert result["roi"] == 18.75  # 600/3200*100

    def test_aggregate_roi(self):
        """聚合多条销售记录计算总体 ROI"""
        records = [
            {"total_cost": 1000, "sold_price": 1500, "profit": 500, "holding_days": 10},
            {"total_cost": 2000, "sold_price": 2200, "profit": 200, "holding_days": 5},
            {"total_cost": 3000, "sold_price": 4000, "profit": 1000, "holding_days": 15},
        ]
        result = self.service.aggregate_roi(records)
        assert result["total_cost"] == 6000
        assert result["total_revenue"] == 7700
        assert result["total_profit"] == 1700
        assert result["overall_roi"] == pytest.approx(28.33, rel=0.01)  # 1700/6000*100
        assert result["avg_holding_days"] == 10.0

    def test_aggregate_roi_empty(self):
        """空记录时返回零值"""
        result = self.service.aggregate_roi([])
        assert result["total_cost"] == 0
        assert result["total_profit"] == 0
        assert result["overall_roi"] == 0.0


class TestROIRanking:
    """ROI 排名测试"""

    def setup_method(self):
        from src.services.roi_service import ROIService
        self.service = ROIService()

    def test_rank_by_roi(self):
        """按 ROI 排序的品类排名"""
        keyword_data = [
            {"keyword": "macbook", "total_cost": 5000, "total_profit": 2000},
            {"keyword": "iphone", "total_cost": 3000, "total_profit": 600},
            {"keyword": "ipad", "total_cost": 2000, "total_profit": 1000},
        ]
        ranked = self.service.rank_by_roi(keyword_data)
        assert ranked[0]["keyword"] == "ipad"  # ROI 50%
        assert ranked[1]["keyword"] == "macbook"  # ROI 40%
        assert ranked[2]["keyword"] == "iphone"  # ROI 20%

    def test_rank_by_roi_includes_roi_field(self):
        keyword_data = [
            {"keyword": "macbook", "total_cost": 5000, "total_profit": 2000},
        ]
        ranked = self.service.rank_by_roi(keyword_data)
        assert "roi" in ranked[0]
        assert ranked[0]["roi"] == 40.0
