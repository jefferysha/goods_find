"""溢价分析路由"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from src.domain.models.market_price import MarketPrice, MarketPriceCreate, MarketPriceUpdate, PremiumThresholds
from src.domain.models.price_analysis import PriceAnalysis, BatchStats
from src.services.pricing_service import PricingService
from src.infrastructure.persistence.json_market_price_repository import JsonMarketPriceRepository
from datetime import datetime

router = APIRouter(prefix="/api/pricing", tags=["pricing"])
pricing_service = PricingService()
market_price_repo = JsonMarketPriceRepository()

# ===== 基准价 CRUD =====

@router.get("/market-prices", response_model=List[dict])
async def get_market_prices(task_id: Optional[int] = Query(None)):
    if task_id is not None:
        prices = await market_price_repo.get_by_task_id(task_id)
    else:
        prices = await market_price_repo.get_all()
    return [p.dict() for p in prices]

@router.post("/market-prices", response_model=dict)
async def create_market_price_endpoint(data: MarketPriceCreate):
    price = MarketPrice(**data.dict())
    created = await market_price_repo.create(price)
    return {"message": "基准价创建成功", "data": created.dict()}

@router.put("/market-prices/{price_id}", response_model=dict)
async def update_market_price_endpoint(price_id: str, data: MarketPriceUpdate):
    update_data = data.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.now().isoformat()
    updated = await market_price_repo.update(price_id, update_data)
    if not updated:
        raise HTTPException(status_code=404, detail="基准价未找到")
    return {"message": "基准价更新成功", "data": updated.dict()}

@router.delete("/market-prices/{price_id}")
async def delete_market_price_endpoint(price_id: str):
    success = await market_price_repo.delete(price_id)
    if not success:
        raise HTTPException(status_code=404, detail="基准价未找到")
    return {"message": "基准价删除成功"}

# ===== 价格分析 =====

@router.get("/analysis")
async def get_price_analysis(
    task_id: int = Query(...),
    run_id: Optional[str] = Query(None),
):
    """获取指定任务的价格分析结果（从 SQLite items 表查询）"""
    from src.infrastructure.persistence.json_task_repository import JsonTaskRepository
    from src.infrastructure.persistence.item_repository import ItemRepository

    task_repo = JsonTaskRepository()
    task = await task_repo.find_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务未找到")

    keyword = (task.keyword or "").strip()
    if not keyword:
        return []

    item_repo = ItemRepository()
    items = await item_repo.get_all_for_keyword(keyword)
    if not items:
        return []

    results = await pricing_service.analyze_batch(items, task_id)
    return [r.dict() for r in results]

@router.get("/batch-stats")
async def get_batch_stats(
    task_id: int = Query(...),
    run_id: Optional[str] = Query(None),
):
    """获取同批次价格统计（从 SQLite items 表查询）"""
    from src.infrastructure.persistence.json_task_repository import JsonTaskRepository
    from src.infrastructure.persistence.item_repository import ItemRepository, parse_price

    task_repo = JsonTaskRepository()
    task = await task_repo.find_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="任务未找到")

    keyword = (task.keyword or "").strip()
    if not keyword:
        return BatchStats().dict()

    item_repo = ItemRepository()
    items = await item_repo.get_all_for_keyword(keyword)
    if not items:
        return BatchStats().dict()

    prices = []
    for record in items:
        price_str = str(record.get("商品信息", {}).get("当前售价", "0"))
        p = parse_price(price_str)
        if p > 0:
            prices.append(p)

    stats = pricing_service.calculate_batch_stats(prices)
    return stats.dict()

# ===== 阈值配置 =====
# 存储在 pricing_thresholds.json 中

@router.get("/thresholds")
async def get_thresholds(task_id: Optional[int] = Query(None)):
    import os, json
    filepath = "pricing_thresholds.json"
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            all_thresholds = json.load(f)
        if task_id is not None:
            for t in all_thresholds:
                if t.get("task_id") == task_id:
                    return t
        # 返回全局默认
        for t in all_thresholds:
            if t.get("task_id") is None:
                return t
    return PremiumThresholds().dict()

@router.put("/thresholds")
async def update_thresholds(data: PremiumThresholds):
    import os, json
    filepath = "pricing_thresholds.json"
    all_thresholds = []
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            all_thresholds = json.load(f)

    # 更新或添加
    found = False
    for i, t in enumerate(all_thresholds):
        if t.get("task_id") == data.task_id:
            all_thresholds[i] = data.dict()
            found = True
            break
    if not found:
        all_thresholds.append(data.dict())

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(all_thresholds, f, ensure_ascii=False, indent=2)

    return {"message": "阈值更新成功", "data": data.dict()}
