"""采购清单 API 路由"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from src.services.purchase_service import PurchaseService

router = APIRouter(prefix="/api/purchases", tags=["purchases"])
service = PurchaseService()


@router.get("/")
async def get_purchases(
    status: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
):
    items = await service.get_all(status=status, assignee=assignee)
    return items


@router.get("/stats")
async def get_purchase_stats(assignee: Optional[str] = Query(None)):
    stats = await service.get_stats(assignee=assignee)
    return stats


@router.get("/{item_id}")
async def get_purchase(item_id: str):
    item = await service.get_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="采购项未找到")
    return item


@router.post("/")
async def create_purchase(data: dict):
    item = await service.create(data)
    return {"message": "已加入采购清单", "data": item}


@router.put("/{item_id}")
async def update_purchase(item_id: str, data: dict):
    item = await service.update(item_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="采购项未找到")
    return {"message": "更新成功", "data": item}


@router.delete("/{item_id}")
async def delete_purchase(item_id: str):
    success = await service.delete(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="采购项未找到")
    return {"message": "删除成功"}


@router.post("/batch-assign")
async def batch_assign(data: dict):
    ids = data.get("ids", [])
    assignee = data.get("assignee", "")
    if not ids or not assignee:
        raise HTTPException(status_code=400, detail="请提供ID列表和负责人")
    count = await service.batch_assign(ids, assignee)
    return {"message": f"已分配 {count} 项", "count": count}


@router.post("/{item_id}/mark-purchased")
async def mark_purchased(item_id: str, data: dict):
    """标记已收货，自动创建库存项"""
    actual_price = data.get("actual_price")
    if actual_price is None:
        raise HTTPException(status_code=400, detail="请提供实际收购价")
    inv_item = await service.mark_purchased(item_id, actual_price)
    if not inv_item:
        raise HTTPException(status_code=404, detail="采购项未找到")
    return {"message": "已标记收货并入库", "data": inv_item}
