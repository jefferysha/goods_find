"""智能提醒规则路由"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

from src.domain.models.alert_rule import AlertRuleCreate, AlertRuleUpdate
from src.services.alert_service import AlertService

router = APIRouter(prefix="/api/alerts", tags=["alerts"])
alert_service = AlertService()


@router.get("/rules")
async def get_alert_rules(task_id: Optional[int] = Query(None)):
    """获取提醒规则列表，可按 task_id 筛选"""
    rules = await alert_service.get_all_rules(task_id=task_id)
    return [rule.dict() for rule in rules]


@router.post("/rules")
async def create_alert_rule(data: AlertRuleCreate):
    """创建新的提醒规则"""
    rule = await alert_service.create_rule(data)
    return {"message": "规则创建成功", "data": rule.dict()}


@router.put("/rules/{rule_id}")
async def update_alert_rule(rule_id: str, data: AlertRuleUpdate):
    """更新提醒规则"""
    rule = await alert_service.update_rule(rule_id, data)
    if rule is None:
        raise HTTPException(status_code=404, detail="规则未找到")
    return {"message": "规则更新成功", "data": rule.dict()}


@router.delete("/rules/{rule_id}")
async def delete_alert_rule(rule_id: str):
    """删除提醒规则"""
    success = await alert_service.delete_rule(rule_id)
    if not success:
        raise HTTPException(status_code=404, detail="规则未找到")
    return {"message": "规则删除成功"}
