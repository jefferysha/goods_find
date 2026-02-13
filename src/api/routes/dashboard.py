"""数据仪表盘路由"""
from fastapi import APIRouter, Query
from typing import Optional

from src.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
dashboard_service = DashboardService()


@router.get("/stats")
async def get_stats():
    """获取汇总统计"""
    return await dashboard_service.get_stats()


@router.get("/price-trend")
async def get_price_trend(
    task_id: Optional[int] = Query(None, description="任务 ID"),
    days: int = Query(30, ge=1, le=365, description="天数"),
):
    """获取指定任务的价格趋势（task_id 为空时返回空列表）"""
    if task_id is None:
        return {"task_id": None, "days": days, "trend": []}
    trend = await dashboard_service.get_price_trend(task_id, days=days)
    return {
        "task_id": task_id,
        "days": days,
        "trend": trend,
    }


@router.get("/premium-distribution")
async def get_premium_distribution(
    task_id: Optional[int] = Query(None, description="任务 ID"),
):
    """获取指定任务的溢价率分布（task_id 为空时返回空分布）"""
    if task_id is None:
        return {"task_id": None, "total": 0, "distribution": []}
    return await dashboard_service.get_premium_distribution(task_id)


@router.get("/top-keywords")
async def get_top_keywords(
    limit: int = Query(10, ge=1, le=50, description="返回数量"),
):
    """获取热门关键词统计"""
    keywords = await dashboard_service.get_top_keywords(limit=limit)
    return {"keywords": keywords}


@router.get("/bargain-leaderboard")
async def get_bargain_leaderboard(
    limit: int = Query(10, ge=1, le=50, description="返回数量"),
):
    """获取捡漏排行榜 Top N（按溢价率从低到高）"""
    return await dashboard_service.get_bargain_leaderboard(limit=limit)
