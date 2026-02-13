"""价格分析结果模型"""
from pydantic import BaseModel
from typing import Optional


class BatchStats(BaseModel):
    """同批次价格统计"""
    avg_price: float = 0.0
    median_price: float = 0.0
    min_price: float = 0.0
    max_price: float = 0.0
    total_count: int = 0
    percentile: float = 0.0


class PriceAnalysis(BaseModel):
    """单个商品的价格分析结果"""
    item_id: str
    item_price: float
    reference_price: Optional[float] = None
    premium_rate: Optional[float] = None
    price_level: str = "unknown"  # low_price | fair | slight_premium | high_premium | unknown
    batch_stats: Optional[BatchStats] = None
