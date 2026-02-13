"""采购清单模型"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class PurchaseItem(BaseModel):
    """采购清单项"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    # 商品信息（快照）
    item_id: str = ""                       # 原平台商品ID
    title: str = ""
    price: float = 0.0                      # 卖家标价
    image_url: str = ""
    item_link: str = ""
    platform: str = "xianyu"
    keyword: str = ""                       # 关联关键词

    # 价格本关联
    price_book_id: Optional[str] = None
    estimated_profit: Optional[float] = None
    estimated_profit_rate: Optional[float] = None
    purchase_range_low: Optional[float] = None
    purchase_range_high: Optional[float] = None

    # 采购管理
    status: str = "new"                     # new / contacting / negotiating / purchased / abandoned
    assignee: Optional[str] = None          # 负责人用户名
    actual_price: Optional[float] = None    # 实际收购价
    note: str = ""

    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class PurchaseItemCreate(BaseModel):
    """创建采购项"""
    item_id: str = ""
    title: str = ""
    price: float = 0.0
    image_url: str = ""
    item_link: str = ""
    platform: str = "xianyu"
    keyword: str = ""
    price_book_id: Optional[str] = None
    estimated_profit: Optional[float] = None
    estimated_profit_rate: Optional[float] = None
    purchase_range_low: Optional[float] = None
    purchase_range_high: Optional[float] = None
    assignee: Optional[str] = None
    note: str = ""


class PurchaseItemUpdate(BaseModel):
    """更新采购项"""
    status: Optional[str] = None
    assignee: Optional[str] = None
    actual_price: Optional[float] = None
    note: Optional[str] = None
