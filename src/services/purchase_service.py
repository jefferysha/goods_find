"""采购清单服务"""
import json
import uuid
from datetime import datetime
from typing import List, Optional
from src.infrastructure.persistence.sqlite_manager import get_db


class PurchaseService:

    async def get_all(self, status: Optional[str] = None, assignee: Optional[str] = None) -> List[dict]:
        db = await get_db()
        try:
            conditions = []
            params = []
            if status:
                conditions.append("status = ?")
                params.append(status)
            if assignee:
                conditions.append("assignee = ?")
                params.append(assignee)
            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
            cursor = await db.execute(
                f"SELECT * FROM purchase_items {where} ORDER BY created_at DESC", params
            )
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            await db.close()

    async def get_by_id(self, item_id: str) -> Optional[dict]:
        db = await get_db()
        try:
            cursor = await db.execute("SELECT * FROM purchase_items WHERE id = ?", (item_id,))
            row = await cursor.fetchone()
            return dict(row) if row else None
        finally:
            await db.close()

    async def create(self, data: dict) -> dict:
        item_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        db = await get_db()
        try:
            await db.execute(
                """INSERT INTO purchase_items (
                    id, item_id, title, price, image_url, item_link, platform, keyword,
                    price_book_id, estimated_profit, estimated_profit_rate,
                    purchase_range_low, purchase_range_high,
                    status, assignee, note, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    item_id, data.get("item_id", ""), data.get("title", ""),
                    data.get("price", 0), data.get("image_url", ""),
                    data.get("item_link", ""), data.get("platform", "xianyu"),
                    data.get("keyword", ""), data.get("price_book_id"),
                    data.get("estimated_profit"), data.get("estimated_profit_rate"),
                    data.get("purchase_range_low"), data.get("purchase_range_high"),
                    "new", data.get("assignee"), data.get("note", ""),
                    now, now,
                ),
            )
            await db.commit()
        finally:
            await db.close()
        return await self.get_by_id(item_id)

    async def update(self, item_id: str, data: dict) -> Optional[dict]:
        existing = await self.get_by_id(item_id)
        if not existing:
            return None

        fields = []
        params = []
        for field in ["status", "assignee", "actual_price", "note"]:
            if field in data and data[field] is not None:
                fields.append(f"{field} = ?")
                params.append(data[field])

        if not fields:
            return existing

        fields.append("updated_at = ?")
        params.append(datetime.now().isoformat())
        params.append(item_id)

        db = await get_db()
        try:
            await db.execute(
                f"UPDATE purchase_items SET {', '.join(fields)} WHERE id = ?", params
            )
            await db.commit()
        finally:
            await db.close()
        return await self.get_by_id(item_id)

    async def delete(self, item_id: str) -> bool:
        db = await get_db()
        try:
            cursor = await db.execute("DELETE FROM purchase_items WHERE id = ?", (item_id,))
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    async def batch_assign(self, ids: List[str], assignee: str) -> int:
        if not ids:
            return 0
        placeholders = ",".join("?" * len(ids))
        db = await get_db()
        try:
            cursor = await db.execute(
                f"UPDATE purchase_items SET assignee = ?, updated_at = ? WHERE id IN ({placeholders})",
                [assignee, datetime.now().isoformat()] + ids,
            )
            await db.commit()
            return cursor.rowcount
        finally:
            await db.close()

    async def mark_purchased(self, item_id: str, actual_price: float) -> Optional[dict]:
        """标记已收货，同时创建库存项"""
        purchase = await self.get_by_id(item_id)
        if not purchase:
            return None

        # Update purchase status
        await self.update(item_id, {"status": "purchased", "actual_price": actual_price})

        # Create inventory item
        from src.services.inventory_service import InventoryService
        inv_service = InventoryService()

        # Try to get fee template from price book
        shipping_fee = 0
        refurbish_fee = 0
        platform_fee = 0
        other_fee = 0
        price_book_id = purchase.get("price_book_id")

        if price_book_id:
            from src.services.price_book_service import PriceBookService
            pb_service = PriceBookService()
            entry = await pb_service.get_by_id(price_book_id)
            if entry:
                fees = entry.get("fees", {})
                shipping_fee = fees.get("shipping_fee", 0)
                refurbish_fee = fees.get("refurbish_fee", 0)
                target = entry.get("target_sell_price", 0)
                platform_fee = round(target * fees.get("platform_fee_rate", 0.05), 2) if target else 0
                other_fee = fees.get("other_fee", 0)

        inv_item = await inv_service.create({
            "title": purchase.get("title", ""),
            "platform": purchase.get("platform", "xianyu"),
            "keyword": purchase.get("keyword", ""),
            "image_url": purchase.get("image_url", ""),
            "item_link": purchase.get("item_link", ""),
            "purchase_price": actual_price,
            "shipping_fee": shipping_fee,
            "refurbish_fee": refurbish_fee,
            "platform_fee": platform_fee,
            "other_fee": other_fee,
            "purchase_item_id": item_id,
            "price_book_id": price_book_id,
            "assignee": purchase.get("assignee"),
        })

        return inv_item

    async def get_stats(self, assignee: Optional[str] = None) -> dict:
        """返回格式匹配前端 PurchaseStats 类型：
        {total, by_status, by_assignee, total_estimated_profit, total_actual_cost}
        """
        db = await get_db()
        try:
            condition = "WHERE assignee = ?" if assignee else ""
            params = [assignee] if assignee else []

            # 按状态统计
            cursor = await db.execute(
                f"""SELECT status, COUNT(*) as count FROM purchase_items {condition} GROUP BY status""",
                params,
            )
            rows = await cursor.fetchall()
            by_status = {dict(r)["status"]: dict(r)["count"] for r in rows}

            # 按负责人统计
            cursor = await db.execute(
                f"""SELECT COALESCE(assignee, '未分配') as assignee, COUNT(*) as count
                    FROM purchase_items {condition} GROUP BY assignee""",
                params,
            )
            rows = await cursor.fetchall()
            by_assignee = {dict(r)["assignee"]: dict(r)["count"] for r in rows}

            # 汇总数据
            cursor = await db.execute(
                f"""SELECT
                    COUNT(*) as total,
                    COALESCE(SUM(estimated_profit), 0) as total_estimated_profit,
                    COALESCE(SUM(CASE WHEN status = 'purchased' THEN actual_price ELSE 0 END), 0) as total_actual_cost
                FROM purchase_items {condition}""",
                params,
            )
            row = await cursor.fetchone()
            summary = dict(row) if row else {"total": 0, "total_estimated_profit": 0, "total_actual_cost": 0}

            return {
                "total": summary["total"],
                "by_status": by_status,
                "by_assignee": by_assignee,
                "total_estimated_profit": summary["total_estimated_profit"],
                "total_actual_cost": summary["total_actual_cost"],
            }
        finally:
            await db.close()
