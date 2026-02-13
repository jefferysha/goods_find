"""历史价格追踪路由 —— 数据源已迁移到 SQLite items 表"""
from fastapi import APIRouter, HTTPException, Query
from typing import List
from pydantic import BaseModel

from src.infrastructure.persistence.item_repository import ItemRepository

router = APIRouter(prefix="/api/history", tags=["history"])
item_repo = ItemRepository()


class BatchHistoryRequest(BaseModel):
    """批量查询请求体"""
    item_ids: List[str]
    limit_per_item: int = 50


@router.get("/{item_id}")
async def get_item_history(
    item_id: str,
    limit: int = Query(100, ge=1, le=1000),
):
    """获取某商品的价格历史"""
    history = await item_repo.get_item_price_history(item_id, limit=limit)
    return {
        "item_id": item_id,
        "count": len(history),
        "history": history,
    }


@router.get("/{item_id}/price-drop")
async def detect_price_drop(item_id: str):
    """检测商品是否降价"""
    history = await item_repo.get_item_price_history(item_id, limit=2)
    # 反转为时间倒序（仓储返回正序）
    history.reverse()

    if len(history) < 2:
        return {"item_id": item_id, "dropped": False}

    current = history[0]
    previous = history[1]
    current_price = current["price"]
    previous_price = previous["price"]

    if current_price >= previous_price:
        return {"item_id": item_id, "dropped": False}

    drop_amount = round(previous_price - current_price, 2)
    drop_rate = round(drop_amount / previous_price * 100, 2) if previous_price > 0 else 0.0

    return {
        "dropped": True,
        "item_id": item_id,
        "current_price": current_price,
        "previous_price": previous_price,
        "drop_amount": drop_amount,
        "drop_rate": drop_rate,
        "current_time": current["crawl_time"],
        "previous_time": previous["crawl_time"],
    }


@router.post("/batch")
async def get_batch_history(request: BatchHistoryRequest):
    """批量获取多个商品的价格历史"""
    if not request.item_ids:
        raise HTTPException(status_code=400, detail="item_ids 不能为空")

    result = await item_repo.get_batch_price_history(
        request.item_ids,
        limit_per_item=request.limit_per_item,
    )
    return result
