"""收藏与对比服务"""
import json
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime

from src.infrastructure.persistence.sqlite_manager import get_db


class FavoriteService:
    """收藏 CRUD + 结构化对比"""

    # ===== CRUD =====

    async def get_all(self, task_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """获取收藏列表，可按 task_id 筛选"""
        db = await get_db()
        try:
            if task_id is not None:
                cursor = await db.execute(
                    "SELECT * FROM favorites WHERE task_id = ? ORDER BY created_at DESC",
                    (task_id,),
                )
            else:
                cursor = await db.execute(
                    "SELECT * FROM favorites ORDER BY created_at DESC"
                )
            rows = await cursor.fetchall()
            return [self._row_to_dict(dict(row)) for row in rows]
        finally:
            await db.close()

    async def get_by_id(self, fav_id: str) -> Optional[Dict[str, Any]]:
        """按 ID 获取收藏"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM favorites WHERE id = ?", (fav_id,)
            )
            row = await cursor.fetchone()
            if row is None:
                return None
            return self._row_to_dict(dict(row))
        finally:
            await db.close()

    async def create(
        self,
        item_id: str,
        task_id: int,
        item_snapshot: Dict[str, Any],
        note: str = "",
    ) -> Dict[str, Any]:
        """添加收藏"""
        fav_id = str(uuid.uuid4())
        now = datetime.now().isoformat()

        db = await get_db()
        try:
            await db.execute(
                """
                INSERT OR REPLACE INTO favorites (id, item_id, task_id, item_snapshot, note, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    fav_id,
                    item_id,
                    task_id,
                    json.dumps(item_snapshot, ensure_ascii=False),
                    note,
                    now,
                ),
            )
            await db.commit()
        finally:
            await db.close()

        return {
            "id": fav_id,
            "item_id": item_id,
            "task_id": task_id,
            "item_snapshot": item_snapshot,
            "note": note,
            "created_at": now,
        }

    async def delete(self, fav_id: str) -> bool:
        """删除收藏"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "DELETE FROM favorites WHERE id = ?", (fav_id,)
            )
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    # ===== 对比 =====

    async def compare(self, fav_ids: List[str]) -> Dict[str, Any]:
        """
        结构化对比多个收藏商品。
        提取共同字段，按列对齐，方便前端展示。
        """
        items: List[Dict[str, Any]] = []
        db = await get_db()
        try:
            for fav_id in fav_ids:
                cursor = await db.execute(
                    "SELECT * FROM favorites WHERE id = ?", (fav_id,)
                )
                row = await cursor.fetchone()
                if row:
                    items.append(self._row_to_dict(dict(row)))
        finally:
            await db.close()

        if not items:
            return {"items": [], "comparison": {}}

        # 提取对比维度
        comparison: Dict[str, List[Any]] = {
            "id": [],
            "item_id": [],
            "title": [],
            "price": [],
            "note": [],
            "created_at": [],
        }

        for item in items:
            snapshot = item.get("item_snapshot", {})
            info = snapshot.get("商品信息", snapshot)

            comparison["id"].append(item.get("id"))
            comparison["item_id"].append(item.get("item_id"))
            comparison["title"].append(
                str(info.get("标题", info.get("title", "")))
            )

            # 提取价格
            price_str = str(info.get("当前售价", info.get("price", "0")))
            price_str = price_str.replace("¥", "").replace(",", "").strip()
            try:
                comparison["price"].append(float(price_str))
            except (ValueError, TypeError):
                comparison["price"].append(0.0)

            comparison["note"].append(item.get("note", ""))
            comparison["created_at"].append(item.get("created_at"))

        # 计算价格统计
        prices = [p for p in comparison["price"] if p > 0]
        price_stats = {}
        if prices:
            price_stats = {
                "min": min(prices),
                "max": max(prices),
                "avg": round(sum(prices) / len(prices), 2),
                "diff": round(max(prices) - min(prices), 2),
            }

        return {
            "items": items,
            "comparison": comparison,
            "price_stats": price_stats,
        }

    # ===== 工具方法 =====

    @staticmethod
    def _row_to_dict(row: Dict[str, Any]) -> Dict[str, Any]:
        """将数据库行转换为字典，解析 JSON 字段"""
        result = dict(row)
        if "item_snapshot" in result and isinstance(result["item_snapshot"], str):
            try:
                result["item_snapshot"] = json.loads(result["item_snapshot"])
            except (json.JSONDecodeError, TypeError):
                result["item_snapshot"] = {}
        return result
