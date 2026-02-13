"""库存台账模型"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import uuid


class InventoryItem(BaseModel):
    """库存项"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    # 商品信息
    title: str = ""
    platform: str = "xianyu"
    keyword: str = ""
    image_url: str = ""
    item_link: str = ""

    # 成本
    purchase_price: float = 0.0             # 实际收购价
    shipping_fee: float = 0.0
    refurbish_fee: float = 0.0
    platform_fee: float = 0.0
    other_fee: float = 0.0
    total_cost: float = 0.0                 # 总成本（自动算）

    # 销售
    listing_price: Optional[float] = None   # 挂牌价
    status: str = "in_stock"                # in_stock / refurbishing / listed / sold / returned

    # 关联
    purchase_item_id: Optional[str] = None  # 来源采购项ID
    price_book_id: Optional[str] = None
    assignee: Optional[str] = None

    # 出库信息
    sold_price: Optional[float] = None
    sold_channel: Optional[str] = None      # 售出渠道
    sold_at: Optional[str] = None

    note: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class InventoryItemCreate(BaseModel):
    """创建库存项（通常从采购清单转入）"""
    title: str = ""
    platform: str = "xianyu"
    keyword: str = ""
    image_url: str = ""
    item_link: str = ""
    purchase_price: float = 0.0
    shipping_fee: float = 0.0
    refurbish_fee: float = 0.0
    platform_fee: float = 0.0
    other_fee: float = 0.0
    listing_price: Optional[float] = None
    purchase_item_id: Optional[str] = None
    price_book_id: Optional[str] = None
    assignee: Optional[str] = None
    note: str = ""


class InventoryItemUpdate(BaseModel):
    """更新库存项"""
    status: Optional[str] = None
    listing_price: Optional[float] = None
    shipping_fee: Optional[float] = None
    refurbish_fee: Optional[float] = None
    platform_fee: Optional[float] = None
    other_fee: Optional[float] = None
    sold_price: Optional[float] = None
    sold_channel: Optional[str] = None
    sold_at: Optional[str] = None
    assignee: Optional[str] = None
    note: Optional[str] = None
