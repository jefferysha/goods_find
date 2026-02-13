"""智能提醒规则模型"""
from pydantic import BaseModel, Field
from typing import Optional, List
import uuid


class AlertCondition(BaseModel):
    """提醒条件"""
    field: str  # price | premium_rate | ai_score
    operator: str  # lt | lte | gt | gte | eq
    value: float


class AlertRule(BaseModel):
    """提醒规则"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: Optional[int] = None
    name: str
    enabled: bool = True
    conditions: List[AlertCondition] = []
    channels: List[str] = []  # ntfy | bark | telegram | webhook
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AlertRuleCreate(BaseModel):
    """创建提醒规则的请求体"""
    task_id: Optional[int] = None
    name: str
    enabled: bool = True
    conditions: List[AlertCondition] = []
    channels: List[str] = []


class AlertRuleUpdate(BaseModel):
    """更新提醒规则的请求体"""
    name: Optional[str] = None
    enabled: Optional[bool] = None
    conditions: Optional[List[AlertCondition]] = None
    channels: Optional[List[str]] = None
