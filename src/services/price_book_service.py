"""价格本服务"""
import json
import uuid
import statistics
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from src.infrastructure.persistence.sqlite_manager import get_db


class PriceBookService:

    async def get_all(self) -> List[dict]:
        """获取所有价格本条目，附带计算字段"""
        db = await get_db()
        try:
            cursor = await db.execute("SELECT * FROM price_book ORDER BY created_at DESC")
            rows = await cursor.fetchall()
            return [self._row_to_entry(dict(r)) for r in rows]
        finally:
            await db.close()

    async def get_by_id(self, entry_id: str) -> Optional[dict]:
        db = await get_db()
        try:
            cursor = await db.execute("SELECT * FROM price_book WHERE id = ?", (entry_id,))
            row = await cursor.fetchone()
            return self._row_to_entry(dict(row)) if row else None
        finally:
            await db.close()

    async def get_by_keyword(self, keyword: str) -> Optional[dict]:
        """通过关键词查找匹配的价格本条目"""
        db = await get_db()
        try:
            cursor = await db.execute("SELECT * FROM price_book")
            rows = await cursor.fetchall()
            for row in rows:
                entry = dict(row)
                keywords = json.loads(entry.get("keywords") or "[]")
                if keyword in keywords:
                    return self._row_to_entry(entry)
            return None
        finally:
            await db.close()

    async def create(self, data: dict) -> dict:
        entry_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        keywords_json = json.dumps(data.get("keywords", []), ensure_ascii=False)

        db = await get_db()
        try:
            await db.execute(
                """INSERT INTO price_book (
                    id, category_name, keywords, new_price, market_price,
                    market_price_source, target_sell_price,
                    shipping_fee, refurbish_fee, platform_fee_rate, other_fee,
                    min_profit_rate, ideal_profit_rate, platform, note,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    entry_id, data.get("category_name", ""),
                    keywords_json,
                    data.get("new_price"), data.get("market_price"),
                    data.get("market_price_source", "manual"),
                    data.get("target_sell_price"),
                    data.get("fees", {}).get("shipping_fee", 0),
                    data.get("fees", {}).get("refurbish_fee", 0),
                    data.get("fees", {}).get("platform_fee_rate", 0.05),
                    data.get("fees", {}).get("other_fee", 0),
                    data.get("min_profit_rate", 0.15),
                    data.get("ideal_profit_rate", 0.25),
                    data.get("platform", "xianyu"),
                    data.get("note", ""),
                    now, now,
                ),
            )
            await db.commit()
        finally:
            await db.close()

        return await self.get_by_id(entry_id)

    async def update(self, entry_id: str, data: dict) -> Optional[dict]:
        existing = await self.get_by_id(entry_id)
        if not existing:
            return None

        # Build update fields
        fields = []
        params = []

        simple_fields = ["category_name", "new_price", "market_price", "market_price_source",
                         "target_sell_price", "min_profit_rate", "ideal_profit_rate", "platform", "note"]
        for field in simple_fields:
            if field in data and data[field] is not None:
                fields.append(f"{field} = ?")
                params.append(data[field])

        if "keywords" in data and data["keywords"] is not None:
            fields.append("keywords = ?")
            params.append(json.dumps(data["keywords"], ensure_ascii=False))

        # Handle nested fees
        if "fees" in data and data["fees"] is not None:
            fees = data["fees"]
            if isinstance(fees, dict):
                for fee_field in ["shipping_fee", "refurbish_fee", "platform_fee_rate", "other_fee"]:
                    if fee_field in fees:
                        fields.append(f"{fee_field} = ?")
                        params.append(fees[fee_field])

        if not fields:
            return existing

        fields.append("updated_at = ?")
        params.append(datetime.now().isoformat())
        params.append(entry_id)

        db = await get_db()
        try:
            await db.execute(
                f"UPDATE price_book SET {', '.join(fields)} WHERE id = ?",
                params,
            )
            await db.commit()
        finally:
            await db.close()

        return await self.get_by_id(entry_id)

    async def delete(self, entry_id: str) -> bool:
        db = await get_db()
        try:
            cursor = await db.execute("DELETE FROM price_book WHERE id = ?", (entry_id,))
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    async def batch_update(self, ids: List[str], data: dict) -> int:
        """批量更新多个价格本条目的共同字段"""
        if not ids:
            return 0

        fields = []
        params = []

        if "fees" in data and data["fees"]:
            fees = data["fees"]
            for fee_field in ["shipping_fee", "refurbish_fee", "platform_fee_rate", "other_fee"]:
                if fee_field in fees:
                    fields.append(f"{fee_field} = ?")
                    params.append(fees[fee_field])

        for field in ["min_profit_rate", "ideal_profit_rate"]:
            if field in data and data[field] is not None:
                fields.append(f"{field} = ?")
                params.append(data[field])

        if not fields:
            return 0

        fields.append("updated_at = ?")
        params.append(datetime.now().isoformat())

        placeholders = ",".join("?" * len(ids))
        params.extend(ids)

        db = await get_db()
        try:
            cursor = await db.execute(
                f"UPDATE price_book SET {', '.join(fields)} WHERE id IN ({placeholders})",
                params,
            )
            await db.commit()
            return cursor.rowcount
        finally:
            await db.close()

    async def evaluate_item(self, keyword: str, item_price: float) -> dict:
        """评估单个商品"""
        entry = await self.get_by_keyword(keyword)
        if not entry:
            return {"status": "no_config", "purchase_range": [None, None], "profit": 0, "profit_rate": 0}

        target = entry.get("target_sell_price")
        if not target:
            return {"status": "no_config", "purchase_range": [None, None], "profit": 0, "profit_rate": 0}

        ideal = entry.get("purchase_ideal")
        upper = entry.get("purchase_upper")

        # Calculate profit
        total_fees = entry.get("total_fees", 0)
        total_cost = item_price + total_fees
        profit = target - total_cost
        profit_rate = round(profit / target * 100, 2) if target > 0 else 0

        if ideal is None or upper is None:
            status = "no_config"
        elif item_price <= ideal:
            status = "great_deal"
        elif item_price <= upper:
            status = "good_deal"
        else:
            status = "overpriced"

        market_diff = None
        market_price = entry.get("market_price")
        if market_price and market_price > 0:
            market_diff = round((item_price - market_price) / market_price * 100, 2)

        return {
            "status": status,
            "purchase_range": [ideal, upper],
            "profit": round(profit, 2),
            "profit_rate": profit_rate,
            "total_cost": round(total_cost, 2),
            "total_fees": total_fees,
            "market_diff_pct": market_diff,
            "price_book_id": entry["id"],
        }

    async def evaluate_items_batch(self, items: List[dict]) -> List[dict]:
        """批量评估商品列表"""
        # Pre-load all price book entries
        all_entries = await self.get_all()
        keyword_map = {}
        for entry in all_entries:
            for kw in entry.get("keywords", []):
                keyword_map[kw] = entry

        results = []
        for item in items:
            keyword = item.get("keyword", "") or item.get("搜索关键字", "")
            price = item.get("price", 0)
            if isinstance(price, str):
                price = float(price.replace("¥", "").replace(",", "").strip() or "0")

            entry = keyword_map.get(keyword)
            if not entry or not entry.get("target_sell_price"):
                results.append({
                    "item": item,
                    "evaluation": {"status": "no_config", "purchase_range": [None, None], "profit": 0, "profit_rate": 0}
                })
                continue

            target = entry["target_sell_price"]
            ideal = entry.get("purchase_ideal")
            upper = entry.get("purchase_upper")
            total_fees = entry.get("total_fees", 0)
            total_cost = price + total_fees
            profit = target - total_cost
            profit_rate = round(profit / target * 100, 2) if target > 0 else 0

            if ideal is None or upper is None:
                status = "no_config"
            elif price <= ideal:
                status = "great_deal"
            elif price <= upper:
                status = "good_deal"
            else:
                status = "overpriced"

            market_diff = None
            if entry.get("market_price") and entry["market_price"] > 0:
                market_diff = round((price - entry["market_price"]) / entry["market_price"] * 100, 2)

            results.append({
                "item": item,
                "evaluation": {
                    "status": status,
                    "purchase_range": [ideal, upper],
                    "profit": round(profit, 2),
                    "profit_rate": profit_rate,
                    "total_cost": round(total_cost, 2),
                    "total_fees": total_fees,
                    "market_diff_pct": market_diff,
                    "price_book_id": entry["id"],
                    "category_name": entry.get("category_name", ""),
                }
            })

        return results

    async def auto_update_market_prices(self):
        """自动更新行情价（取最近7天中位价）"""
        entries = await self.get_all()
        for entry in entries:
            if entry.get("market_price_source") != "auto_7d_median":
                continue
            keywords = entry.get("keywords", [])
            if not keywords:
                continue

            db = await get_db()
            try:
                since = (datetime.now() - timedelta(days=7)).isoformat()
                prices = []
                for kw in keywords:
                    cursor = await db.execute(
                        "SELECT price FROM items WHERE keyword = ? AND crawl_time >= ? AND price > 0",
                        (kw, since),
                    )
                    rows = await cursor.fetchall()
                    prices.extend([dict(r)["price"] for r in rows])

                if prices:
                    median = round(statistics.median(prices), 2)
                    await db.execute(
                        "UPDATE price_book SET market_price = ?, updated_at = ? WHERE id = ?",
                        (median, datetime.now().isoformat(), entry["id"]),
                    )
                    await db.commit()
            finally:
                await db.close()

    def _row_to_entry(self, row: dict) -> dict:
        """将DB行转为带计算字段的dict"""
        entry = {
            "id": row["id"],
            "category_name": row["category_name"],
            "keywords": json.loads(row.get("keywords") or "[]"),
            "new_price": row.get("new_price"),
            "market_price": row.get("market_price"),
            "market_price_source": row.get("market_price_source", "manual"),
            "target_sell_price": row.get("target_sell_price"),
            "fees": {
                "shipping_fee": row.get("shipping_fee", 0),
                "refurbish_fee": row.get("refurbish_fee", 0),
                "platform_fee_rate": row.get("platform_fee_rate", 0.05),
                "other_fee": row.get("other_fee", 0),
            },
            "min_profit_rate": row.get("min_profit_rate", 0.15),
            "ideal_profit_rate": row.get("ideal_profit_rate", 0.25),
            "platform": row.get("platform", "xianyu"),
            "note": row.get("note", ""),
            "created_at": row.get("created_at", ""),
            "updated_at": row.get("updated_at", ""),
        }

        # Calculate derived fields
        target = entry["target_sell_price"]
        if target:
            fees = entry["fees"]
            fixed = fees["shipping_fee"] + fees["refurbish_fee"] + fees["other_fee"]
            platform_fee = target * fees["platform_fee_rate"]
            total_fees = round(fixed + platform_fee, 2)

            upper = round(target - total_fees - (target * entry["min_profit_rate"]), 2)
            ideal = round(target - total_fees - (target * entry["ideal_profit_rate"]), 2)

            entry["total_fees"] = total_fees
            entry["purchase_upper"] = upper
            entry["purchase_ideal"] = ideal
            entry["purchase_range"] = [ideal, upper]
        else:
            entry["total_fees"] = 0
            entry["purchase_upper"] = None
            entry["purchase_ideal"] = None
            entry["purchase_range"] = [None, None]

        return entry
