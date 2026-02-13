"""收藏与对比路由"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from src.services.favorite_service import FavoriteService

router = APIRouter(prefix="/api/favorites", tags=["favorites"])
favorite_service = FavoriteService()


class FavoriteCreateRequest(BaseModel):
    """创建收藏请求体"""
    item_id: str
    task_id: int
    item_snapshot: Dict[str, Any] = {}
    note: str = ""


class CompareRequest(BaseModel):
    """对比请求体"""
    ids: List[str]


@router.get("")
async def get_favorites(task_id: Optional[int] = Query(None)):
    """获取收藏列表"""
    items = await favorite_service.get_all(task_id=task_id)
    return {"count": len(items), "items": items}


@router.post("")
async def create_favorite(data: FavoriteCreateRequest):
    """添加收藏"""
    item = await favorite_service.create(
        item_id=data.item_id,
        task_id=data.task_id,
        item_snapshot=data.item_snapshot,
        note=data.note,
    )
    return {"message": "收藏成功", "data": item}


@router.delete("/{fav_id}")
async def delete_favorite(fav_id: str):
    """删除收藏"""
    success = await favorite_service.delete(fav_id)
    if not success:
        raise HTTPException(status_code=404, detail="收藏未找到")
    return {"message": "取消收藏成功"}


@router.post("/compare")
async def compare_favorites(data: CompareRequest):
    """对比多个收藏商品"""
    if len(data.ids) < 2:
        raise HTTPException(status_code=400, detail="至少需要选择 2 个商品进行对比")
    result = await favorite_service.compare(data.ids)
    return result
