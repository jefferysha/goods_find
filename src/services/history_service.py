"""历史价格追踪服务"""
import json
from typing import List, Optional, Dict, Any
from datetime import datetime

from src.infrastructure.persistence.sqlite_manager import get_db


class HistoryService:
    """商品价格历史记录服务"""

    async def record_prices(
        self,
        items: List[dict],
        task_id: int,
        task_name: str = "",
    ) -> int:
        """
        记录一批商品的价格到 price_history 表。
        返回成功插入的条数。
        """
        db = await get_db()
        inserted = 0
        try:
            for item in items:
                info = item.get("商品信息", {})
                item_id = str(info.get("商品ID", ""))
                title = str(info.get("标题", ""))
                price_str = str(info.get("当前售价", "0"))
                price_str = price_str.replace("¥", "").replace(",", "").strip()
                crawl_time = str(
                    item.get("抓取时间", datetime.now().isoformat())
                )

                try:
                    price = float(price_str)
                except (ValueError, TypeError):
                    price = 0.0

                if not item_id:
                    continue

                try:
                    await db.execute(
                        """
                        INSERT OR IGNORE INTO price_history
                            (item_id, task_id, task_name, title, price, crawl_time)
                        VALUES (?, ?, ?, ?, ?, ?)
                        """,
                        (item_id, task_id, task_name, title, price, crawl_time),
                    )
                    inserted += 1
                except Exception:
                    # 跳过重复或异常记录
                    continue

            await db.commit()
        finally:
            await db.close()

        return inserted

    async def get_item_history(
        self,
        item_id: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """获取某商品的价格历史，按时间正序"""
        db = await get_db()
        try:
            cursor = await db.execute(
                """
                SELECT id, item_id, task_id, task_name, title, price,
                       crawl_time, created_at
                FROM price_history
                WHERE item_id = ?
                ORDER BY crawl_time ASC
                LIMIT ?
                """,
                (item_id, limit),
            )
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
        finally:
            await db.close()

    async def get_batch_history(
        self,
        item_ids: List[str],
        limit_per_item: int = 50,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """批量获取多个商品的价格历史"""
        result: Dict[str, List[Dict[str, Any]]] = {}
        db = await get_db()
        try:
            for item_id in item_ids:
                cursor = await db.execute(
                    """
                    SELECT id, item_id, task_id, task_name, title, price,
                           crawl_time, created_at
                    FROM price_history
                    WHERE item_id = ?
                    ORDER BY crawl_time ASC
                    LIMIT ?
                    """,
                    (item_id, limit_per_item),
                )
                rows = await cursor.fetchall()
                result[item_id] = [dict(row) for row in rows]
        finally:
            await db.close()

        return result

    async def detect_price_drop(
        self,
        item_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        检测某商品是否降价。
        对比最近两条价格记录，返回降价信息或 None。
        """
        db = await get_db()
        try:
            cursor = await db.execute(
                """
                SELECT price, crawl_time
                FROM price_history
                WHERE item_id = ?
                ORDER BY crawl_time DESC
                LIMIT 2
                """,
                (item_id,),
            )
            rows = await cursor.fetchall()

            if len(rows) < 2:
                return None

            current = dict(rows[0])
            previous = dict(rows[1])

            current_price = current["price"]
            previous_price = previous["price"]

            if current_price >= previous_price:
                return None

            drop_amount = round(previous_price - current_price, 2)
            drop_rate = (
                round(drop_amount / previous_price * 100, 2)
                if previous_price > 0
                else 0.0
            )

            return {
                "item_id": item_id,
                "current_price": current_price,
                "previous_price": previous_price,
                "drop_amount": drop_amount,
                "drop_rate": drop_rate,
                "current_time": current["crawl_time"],
                "previous_time": previous["crawl_time"],
            }
        finally:
            await db.close()
