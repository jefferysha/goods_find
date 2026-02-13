"""
溢价地图 API 路由
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from pathlib import Path
import json

router = APIRouter(prefix="/api/premium-map", tags=["premium-map"])


@router.get("/categories/{category_id}/items")
async def get_category_items(
    category_id: str,
    status: Optional[str] = Query(None, description="great_deal/good_deal/all"),
    sort_by: str = Query('profit_rate', description="profit_rate/profit/price/crawl_time"),
    limit: int = Query(50, le=200, description="Maximum number of items to return")
):
    """
    获取指定品类的商品列表
    
    Args:
        category_id: 品类ID
        status: 评估状态筛选（great_deal/good_deal/all）
        sort_by: 排序方式（profit_rate/profit/price/crawl_time）
        limit: 最大返回数量
        
    Returns:
        商品列表和总数
    """
    # 读取 JSONL 文件
    jsonl_dir = Path("jsonl")
    if not jsonl_dir.exists():
        return {'items': [], 'total': 0}
    
    items = []
    
    for jsonl_file in jsonl_dir.glob("*.jsonl"):
        try:
            with open(jsonl_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if not line.strip():
                        continue
                    try:
                        item = json.loads(line)
                        
                        # 筛选匹配的品类
                        if item.get('category_id') != category_id:
                            continue
                        
                        # 状态筛选
                        if status and status != 'all':
                            if item.get('evaluation_status') != status:
                                continue
                        
                        items.append(item)
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            print(f"Error reading {jsonl_file}: {e}")
            continue
    
    # 排序
    if sort_by == 'profit_rate':
        items.sort(key=lambda x: x.get('estimated_profit_rate') or 0, reverse=True)
    elif sort_by == 'profit':
        items.sort(key=lambda x: x.get('estimated_profit') or 0, reverse=True)
    elif sort_by == 'price':
        def extract_price(item):
            price_str = str(item.get('商品信息', {}).get('当前售价', '0'))
            price_str = price_str.replace('¥', '').replace(',', '').strip()
            try:
                return float(price_str)
            except:
                return 0
        items.sort(key=extract_price)
    else:  # crawl_time
        items.sort(key=lambda x: x.get('爬取时间', ''), reverse=True)
    
    # 限制数量
    total = len(items)
    items = items[:limit]
    
    return {
        'items': items,
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
