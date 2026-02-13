"""
捡漏雷达 API 路由
"""
from fastapi import APIRouter, Query
from typing import Optional
from src.infrastructure.persistence.item_repository import ItemRepository

router = APIRouter(prefix="/api/bargain-radar", tags=["bargain-radar"])


@router.get("/items")
async def get_bargain_items(
    keyword: Optional[str] = Query(None),
    status: Optional[str] = Query(None),  # great_deal/good_deal/all
    sort_by: str = Query('profit_rate'),  # profit_rate/profit/crawl_time
    ai_recommended_only: bool = Query(False),
    limit: int = Query(500)
):
    """
    获取捡漏雷达商品列表（已包含评估信息）
    
    Args:
        keyword: 关键词筛选
        status: 评估状态筛选
        sort_by: 排序方式
        ai_recommended_only: 仅AI推荐
        limit: 最大数量
        
    Returns:
        商品列表、关键词列表、汇总统计
    """
    repo = ItemRepository()
    
    # 构建筛选条件
    filters = {}
    if keyword:
        filters['keyword'] = keyword
    if status and status != 'all':
        filters['evaluation_status'] = status
    if ai_recommended_only:
        filters['is_recommended'] = 1
    
    # 查询商品
    items = await repo.query_items(
        filters=filters,
        order_by=sort_by,
        limit=limit
    )
    
    # 获取所有关键词
    all_items = await repo.query_items(limit=10000)
    keywords = list(set(item.get('搜索关键字', '') for item in all_items if item.get('搜索关键字')))
    keywords.sort()
    
    # 计算汇总
    profitable_items = [
        item for item in items
        if item.get('evaluation_status') in ['great_deal', 'good_deal']
    ]
    
    total_profit = sum(
        item.get('estimated_profit', 0) or 0
        for item in profitable_items
        if item.get('estimated_profit') is not None and item.get('estimated_profit', 0) > 0
    )
    
    profit_rates = [
        item.get('estimated_profit_rate', 0)
        for item in profitable_items
        if item.get('estimated_profit_rate') is not None
    ]
    
    avg_profit_rate = sum(profit_rates) / len(profit_rates) if profit_rates else 0
    
    summary = {
        'totalCount': len(items),
        'profitableCount': len(profitable_items),
        'estimatedTotalProfit': total_profit,
        'averageProfitRate': avg_profit_rate
    }
    
    return {
        'items': items,
        'keywords': keywords,
        'summary': summary
    }
