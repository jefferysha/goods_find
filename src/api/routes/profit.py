"""利润核算 API 路由"""
from fastapi import APIRouter, Query
from typing import Optional
from src.services.profit_service import ProfitService

router = APIRouter(prefix="/api/profit", tags=["profit"])
service = ProfitService()


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
