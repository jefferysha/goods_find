"""
溢价地图 API 路由
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from pathlib import Path
import json

router = APIRouter(prefix="/api/premium-map", tags=["premium-map"])


def _extract_price(item: dict) -> float:
    """从商品记录中提取价格"""
    price_str = str(item.get('商品信息', {}).get('当前售价', '0'))
    price_str = price_str.replace('¥', '').replace(',', '').strip()
    try:
        return float(price_str)
    except (ValueError, TypeError):
        return 0.0


@router.get("/categories/{category_id}/items")
async def get_category_items(
    category_id: str,
    status: Optional[str] = Query(None, description="great_deal/good_deal/all"),
    sort_by: str = Query('profit_rate', description="profit_rate/profit/price/crawl_time"),
    platform: Optional[str] = Query(None, description="Filter by platform: xianyu/mercari/all"),
    limit: int = Query(50, le=200, description="Maximum number of items to return")
):
    """
    获取指定品类的商品列表。
    通过 PriceBookService 获取品类关键词和价格区间，
    从数据库查询商品后按价格区间动态计算评估状态。
    """
    from src.services.price_book_service import PriceBookService
    from src.infrastructure.persistence.item_repository import ItemRepository

    pb_service = PriceBookService()
    entry = await pb_service.get_by_id(category_id)
    if not entry:
        return {'items': [], 'total': 0}

    keywords = entry.get("keywords", [])
    if not keywords:
        return {'items': [], 'total': 0}

    purchase_ideal = entry.get("purchase_ideal")
    purchase_upper = entry.get("purchase_upper")
    target_sell = entry.get("target_sell_price")
    total_fees = entry.get("total_fees", 0)

    # 从数据库查询该品类所有关键词的商品
    item_repo = ItemRepository()
    all_items = []
    for kw in keywords:
        data = await item_repo.query(keyword=kw, page=1, limit=10000)
        all_items.extend(data.get("items", []))

    # 动态计算评估状态和利润
    enriched = []
    for item in all_items:
        price = _extract_price(item)
        if price <= 0:
            continue

        # 计算评估状态（与概览的 good_deal_count 逻辑一致）
        if purchase_ideal is not None and price <= purchase_ideal:
            eval_status = 'great_deal'
        elif purchase_upper is not None and price <= purchase_upper:
            eval_status = 'good_deal'
        else:
            eval_status = 'overpriced'

        # 计算预估利润（基于目标售价和费用，与 evaluate_item 一致）
        est_profit = None
        est_profit_rate = None
        if target_sell and target_sell > 0:
            total_cost = price + total_fees
            est_profit = round(target_sell - total_cost, 2)
            est_profit_rate = round((target_sell - total_cost) / target_sell, 4)

        item['evaluation_status'] = eval_status
        item['estimated_profit'] = est_profit
        item['estimated_profit_rate'] = est_profit_rate
        enriched.append(item)

    # 状态筛选
    if status and status != 'all':
        if status == 'good_deal':
            # "可收"包含 good_deal 和 great_deal
            enriched = [i for i in enriched if i['evaluation_status'] in ('good_deal', 'great_deal')]
        else:
            enriched = [i for i in enriched if i['evaluation_status'] == status]

    # 平台筛选
    if platform and platform != 'all':
        enriched = [i for i in enriched if i.get('platform', 'xianyu') == platform]

    # 排序
    if sort_by == 'profit_rate':
        enriched.sort(key=lambda x: x.get('estimated_profit_rate') or 0, reverse=True)
    elif sort_by == 'profit':
        enriched.sort(key=lambda x: x.get('estimated_profit') or 0, reverse=True)
    elif sort_by == 'price':
        enriched.sort(key=lambda x: _extract_price(x))
    else:  # crawl_time
        enriched.sort(key=lambda x: x.get('爬取时间', ''), reverse=True)

    total = len(enriched)
    enriched = enriched[:limit]

    return {
        'items': enriched,
        'total': total
    }


@router.post("/categories/{category_id}/items/batch-purchase")
async def batch_add_to_purchase(
    category_id: str,
    payload: dict
):
    """
    批量加入采购清单
    
    Args:
        category_id: 品类ID
        payload: 包含 item_ids 列表的字典
        
    Returns:
        成功标志和添加数量
    """
    item_ids = payload.get('item_ids', [])
    if not item_ids:
        raise HTTPException(status_code=400, detail="item_ids is required")
    
    from src.services.purchase_service import PurchaseService
    
    purchase_service = PurchaseService()
    added_count = 0
    
    # 读取商品数据
    jsonl_dir = Path("jsonl")
    if not jsonl_dir.exists():
        return {'success': True, 'added_count': 0}
    
    for jsonl_file in jsonl_dir.glob("*.jsonl"):
        try:
            with open(jsonl_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if not line.strip():
                        continue
                    try:
                        item = json.loads(line)
                        item_id = item.get('商品信息', {}).get('商品ID')
                        
                        if item_id not in item_ids:
                            continue
                        
                        # 提取价格
                        price_str = str(item.get('商品信息', {}).get('当前售价', '0'))
                        price_str = price_str.replace('¥', '').replace(',', '').strip()
                        try:
                            price = float(price_str)
                        except:
                            price = 0.0
                        
                        # 加入采购清单
                        purchase_service.add_to_purchase_list(
                            item_id=item_id,
                            title=item.get('商品信息', {}).get('商品标题', ''),
                            price=price,
                            image_url=item.get('商品信息', {}).get('商品主图链接', ''),
                            item_link=item.get('商品信息', {}).get('商品链接', ''),
                            platform=item.get('platform', 'xianyu'),
                            keyword=item.get('搜索关键字', ''),
                            estimated_profit=item.get('estimated_profit'),
                            estimated_profit_rate=item.get('estimated_profit_rate'),
                            purchase_range_low=item.get('purchase_range_low'),
                            purchase_range_high=item.get('purchase_range_high')
                        )
                        added_count += 1
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            print(f"Error reading {jsonl_file}: {e}")
            continue
    
    return {
        'success': True,
        'added_count': added_count
    }
