"""跨平台比价分析 API 路由"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from src.services.cross_platform_service import CrossPlatformService

router = APIRouter(prefix="/api/cross-platform", tags=["cross-platform"])
service = CrossPlatformService()


# ── 品类对比 ────────────────────────────────────────────────

@router.get("/categories")
async def get_comparable_categories():
    """获取有多平台数据的品类对比列表"""
    return await service.get_comparable_categories()


@router.get("/categories/{category_id}")
async def get_category_detail(category_id: str):
    """获取单品类多平台对比详情"""
    result = await service.compare_category(category_id)
    if not result:
        raise HTTPException(status_code=404, detail="品类未找到")
    return result


# ── 混排商品列表 ────────────────────────────────────────────

@router.get("/items")
async def get_cross_platform_items(
    category_id: Optional[str] = Query(None),
    sort_by: str = Query("converted_price"),
    platforms: Optional[str] = Query(None, description="逗号分隔的平台列表"),
    limit: int = Query(200, ge=1, le=1000),
):
    """获取跨平台混排商品列表"""
    platform_list = platforms.split(",") if platforms else None
    return await service.get_cross_platform_items(
        category_id=category_id,
        sort_by=sort_by,
        platforms=platform_list,
        limit=limit,
    )


# ── 汇率管理 ───────────────────────────────────────────────

@router.get("/exchange-rates")
async def get_exchange_rates():
    """获取汇率配置"""
    return await service.get_exchange_rates()


@router.put("/exchange-rates")
async def update_exchange_rates(data: dict):
    """更新汇率配置。body: {"rates": [{"from": "JPY", "to": "CNY", "rate": 0.048}]}"""
    for entry in data.get("rates", []):
        from_c = entry.get("from", "")
        to_c = entry.get("to", "")
        rate = entry.get("rate", 0)
        if from_c and to_c and rate > 0:
            await service.set_exchange_rate(from_c, to_c, rate)
    return {"message": "汇率已更新"}


# ── 关键词-品类映射 ─────────────────────────────────────────

@router.get("/keyword-mappings")
async def get_keyword_mappings():
    """获取关键词→品类映射列表"""
    return await service.get_keyword_mappings()


@router.post("/keyword-mappings")
async def create_keyword_mapping(data: dict):
    """新增关键词映射。body: {"keyword": "...", "platform": "...", "category_id": "..."}"""
    keyword = data.get("keyword", "").strip()
    platform = data.get("platform", "").strip()
    category_id = data.get("category_id", "").strip()
    if not keyword or not platform or not category_id:
        raise HTTPException(status_code=400, detail="keyword/platform/category_id 不能为空")
    await service.set_keyword_mapping(keyword, platform, category_id)
    return {"message": "映射已创建"}


@router.delete("/keyword-mappings/{mapping_id}")
async def delete_keyword_mapping(mapping_id: int):
    """删除关键词映射"""
    await service.delete_keyword_mapping(mapping_id)
    return {"message": "映射已删除"}
