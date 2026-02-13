"""市场基准价模型"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class MarketPrice(BaseModel):
    """用户自定义的市场基准价"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: int
    keyword: str
    reference_price: float
    fair_used_price: Optional[float] = None  # 合理二手价
    condition: str = "good"  # new | like_new | good | fair
    category: str = ""  # 品类分类，如 "笔记本", "手机", "游戏主机"
    platform: str = "xianyu"  # 关联平台
    source: str = ""  # 价格来源说明，如 "京东自营 2024-01"
    note: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class MarketPriceCreate(BaseModel):
    """创建基准价的 DTO"""
    task_id: int
    keyword: str
    reference_price: float
    fair_used_price: Optional[float] = None
    condition: str = "good"
    category: str = ""
    platform: str = "xianyu"
    source: str = ""
    note: str = ""


class MarketPriceUpdate(BaseModel):
    """更新基准价的 DTO"""
    reference_price: Optional[float] = None
    fair_used_price: Optional[float] = None
    condition: Optional[str] = None
    category: Optional[str] = None
    platform: Optional[str] = None
    source: Optional[str] = None
    note: Optional[str] = None


class PremiumThresholds(BaseModel):
    """溢价分档阈值"""
    task_id: Optional[int] = None
    low_price_max: float = -15.0   # < -15% = 低价捡漏
    fair_max: float = 5.0          # -15% ~ +5% = 价格合理
    slight_premium_max: float = 20.0  # +5% ~ +20% = 轻微溢价
    # > +20% = 高溢价
