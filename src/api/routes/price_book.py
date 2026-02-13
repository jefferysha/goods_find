"""价格本 API 路由"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from src.services.price_book_service import PriceBookService

router = APIRouter(prefix="/api/price-book", tags=["price-book"])
service = PriceBookService()


@router.get("/entries")
async def get_all_entries():
    entries = await service.get_all()
    return entries


@router.get("/entries/{entry_id}")
async def get_entry(entry_id: str):
    entry = await service.get_by_id(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="价格本条目未找到")
    return entry


@router.get("/match")
async def match_keyword(keyword: str = Query(...)):
    """通过关键词匹配价格本条目"""
    entry = await service.get_by_keyword(keyword)
    return entry


@router.post("/entries")
async def create_entry(data: dict):
    entry = await service.create(data)
    return {"message": "创建成功", "data": entry}


@router.put("/entries/{entry_id}")
async def update_entry(entry_id: str, data: dict):
    entry = await service.update(entry_id, data)
    if not entry:
        raise HTTPException(status_code=404, detail="价格本条目未找到")
    return {"message": "更新成功", "data": entry}


@router.delete("/entries/{entry_id}")
async def delete_entry(entry_id: str):
    success = await service.delete(entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="价格本条目未找到")
    return {"message": "删除成功"}


@router.put("/batch-update")
async def batch_update_entries(data: dict):
    """批量更新价格本条目"""
    ids = data.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="请提供要更新的条目ID")
    count = await service.batch_update(ids, data)
    return {"message": f"已更新 {count} 条", "count": count}


@router.post("/evaluate")
async def evaluate_item(data: dict):
    """评估单个商品"""
    keyword = data.get("keyword", "")
    price = data.get("price", 0)
    result = await service.evaluate_item(keyword, price)
    return result


@router.post("/evaluate-batch")
async def evaluate_items_batch(data: dict):
    """批量评估商品"""
    items = data.get("items", [])
    results = await service.evaluate_items_batch(items)
    return results


@router.post("/auto-update-market-prices")
async def auto_update_market_prices():
    """自动更新行情价"""
    await service.auto_update_market_prices()
    return {"message": "行情价更新完成"}
