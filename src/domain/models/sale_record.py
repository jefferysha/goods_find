"""销售记录模型（从库存"已出"时自动生成）"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class SaleRecord(BaseModel):
    """销售记录"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    # 商品信息
    inventory_item_id: str                  # 关联库存项
    title: str = ""
    keyword: str = ""
    platform: str = "xianyu"

    # 财务
    purchase_price: float = 0.0
    total_cost: float = 0.0
    sold_price: float = 0.0
    profit: float = 0.0
    profit_rate: float = 0.0               # 利润率（百分比）

    # 渠道
    sold_channel: str = ""
    assignee: Optional[str] = None

    sold_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
