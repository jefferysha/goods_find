"""库存台账 API 路由"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from src.services.inventory_service import InventoryService
from src.services.smart_pricing_service import SmartPricingService
from src.infrastructure.persistence.item_repository import ItemRepository

router = APIRouter(prefix="/api/inventory", tags=["inventory"])
service = InventoryService()
smart_pricing_service = SmartPricingService()
item_repo = ItemRepository()


@router.get("/")
async def get_inventory(
    status: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
):
    items = await service.get_all(status=status, assignee=assignee, keyword=keyword)
    return items


@router.get("/summary")
async def get_inventory_summary(assignee: Optional[str] = Query(None)):
    summary = await service.get_summary(assignee=assignee)
    return summary


@router.get("/aging-alerts")
async def get_aging_alerts(
    days: int = Query(7),
    assignee: Optional[str] = Query(None),
):
    alerts = await service.get_aging_alerts(days_threshold=days, assignee=assignee)
    return alerts


@router.get("/{item_id}/pricing-suggestion")
async def get_pricing_suggestion(
    item_id: str,
    condition: str = Query("good", description="成色：excellent/good/fair/poor"),
    days: int = Query(30, description="参考近多少天的数据"),
):
    """获取库存商品的智能定价建议"""
    item = await service.get_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="库存项未找到")

    keyword = item.get("keyword", "")
    total_cost = item.get("total_cost")

    # 获取同关键词近期价格
    similar_prices = await item_repo.get_similar_prices(keyword, days=days)

    # 计算定价建议
    suggestion = smart_pricing_service.calculate_suggested_prices(
        similar_prices=similar_prices,
        condition=condition,
        total_cost=total_cost,
    )
    suggestion["item_id"] = item_id
    suggestion["keyword"] = keyword
    suggestion["condition"] = condition

    return suggestion


@router.get("/{item_id}")
async def get_inventory_item(item_id: str):
    item = await service.get_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="库存项未找到")
    return item


@router.post("/")
async def create_inventory_item(data: dict):
    item = await service.create(data)
    return {"message": "入库成功", "data": item}


@router.put("/{item_id}")
async def update_inventory_item(item_id: str, data: dict):
    item = await service.update(item_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="库存项未找到")
    return {"message": "更新成功", "data": item}


@router.post("/{item_id}/mark-sold")
async def mark_sold(item_id: str, data: dict):
    """标记已出，自动创建销售记录"""
    sold_price = data.get("sold_price")
    if sold_price is None:
        raise HTTPException(status_code=400, detail="请提供售出价格")
    sold_channel = data.get("sold_channel", "")
    item = await service.mark_sold(item_id, sold_price, sold_channel)
    if not item:
        raise HTTPException(status_code=404, detail="库存项未找到")
    return {"message": "已标记售出", "data": item}


@router.delete("/{item_id}")
async def delete_inventory_item(item_id: str):
    success = await service.delete(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="库存项未找到")
    return {"message": "删除成功"}
