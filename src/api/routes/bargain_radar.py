"""
捡漏雷达 API 路由
"""
from fastapi import APIRouter, Query
from typing import Optional
from src.infrastructure.persistence.item_repository import ItemRepository

router = APIRouter(prefix="/api/bargain-radar", tags=["bargain-radar"])


def _evaluate_items_with_price_book(items: list, all_entries: list) -> list:
    """
    使用当前最新的价格本配置，对商品列表进行实时评估。
    与 results 路由中的逻辑一致，确保捡漏雷达也能动态刷新评估状态。
    """
    if not items or not all_entries:
        return items

    # 构建 keyword -> entry 映射
    keyword_map: dict = {}
    for entry in all_entries:
        for kw in entry.get("keywords", []):
            keyword_map[kw] = entry

    for item in items:
        item_keyword = item.get("搜索关键字", "")
        entry = keyword_map.get(item_keyword)
        if not entry or not entry.get("target_sell_price"):
            continue

        # 提取商品价格
        price_str = item.get("商品信息", {}).get("当前售价", "")
        try:
            item_price = float(str(price_str).replace("¥", "").replace(",", "").strip() or "0")
        except (ValueError, TypeError):
            continue
        if item_price <= 0:
            continue

        target = entry["target_sell_price"]
        ideal = entry.get("purchase_ideal")
        upper = entry.get("purchase_upper")
        total_fees = entry.get("total_fees", 0)
        total_cost = item_price + total_fees
        profit = target - total_cost
        profit_rate = round(profit / target, 4) if target > 0 else 0

        if ideal is None or upper is None:
            status = "no_config"
        elif item_price <= ideal:
            status = "great_deal"
        elif item_price <= upper:
            status = "good_deal"
        else:
            status = "overpriced"

        premium_rate = None
        market_price = entry.get("market_price")
        if market_price and market_price > 0:
            premium_rate = round((item_price - market_price) / market_price, 4)

        # 注入评估字段
        item["category_id"] = entry["id"]
        item["category_name"] = entry.get("category_name", "")
        item["evaluation_status"] = status
        item["purchase_range_low"] = ideal
        item["purchase_range_high"] = upper
        item["estimated_profit"] = round(profit, 2)
        item["estimated_profit_rate"] = profit_rate
        item["premium_rate"] = premium_rate

    return items


@router.get("/items")
async def get_bargain_items(
    keyword: Optional[str] = Query(None),
    status: Optional[str] = Query(None),  # great_deal/good_deal/all
    sort_by: str = Query('profit_rate'),  # profit_rate/profit/crawl_time
    ai_recommended_only: bool = Query(False),
    limit: int = Query(500)
):
    """
    获取捡漏雷达商品列表（动态评估价格本，确保始终使用最新配置）
    """
    from src.services.price_book_service import PriceBookService

    repo = ItemRepository()
    pb_service = PriceBookService()
    
    # 构建筛选条件
    filters = {}
    if keyword:
        filters['keyword'] = keyword
    if ai_recommended_only:
        filters['is_recommended'] = 1
    
    # 查询商品（先不筛选 evaluation_status，因为需要动态计算）
    items = await repo.query_items(
        filters=filters,
        order_by='crawl_time',  # 先按时间排序，稍后按评估排序
        limit=limit * 3  # 多取一些，动态评估后再筛选
    )
    
    # 动态评估价格本
    all_entries = await pb_service.get_all()
    items = _evaluate_items_with_price_book(items, all_entries)
    
    # 评估后筛选 status
    if status and status != 'all':
        items = [item for item in items if item.get('evaluation_status') == status]
    
    # 评估后排序
    if sort_by == 'profit_rate':
        items.sort(key=lambda x: x.get('estimated_profit_rate') or -999, reverse=True)
    elif sort_by == 'profit':
        items.sort(key=lambda x: x.get('estimated_profit') or -999, reverse=True)
    elif sort_by == 'crawl_time':
        items.sort(key=lambda x: x.get('爬取时间', ''), reverse=True)
    
    # 截断到 limit
    items = items[:limit]
    
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
