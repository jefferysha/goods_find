"""跨平台比价分析服务"""
import statistics
from typing import List, Dict, Any, Optional
from src.infrastructure.persistence.sqlite_manager import get_db

# 平台→货币映射
PLATFORM_CURRENCY = {
    "xianyu": "CNY",
    "mercari": "JPY",
}

BASE_CURRENCY = "CNY"


def classify_arbitrage(price_gap_pct: float) -> str:
    """根据差价百分比判定套利等级"""
    if price_gap_pct >= 30:
        return "high"
    if price_gap_pct >= 15:
        return "medium"
    if price_gap_pct >= 5:
        return "low"
    return "none"


class CrossPlatformService:
    """跨平台比价分析引擎"""

    # ── 汇率管理 ────────────────────────────────────────────

    async def get_exchange_rates(self) -> Dict[str, float]:
        """获取所有汇率配置"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT key, value FROM cross_platform_config WHERE key LIKE 'exchange_rate_%'"
            )
            rows = await cursor.fetchall()
            rates = {}
            for r in rows:
                d = dict(r)
                # key 格式: exchange_rate_JPY_to_CNY → JPY_to_CNY
                rate_key = d["key"].replace("exchange_rate_", "")
                try:
                    rates[rate_key] = float(d["value"])
                except (ValueError, TypeError):
                    pass
            return rates
        finally:
            await db.close()

    async def set_exchange_rate(self, from_currency: str, to_currency: str, rate: float) -> None:
        """设置汇率"""
        key = f"exchange_rate_{from_currency}_to_{to_currency}"
        db = await get_db()
        try:
            await db.execute(
                "INSERT OR REPLACE INTO cross_platform_config (key, value, updated_at) "
                "VALUES (?, ?, datetime('now'))",
                (key, str(rate)),
            )
            await db.commit()
        finally:
            await db.close()

    async def convert_price(self, price: float, currency: str) -> float:
        """将价格换算为基准货币 (CNY)"""
        if currency == BASE_CURRENCY:
            return round(price, 2)
        rates = await self.get_exchange_rates()
        rate_key = f"{currency}_to_{BASE_CURRENCY}"
        rate = rates.get(rate_key, 0)
        return round(price * rate, 2)

    # ── 关键词-品类映射 ──────────────────────────────────────

    async def get_keyword_mappings(self) -> List[Dict[str, Any]]:
        """获取所有关键词-品类映射"""
        db = await get_db()
        try:
            cursor = await db.execute(
                """SELECT m.id, m.keyword, m.platform, m.category_id,
                          COALESCE(p.category_name, '') as category_name
                   FROM keyword_category_map m
                   LEFT JOIN price_book p ON m.category_id = p.id
                   ORDER BY m.created_at DESC"""
            )
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            await db.close()

    async def set_keyword_mapping(self, keyword: str, platform: str, category_id: str) -> None:
        """设置关键词→品类映射"""
        db = await get_db()
        try:
            await db.execute(
                "INSERT OR REPLACE INTO keyword_category_map (keyword, platform, category_id) "
                "VALUES (?, ?, ?)",
                (keyword, platform, category_id),
            )
            await db.commit()
        finally:
            await db.close()

    async def delete_keyword_mapping(self, mapping_id: int) -> None:
        """删除关键词映射"""
        db = await get_db()
        try:
            await db.execute("DELETE FROM keyword_category_map WHERE id = ?", (mapping_id,))
            await db.commit()
        finally:
            await db.close()

    # ── 品类聚合对比 ─────────────────────────────────────────

    async def _resolve_category_for_items(self) -> Dict[str, List[Dict[str, Any]]]:
        """按品类聚合所有平台商品。返回 {category_id: [items...]}

        优先使用 keyword_category_map 手动映射，兜底使用 items.category_id 自动匹配。
        """
        db = await get_db()
        try:
            # 获取手动映射
            cursor = await db.execute("SELECT keyword, platform, category_id FROM keyword_category_map")
            manual_maps = {(dict(r)["keyword"], dict(r)["platform"]): dict(r)["category_id"]
                          for r in await cursor.fetchall()}

            # 获取所有有价格的商品
            cursor = await db.execute(
                """SELECT item_id, title, keyword, platform, price, image_url, item_link,
                          seller_credit, is_recommended, category_id, crawl_time
                   FROM items
                   WHERE price IS NOT NULL AND price > 0
                   ORDER BY crawl_time DESC"""
            )
            rows = await cursor.fetchall()

            # 按品类聚合，去重（同 item_id 只保留最新一条）
            seen_items = set()
            category_items: Dict[str, List[Dict[str, Any]]] = {}

            for r in rows:
                item = dict(r)
                if item["item_id"] in seen_items:
                    continue
                seen_items.add(item["item_id"])

                # 确定品类 ID：手动映射优先
                cat_id = manual_maps.get(
                    (item["keyword"], item["platform"]),
                    item.get("category_id"),
                )
                if not cat_id:
                    continue  # 无品类关联的跳过

                if cat_id not in category_items:
                    category_items[cat_id] = []
                category_items[cat_id].append(item)

            return category_items
        finally:
            await db.close()

    async def _get_category_names(self, category_ids: List[str]) -> Dict[str, str]:
        """批量获取品类名称"""
        if not category_ids:
            return {}
        db = await get_db()
        try:
            placeholders = ",".join(["?"] * len(category_ids))
            cursor = await db.execute(
                f"SELECT id, category_name FROM price_book WHERE id IN ({placeholders})",
                category_ids,
            )
            rows = await cursor.fetchall()
            return {dict(r)["id"]: dict(r)["category_name"] for r in rows}
        finally:
            await db.close()

    async def get_comparable_categories(self) -> List[Dict[str, Any]]:
        """获取有多平台数据的品类对比列表"""
        category_items = await self._resolve_category_for_items()
        rates = await self.get_exchange_rates()
        cat_names = await self._get_category_names(list(category_items.keys()))

        results = []
        for cat_id, items in category_items.items():
            # 按平台分组
            by_platform: Dict[str, List[float]] = {}
            kw_map: Dict[str, str] = {}
            for item in items:
                plat = item["platform"]
                if plat not in by_platform:
                    by_platform[plat] = []
                by_platform[plat].append(item["price"])
                if plat not in kw_map:
                    kw_map[plat] = item["keyword"]

            # 计算各平台统计
            platform_stats = []
            for plat, prices in by_platform.items():
                currency = PLATFORM_CURRENCY.get(plat, "CNY")
                rate_key = f"{currency}_to_{BASE_CURRENCY}"
                rate = rates.get(rate_key, 1.0) if currency != BASE_CURRENCY else 1.0

                avg_p = round(statistics.mean(prices), 2)
                med_p = round(statistics.median(prices), 2)

                platform_stats.append({
                    "platform": plat,
                    "currency": currency,
                    "item_count": len(prices),
                    "avg_price": avg_p,
                    "median_price": med_p,
                    "min_price": round(min(prices), 2),
                    "max_price": round(max(prices), 2),
                    "converted_avg": round(avg_p * rate, 2),
                    "converted_min": round(min(prices) * rate, 2),
                })

            # 计算差价
            if len(platform_stats) >= 2:
                converted_avgs = [s["converted_avg"] for s in platform_stats]
                cheapest_avg = min(converted_avgs)
                most_expensive_avg = max(converted_avgs)
                price_gap_pct = round(
                    (most_expensive_avg - cheapest_avg) / cheapest_avg * 100, 2
                ) if cheapest_avg > 0 else 0.0
                cheapest_plat = min(platform_stats, key=lambda s: s["converted_avg"])["platform"]
            else:
                price_gap_pct = 0.0
                cheapest_plat = platform_stats[0]["platform"] if platform_stats else ""

            results.append({
                "category_id": cat_id,
                "category_name": cat_names.get(cat_id, cat_id),
                "platforms": platform_stats,
                "price_gap_pct": price_gap_pct,
                "arbitrage_opportunity": classify_arbitrage(price_gap_pct),
                "cheapest_platform": cheapest_plat,
                "keywords": kw_map,
            })

        # 按差价百分比降序排列
        results.sort(key=lambda x: x["price_gap_pct"], reverse=True)
        return results

    async def compare_category(self, category_id: str) -> Optional[Dict[str, Any]]:
        """获取单品类对比详情"""
        categories = await self.get_comparable_categories()
        for cat in categories:
            if cat["category_id"] == category_id:
                return cat
        return None

    # ── 混排商品列表 ─────────────────────────────────────────

    async def get_cross_platform_items(
        self,
        category_id: Optional[str] = None,
        sort_by: str = "converted_price",
        platforms: Optional[List[str]] = None,
        limit: int = 200,
    ) -> List[Dict[str, Any]]:
        """获取跨平台混排商品列表（统一货币排序）"""
        category_items = await self._resolve_category_for_items()
        rates = await self.get_exchange_rates()

        # 筛选品类
        if category_id and category_id in category_items:
            all_items = category_items[category_id]
        else:
            all_items = []
            for items in category_items.values():
                all_items.extend(items)

        # 筛选平台
        if platforms:
            all_items = [i for i in all_items if i["platform"] in platforms]

        # 换算价格并计算对比指标
        result = []
        converted_prices = []

        for item in all_items:
            currency = PLATFORM_CURRENCY.get(item["platform"], "CNY")
            rate_key = f"{currency}_to_{BASE_CURRENCY}"
            rate = rates.get(rate_key, 1.0) if currency != BASE_CURRENCY else 1.0
            converted = round(item["price"] * rate, 2)
            converted_prices.append(converted)

            result.append({
                "item_id": item["item_id"],
                "title": item["title"],
                "platform": item["platform"],
                "price": item["price"],
                "currency": currency,
                "converted_price": converted,
                "image_url": item.get("image_url", ""),
                "item_link": item.get("item_link", ""),
                "seller_credit": item.get("seller_credit", ""),
                "ai_recommended": bool(item.get("is_recommended", 0)),
                "keyword": item.get("keyword", ""),
            })

        # 计算对比指标
        if converted_prices:
            avg_converted = statistics.mean(converted_prices)
            min_converted = min(converted_prices)
            for r in result:
                cp = r["converted_price"]
                r["vs_category_avg"] = round((cp - avg_converted) / avg_converted * 100, 2) if avg_converted > 0 else 0.0
                r["vs_cheapest"] = round((cp - min_converted) / min_converted * 100, 2) if min_converted > 0 else 0.0

        # 排序
        if sort_by == "converted_price":
            result.sort(key=lambda x: x["converted_price"])
        elif sort_by == "vs_category_avg":
            result.sort(key=lambda x: x.get("vs_category_avg", 0))
        elif sort_by == "price":
            result.sort(key=lambda x: x["price"])

        return result[:limit]
