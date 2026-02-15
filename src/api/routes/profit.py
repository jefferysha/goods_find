"""利润核算 API 路由"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from src.services.profit_service import ProfitService
from src.services.roi_service import ROIService
from src.services.inventory_service import InventoryService

router = APIRouter(prefix="/api/profit", tags=["profit"])
service = ProfitService()
roi_service = ROIService()
inventory_service = InventoryService()


@router.get("/records")
async def get_sale_records(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
):
    records = await service.get_sale_records(
        start_date=start_date, end_date=end_date,
        keyword=keyword, assignee=assignee,
    )
    return records


@router.get("/summary")
async def get_profit_summary(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
):
    summary = await service.get_summary(
        start_date=start_date, end_date=end_date, assignee=assignee,
    )
    return summary


@router.get("/by-keyword")
async def get_profit_by_keyword(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    data = await service.get_profit_by_keyword(start_date=start_date, end_date=end_date)
    return data


@router.get("/by-assignee")
async def get_profit_by_assignee(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    data = await service.get_profit_by_assignee(start_date=start_date, end_date=end_date)
    return data


@router.get("/daily-trend")
async def get_daily_profit(
    days: int = Query(30),
    assignee: Optional[str] = Query(None),
):
    data = await service.get_daily_profit(days=days, assignee=assignee)
    return data


# ── ROI 分析端点 ────────────────────────────────────────────


@router.get("/roi-overview")
async def roi_overview(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
):
    """ROI 投入产出概览：总体 ROI + 品类排名"""
    summary = await service.get_summary(start_date=start_date, end_date=end_date)
    by_keyword = await service.get_profit_by_keyword(start_date=start_date, end_date=end_date)

    # 聚合总体 ROI（字段名已统一为前端格式）
    overall = roi_service.aggregate_roi([{
        "total_cost": summary.get("total_cost", 0),
        "sold_price": summary.get("total_revenue", 0),
        "profit": summary.get("net_profit", 0),
        "holding_days": 0,
    }])

    # 品类 ROI 排名（字段名已统一为前端格式）
    keyword_ranking = roi_service.rank_by_roi([
        {
            "keyword": kw.get("keyword", ""),
            "total_cost": kw.get("total_cost", 0),
            "total_profit": kw.get("net_profit", 0),
            "sold_count": kw.get("sold_count", 0),
        }
        for kw in by_keyword
    ])

    return {
        **overall,
        "keyword_ranking": keyword_ranking,
    }


@router.get("/roi-item/{item_id}")
async def roi_by_item(item_id: str):
    """单品 ROI 分析"""
    item = await inventory_service.get_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="库存项未找到")

    result = roi_service.analyze_single_item(
        purchase_price=item.get("purchase_price", 0),
        total_cost=item.get("total_cost", 0),
        sold_price=item.get("sold_price") if item.get("status") == "sold" else None,
        listing_price=item.get("listing_price"),
        holding_days=item.get("age_days", 0),
    )
    result["item_id"] = item_id
    return result
