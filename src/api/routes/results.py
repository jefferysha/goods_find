"""
结果数据管理路由 —— 数据源：SQLite items 表
"""
import csv
import io
import statistics as _statistics
from collections import defaultdict as _defaultdict
from datetime import datetime as _datetime, timedelta as _timedelta
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from src.infrastructure.persistence.item_repository import ItemRepository

router = APIRouter(prefix="/api/results", tags=["results"])
item_repo = ItemRepository()


@router.get("/keywords")
async def get_keywords():
    """获取所有关键词列表"""
    keywords = await item_repo.get_keywords()
    return {"keywords": keywords}


@router.get("/export")
async def export_result_csv(keyword: str = Query(..., description="搜索关键词")):
    """导出指定关键词的商品数据为 CSV 文件"""
    data = await item_repo.query(keyword=keyword, page=1, limit=10000)
    items = data.get("items", [])

    if not items:
        raise HTTPException(status_code=404, detail="没有可导出的数据")

    # 构建 CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "商品ID", "商品标题", "当前售价", "发货地区", "发布时间",
        "爬取时间", "AI推荐", "推荐理由", "卖家昵称", "卖家信用",
        "商品链接", "主图链接",
    ])
    for item in items:
        info = item.get("商品信息", {})
        ai = item.get("ai_analysis", {})
        seller = item.get("卖家信息", {})
        writer.writerow([
            info.get("商品ID", ""),
            info.get("商品标题", ""),
            info.get("当前售价", ""),
            info.get("发货地区", ""),
            info.get("发布时间", ""),
            item.get("爬取时间", ""),
            "是" if ai.get("is_recommended") else "否",
            ai.get("reason", ""),
            seller.get("卖家昵称", ""),
            seller.get("卖家信用等级", ""),
            info.get("商品链接", ""),
            info.get("商品主图链接", ""),
        ])

    csv_filename = f"{keyword.replace(' ', '_')}_export.csv"
    output.seek(0)
    # 添加 BOM 让 Excel 正确识别 UTF-8
    bom = b'\xef\xbb\xbf'
    content = bom + output.getvalue().encode("utf-8")

    # RFC 5987 编码中文文件名
    from urllib.parse import quote
    encoded_filename = quote(csv_filename)

    return StreamingResponse(
        io.BytesIO(content),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
        },
    )


@router.delete("/data")
async def delete_result_data(keyword: str = Query(..., description="搜索关键词")):
    """删除指定关键词的所有数据"""
    deleted = await item_repo.delete_by_keyword(keyword)
    return {"message": f"已删除关键词「{keyword}」的 {deleted} 条记录"}


@router.get("/items")
async def get_results(
    keyword: str = Query(..., description="搜索关键词"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    recommended_only: bool = Query(False),
    sort_by: str = Query("crawl_time"),
    sort_order: str = Query("desc"),
):
    """
    查询指定关键词的商品数据，支持分页、筛选和排序。
    数据源：SQLite items 表。
    """
    return await item_repo.query(
        keyword=keyword,
        recommended_only=recommended_only,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit,
    )


@router.get("/premium-map/overview")
async def get_premium_map_overview():
    """品类溢价概览"""
    from src.services.price_book_service import PriceBookService

    pb_service = PriceBookService()
    entries = await pb_service.get_all()
    result = []
    for entry in entries:
        keywords = entry.get("keywords", [])
        if not keywords:
            continue
        all_prices = []
        total_items = 0
        for kw in keywords:
            data = await item_repo.query(keyword=kw, page=1, limit=10000)
            items = data.get("items", [])
            total_items += len(items)
            for item in items:
                price_str = item.get("商品信息", {}).get("当前售价", "")
                price = float(str(price_str).replace("¥", "").replace(",", "").strip() or "0")
                if price > 0:
                    all_prices.append(price)
        if not all_prices:
            continue
        median_price = round(_statistics.median(all_prices), 2)
        market_price = entry.get("market_price") or median_price
        avg_premium = round((median_price - market_price) / market_price * 100, 2) if market_price > 0 else 0
        purchase_upper = entry.get("purchase_upper")
        good_deal_count = sum(1 for p in all_prices if purchase_upper and p <= purchase_upper)
        result.append({
            "id": entry["id"],
            "category_name": entry["category_name"],
            "keywords": keywords,
            "total_items": total_items,
            "market_price": market_price,
            "median_price": median_price,
            "avg_premium_rate": avg_premium,
            "good_deal_count": good_deal_count,
            "purchase_range": entry.get("purchase_range", [None, None]),
            "new_price": entry.get("new_price"),
        })
    return result


@router.get("/premium-map/distribution")
async def get_premium_distribution_detail(keyword: str = Query(...)):
    """选中品类的价格分布直方图"""
    from src.services.price_book_service import PriceBookService
    pb_service = PriceBookService()
    entry = await pb_service.get_by_keyword(keyword)
    data = await item_repo.query(keyword=keyword, page=1, limit=10000)
    items = data.get("items", [])
    prices = []
    for item in items:
        price_str = item.get("商品信息", {}).get("当前售价", "")
        price = float(str(price_str).replace("¥", "").replace(",", "").strip() or "0")
        if price > 0:
            prices.append(price)
    if not prices:
        return {"bins": [], "reference_lines": {}}
    min_p, max_p = min(prices), max(prices)
    bin_count = min(20, max(5, len(prices) // 3))
    bin_width = (max_p - min_p) / bin_count if bin_count > 0 else 1
    bins = []
    for i in range(bin_count):
        low = round(min_p + i * bin_width, 0)
        high = round(min_p + (i + 1) * bin_width, 0)
        count = sum(1 for p in prices if low <= p < high) if i < bin_count - 1 else sum(1 for p in prices if low <= p <= high)
        bins.append({"range_low": low, "range_high": high, "count": count, "label": f"¥{int(low)}-{int(high)}"})
    reference_lines = {}
    if entry:
        reference_lines["market_price"] = entry.get("market_price")
        reference_lines["new_price"] = entry.get("new_price")
        pr = entry.get("purchase_range", [None, None])
        reference_lines["purchase_ideal"] = pr[0] if pr else None
        reference_lines["purchase_upper"] = pr[1] if pr else None
    return {"bins": bins, "reference_lines": reference_lines}


@router.get("/market-trend")
async def get_market_trend(
    keyword: str = Query(...),
    days: int = Query(30, ge=7, le=90),
):
    """指定品类最近N天的价格走势"""
    from src.infrastructure.persistence.sqlite_manager import get_db as get_raw_db
    since = (_datetime.now() - _timedelta(days=days)).isoformat()
    db = await get_raw_db()
    try:
        cursor = await db.execute(
            "SELECT date(crawl_time) as day, price FROM items WHERE keyword = ? AND crawl_time >= ? AND price > 0 ORDER BY day",
            (keyword, since),
        )
        rows = await cursor.fetchall()
    finally:
        await db.close()
    daily = _defaultdict(list)
    for row in rows:
        r = dict(row)
        daily[r["day"]].append(r["price"])
    trend = []
    for day in sorted(daily.keys()):
        prices = daily[day]
        trend.append({
            "date": day,
            "avg_price": round(_statistics.mean(prices), 2),
            "median_price": round(_statistics.median(prices), 2),
            "min_price": round(min(prices), 2),
            "max_price": round(max(prices), 2),
            "count": len(prices),
        })
    return {"keyword": keyword, "days": days, "trend": trend}


@router.get("/competitor-analysis")
async def get_competitor_analysis(keyword: str = Query(...)):
    """指定品类的卖家定价分布"""
    data = await item_repo.query(keyword=keyword, page=1, limit=10000)
    items = data.get("items", [])
    seller_map = {}
    price_distribution = []
    for item in items:
        info = item.get("商品信息", {})
        seller = item.get("卖家信息", {})
        seller_name = seller.get("卖家昵称") or info.get("卖家昵称") or "未知卖家"
        price_str = info.get("当前售价", "")
        price = float(str(price_str).replace("¥", "").replace(",", "").strip() or "0")
        if price <= 0:
            continue
        price_distribution.append(price)
        if seller_name not in seller_map:
            seller_map[seller_name] = []
        seller_map[seller_name].append({
            "title": info.get("商品标题", ""),
            "price": price,
            "item_link": info.get("商品链接", ""),
            "crawl_time": item.get("爬取时间", ""),
        })
    sellers = []
    for name, items_list in sorted(seller_map.items(), key=lambda x: len(x[1]), reverse=True):
        prices = [x["price"] for x in items_list]
        sellers.append({
            "seller_name": name,
            "item_count": len(items_list),
            "avg_price": round(sum(prices) / len(prices), 2),
            "min_price": min(prices),
            "max_price": max(prices),
            "items": items_list[:5],
        })
    return {
        "keyword": keyword,
        "total_sellers": len(sellers),
        "total_items": len(price_distribution),
        "sellers": sellers,
        "price_stats": {
            "avg": round(sum(price_distribution) / len(price_distribution), 2) if price_distribution else 0,
            "min": min(price_distribution) if price_distribution else 0,
            "max": max(price_distribution) if price_distribution else 0,
        },
    }
