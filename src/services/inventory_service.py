"""库存台账服务"""
import uuid
from datetime import datetime
from typing import List, Optional
from src.infrastructure.persistence.sqlite_manager import get_db


class InventoryService:

    async def get_all(
        self,
        status: Optional[str] = None,
        assignee: Optional[str] = None,
        keyword: Optional[str] = None,
    ) -> List[dict]:
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
            if keyword:
                conditions.append("keyword = ?")
                params.append(keyword)
            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
            cursor = await db.execute(
                f"SELECT * FROM inventory_items {where} ORDER BY created_at DESC", params
            )
            rows = await cursor.fetchall()
            result = []
            for r in rows:
                item = dict(r)
                # Calculate age in days
                try:
                    created = datetime.fromisoformat(item["created_at"])
                    item["age_days"] = (datetime.now() - created).days
                except (ValueError, TypeError):
                    item["age_days"] = 0
                result.append(item)
            return result
        finally:
            await db.close()

    async def get_by_id(self, item_id: str) -> Optional[dict]:
        db = await get_db()
        try:
            cursor = await db.execute("SELECT * FROM inventory_items WHERE id = ?", (item_id,))
            row = await cursor.fetchone()
            if not row:
                return None
            item = dict(row)
            try:
                created = datetime.fromisoformat(item["created_at"])
                item["age_days"] = (datetime.now() - created).days
            except (ValueError, TypeError):
                item["age_days"] = 0
            return item
        finally:
            await db.close()

    async def create(self, data: dict) -> dict:
        item_id = str(uuid.uuid4())
        now = datetime.now().isoformat()

        purchase_price = data.get("purchase_price", 0)
        shipping_fee = data.get("shipping_fee", 0)
        refurbish_fee = data.get("refurbish_fee", 0)
        platform_fee = data.get("platform_fee", 0)
        other_fee = data.get("other_fee", 0)
        total_cost = round(purchase_price + shipping_fee + refurbish_fee + platform_fee + other_fee, 2)

        db = await get_db()
        try:
            await db.execute(
                """INSERT INTO inventory_items (
                    id, title, platform, keyword, image_url, item_link,
                    purchase_price, shipping_fee, refurbish_fee, platform_fee, other_fee, total_cost,
                    listing_price, status, purchase_item_id, price_book_id, assignee, note,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    item_id, data.get("title", ""), data.get("platform", "xianyu"),
                    data.get("keyword", ""), data.get("image_url", ""), data.get("item_link", ""),
                    purchase_price, shipping_fee, refurbish_fee, platform_fee, other_fee, total_cost,
                    data.get("listing_price"), "in_stock",
                    data.get("purchase_item_id"), data.get("price_book_id"),
                    data.get("assignee"), data.get("note", ""),
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

        for field in ["status", "listing_price", "shipping_fee", "refurbish_fee",
                       "platform_fee", "other_fee", "sold_price", "sold_channel",
                       "sold_at", "assignee", "note"]:
            if field in data and data[field] is not None:
                fields.append(f"{field} = ?")
                params.append(data[field])

        # Recalculate total_cost if any fee changed
        recalc = False
        for fee_field in ["shipping_fee", "refurbish_fee", "platform_fee", "other_fee"]:
            if fee_field in data and data[fee_field] is not None:
                recalc = True
                break

        if recalc:
            purchase_price = existing["purchase_price"]
            s = data.get("shipping_fee", existing.get("shipping_fee", 0)) or 0
            r = data.get("refurbish_fee", existing.get("refurbish_fee", 0)) or 0
            p = data.get("platform_fee", existing.get("platform_fee", 0)) or 0
            o = data.get("other_fee", existing.get("other_fee", 0)) or 0
            total_cost = round(purchase_price + s + r + p + o, 2)
            fields.append("total_cost = ?")
            params.append(total_cost)

        if not fields:
            return existing

        fields.append("updated_at = ?")
        params.append(datetime.now().isoformat())
        params.append(item_id)

        db = await get_db()
        try:
            await db.execute(
                f"UPDATE inventory_items SET {', '.join(fields)} WHERE id = ?", params
            )
            await db.commit()
        finally:
            await db.close()
        return await self.get_by_id(item_id)

    async def mark_sold(self, item_id: str, sold_price: float, sold_channel: str = "") -> Optional[dict]:
        """标记已出，同时创建销售记录"""
        item = await self.get_by_id(item_id)
        if not item:
            return None

        now = datetime.now().isoformat()
        await self.update(item_id, {
            "status": "sold",
            "sold_price": sold_price,
            "sold_channel": sold_channel,
            "sold_at": now,
        })

        # Create sale record
        from src.services.profit_service import ProfitService
        profit_service = ProfitService()
        total_cost = item.get("total_cost", 0)
        profit = round(sold_price - total_cost, 2)
        profit_rate = round(profit / sold_price * 100, 2) if sold_price > 0 else 0

        await profit_service.create_sale_record({
            "inventory_item_id": item_id,
            "title": item.get("title", ""),
            "keyword": item.get("keyword", ""),
            "platform": item.get("platform", "xianyu"),
            "purchase_price": item.get("purchase_price", 0),
            "total_cost": total_cost,
            "sold_price": sold_price,
            "profit": profit,
            "profit_rate": profit_rate,
            "sold_channel": sold_channel,
            "assignee": item.get("assignee"),
            "sold_at": now,
        })

        return await self.get_by_id(item_id)

    async def delete(self, item_id: str) -> bool:
        db = await get_db()
        try:
            cursor = await db.execute("DELETE FROM inventory_items WHERE id = ?", (item_id,))
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    async def get_summary(self, assignee: Optional[str] = None) -> dict:
        db = await get_db()
        try:
            condition = "WHERE assignee = ?" if assignee else ""
            params = [assignee] if assignee else []

            cursor = await db.execute(
                f"""SELECT
                    COUNT(*) as total_count,
                    SUM(CASE WHEN status IN ('in_stock','refurbishing','listed') THEN 1 ELSE 0 END) as active_count,
                    SUM(CASE WHEN status IN ('in_stock','refurbishing','listed') THEN total_cost ELSE 0 END) as total_inventory_cost,
                    SUM(CASE WHEN status IN ('in_stock','refurbishing','listed') THEN COALESCE(listing_price, total_cost) ELSE 0 END) as total_inventory_value,
                    SUM(CASE WHEN status = 'in_stock' THEN 1 ELSE 0 END) as in_stock_count,
                    SUM(CASE WHEN status = 'refurbishing' THEN 1 ELSE 0 END) as refurbishing_count,
                    SUM(CASE WHEN status = 'listed' THEN 1 ELSE 0 END) as listed_count,
                    SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold_count
                FROM inventory_items {condition}""",
                params,
            )
            row = await cursor.fetchone()
            return dict(row) if row else {}
        finally:
            await db.close()

    async def get_aging_alerts(self, days_threshold: int = 7, assignee: Optional[str] = None) -> List[dict]:
        """获取库龄超期预警"""
        items = await self.get_all(assignee=assignee)
        return [
            item for item in items
            if item.get("status") in ("in_stock", "refurbishing", "listed")
            and item.get("age_days", 0) >= days_threshold
        ]
