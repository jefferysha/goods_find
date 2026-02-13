"""团队成员模型（扩展 User，增加团队相关字段）"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TeamMember(BaseModel):
    """团队成员（基于 users 表扩展）"""
    user_id: int
    username: str
    display_name: str = ""
    role: str = "member"                    # admin / member
    focus_keywords: List[str] = []          # 关注的品类关键词
    is_active: bool = True
    created_at: str = ""


class TeamMemberUpdate(BaseModel):
    """更新团队成员"""
    display_name: Optional[str] = None
    role: Optional[str] = None
    focus_keywords: Optional[List[str]] = None


class TeamPerformance(BaseModel):
    """成员业绩统计"""
    user_id: int
    username: str
    display_name: str = ""

    # 采购
    purchase_count: int = 0
    purchase_total: float = 0.0

    # 销售
    sold_count: int = 0
    revenue: float = 0.0
    total_cost: float = 0.0
    profit: float = 0.0
    avg_profit_rate: float = 0.0

    # 库存
    inventory_count: int = 0
    inventory_value: float = 0.0
