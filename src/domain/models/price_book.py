"""价格本（定价模板）模型"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid


class FeeTemplate(BaseModel):
    """费用模板"""
    shipping_fee: float = 0.0          # 运费（固定）
    refurbish_fee: float = 0.0         # 整备/翻新费（固定）
    platform_fee_rate: float = 0.05    # 平台手续费率（百分比）
    other_fee: float = 0.0             # 其他费用（固定）


class PriceBookEntry(BaseModel):
    """价格本条目 - 一个品类的完整定价模板"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category_name: str                      # 品类名称
    keywords: List[str] = []                # 关联的搜索关键词

    # 基准价格
    new_price: Optional[float] = None       # 新品参考价
    market_price: Optional[float] = None    # 二手行情价
    market_price_source: str = "manual"     # 行情来源: manual / auto_7d_median
    target_sell_price: Optional[float] = None  # 目标出货价

    # 费用模板
    fees: FeeTemplate = Field(default_factory=FeeTemplate)

    # 利润要求
    min_profit_rate: float = 0.15           # 最低利润率
    ideal_profit_rate: float = 0.25         # 理想利润率

    # 自动计算字段（不存储，运行时算）
    # purchase_upper: float  收购上限
    # purchase_ideal: float  理想收购价

    platform: str = "xianyu"
    note: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

    def calculate_total_fees(self) -> float:
        """计算总费用"""
        if not self.target_sell_price:
            return 0.0
        fixed = self.fees.shipping_fee + self.fees.refurbish_fee + self.fees.other_fee
        platform_fee = self.target_sell_price * self.fees.platform_fee_rate
        return round(fixed + platform_fee, 2)

    def calculate_purchase_range(self) -> tuple[Optional[float], Optional[float]]:
        """计算收购区间 [理想收购价, 收购上限]"""
        if not self.target_sell_price:
            return None, None
        total_fees = self.calculate_total_fees()
        upper = self.target_sell_price - total_fees - (self.target_sell_price * self.min_profit_rate)
        ideal = self.target_sell_price - total_fees - (self.target_sell_price * self.ideal_profit_rate)
        return round(ideal, 2), round(upper, 2)

    def calculate_profit(self, buy_price: float) -> dict:
        """给定收购价，计算预估利润"""
        if not self.target_sell_price:
            return {"profit": 0, "profit_rate": 0, "total_cost": buy_price}
        total_fees = self.calculate_total_fees()
        total_cost = buy_price + total_fees
        profit = self.target_sell_price - total_cost
        profit_rate = profit / self.target_sell_price if self.target_sell_price > 0 else 0
        return {
            "profit": round(profit, 2),
            "profit_rate": round(profit_rate * 100, 2),
            "total_cost": round(total_cost, 2),
            "total_fees": total_fees,
        }

    def evaluate_item(self, item_price: float) -> dict:
        """评估商品是否值得收购"""
        ideal, upper = self.calculate_purchase_range()
        profit_info = self.calculate_profit(item_price)

        if ideal is None or upper is None:
            status = "no_config"
        elif item_price <= ideal:
            status = "great_deal"    # 低于理想收购价，超值
        elif item_price <= upper:
            status = "good_deal"     # 在收购区间内，可收
        else:
            status = "overpriced"    # 超出收购上限

        # 相对行情
        market_diff = None
        if self.market_price and self.market_price > 0:
            market_diff = round((item_price - self.market_price) / self.market_price * 100, 2)

        return {
            "status": status,
            "purchase_range": [ideal, upper],
            "market_diff_pct": market_diff,
            **profit_info,
        }


class PriceBookCreate(BaseModel):
    """创建价格本条目"""
    category_name: str
    keywords: List[str] = []
    new_price: Optional[float] = None
    market_price: Optional[float] = None
    market_price_source: str = "manual"
    target_sell_price: Optional[float] = None
    fees: FeeTemplate = Field(default_factory=FeeTemplate)
    min_profit_rate: float = 0.15
    ideal_profit_rate: float = 0.25
    platform: str = "xianyu"
    note: str = ""


class PriceBookUpdate(BaseModel):
    """更新价格本条目"""
    category_name: Optional[str] = None
    keywords: Optional[List[str]] = None
    new_price: Optional[float] = None
    market_price: Optional[float] = None
    market_price_source: Optional[str] = None
    target_sell_price: Optional[float] = None
    fees: Optional[FeeTemplate] = None
    min_profit_rate: Optional[float] = None
    ideal_profit_rate: Optional[float] = None
    platform: Optional[str] = None
    note: Optional[str] = None


class PriceBookBatchUpdate(BaseModel):
    """批量更新价格本（只更新指定字段）"""
    ids: List[str]
    fees: Optional[FeeTemplate] = None
    min_profit_rate: Optional[float] = None
    ideal_profit_rate: Optional[float] = None
