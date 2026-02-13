"""数据仪表盘服务 —— 数据源已迁移到 SQLite items 表"""
from typing import List, Dict, Any

from src.infrastructure.persistence.item_repository import ItemRepository
from src.infrastructure.persistence.json_task_repository import JsonTaskRepository
from src.domain.models.platform import get_all_platforms, get_enabled_platforms


class DashboardService:
    """仪表盘统计服务"""

    def __init__(self):
        self.task_repo = JsonTaskRepository()
        self.item_repo = ItemRepository()

    async def get_stats(self) -> Dict[str, Any]:
        """汇总统计"""
        tasks = await self.task_repo.find_all()
        total_tasks = len(tasks)
        running_tasks = sum(1 for t in tasks if t.is_running)
        enabled_tasks = sum(1 for t in tasks if t.enabled)

        # 从 SQLite items 表统计
        item_stats = await self.item_repo.get_stats()

        # 平台统计
        all_platforms = get_all_platforms()
        enabled_platforms = get_enabled_platforms()

        return {
            "total_tasks": total_tasks,
            "active_tasks": running_tasks,
            "enabled_tasks": enabled_tasks,
            "result_files": item_stats.get("result_files", 0),
            "total_items": item_stats.get("total_items", 0),
            "history_records": item_stats.get("total_items", 0),
            "enabled_platforms": len(enabled_platforms),
            "total_platforms": len(all_platforms),
            "low_price_items": 0,
            "high_premium_items": 0,
            "avg_premium_rate": 0.0,
        }

    async def get_price_trend(
        self,
        task_id: int,
        days: int = 30,
    ) -> List[Dict[str, Any]]:
        """
        获取指定任务最近 N 天的价格趋势。
        通过 task_id → keyword 映射，从 items 表聚合。
        """
        task = await self.task_repo.find_by_id(task_id)
        if not task:
            return []
        keyword = (task.keyword or "").strip()
        if not keyword:
            return []
        return await self.item_repo.get_price_trend(keyword, days=days)

    async def get_premium_distribution(
        self,
        task_id: int,
    ) -> Dict[str, Any]:
        """获取指定任务的价格区间分布"""
        task = await self.task_repo.find_by_id(task_id)
        if not task:
            return {"task_id": task_id, "total": 0, "distribution": []}
        keyword = (task.keyword or "").strip()
        if not keyword:
            return {"task_id": task_id, "total": 0, "distribution": []}

        result = await self.item_repo.get_premium_distribution(keyword)
        result["task_id"] = task_id
        return result

    async def get_bargain_leaderboard(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        捡漏排行榜：按溢价率从低到高排列 Top N 商品。
        数据源：SQLite items 表 + 基准价。
        """
        from src.infrastructure.persistence.json_market_price_repository import JsonMarketPriceRepository
        from src.infrastructure.persistence.sqlite_manager import get_db
        from src.services.pricing_service import PricingService

        pricing_service = PricingService()
        market_repo = JsonMarketPriceRepository()
        all_market_prices = await market_repo.get_all()

        if not all_market_prices:
            return []

        # keyword -> reference_price map
        ref_map: Dict[str, float] = {}
        for mp in all_market_prices:
            kw = mp.keyword.strip().lower()
            if hasattr(mp, 'fair_used_price') and mp.fair_used_price:
                ref_map[kw] = mp.fair_used_price
            else:
                ref_map[kw] = mp.reference_price

        if not ref_map:
            return []

        # 从 SQLite 查询所有有基准价的关键词商品
        bargains: list = []
        db = await get_db()
        try:
            for kw, ref_price in ref_map.items():
                cursor = await db.execute(
                    """
                    SELECT title, price, item_link, image_url, platform, keyword
                    FROM items
                    WHERE LOWER(keyword) = ? AND price > 0
                    """,
                    (kw,),
                )
                rows = await cursor.fetchall()
                for row in rows:
                    r = dict(row)
                    rate = pricing_service.calculate_premium_rate(r["price"], ref_price)
                    bargains.append({
                        "title": r["title"] or "",
                        "price": r["price"],
                        "reference_price": ref_price,
                        "premium_rate": rate,
                        "link": r["item_link"] or "",
                        "image": r["image_url"] or "",
                        "platform": r["platform"] or "xianyu",
                        "keyword": r["keyword"] or "",
                    })
        finally:
            await db.close()

        bargains.sort(key=lambda x: x["premium_rate"])
        return bargains[:limit]

    async def get_top_keywords(self, limit: int = 10) -> List[Dict[str, Any]]:
        """热门关键词统计（直接查 SQLite）"""
        return await self.item_repo.get_top_keywords(limit=limit)
