"""利润核算服务"""
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from src.infrastructure.persistence.sqlite_manager import get_db


class ProfitService:

    async def create_sale_record(self, data: dict) -> dict:
        record_id = str(uuid.uuid4())
        now = datetime.now().isoformat()
        db = await get_db()
        try:
            await db.execute(
                """INSERT INTO sale_records (
                    id, inventory_item_id, title, keyword, platform,
                    purchase_price, total_cost, sold_price, profit, profit_rate,
                    sold_channel, assignee, sold_at, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    record_id, data.get("inventory_item_id", ""),
                    data.get("title", ""), data.get("keyword", ""),
                    data.get("platform", "xianyu"),
                    data.get("purchase_price", 0), data.get("total_cost", 0),
                    data.get("sold_price", 0), data.get("profit", 0),
                    data.get("profit_rate", 0), data.get("sold_channel", ""),
                    data.get("assignee"), data.get("sold_at", now), now,
                ),
            )
            await db.commit()
        finally:
            await db.close()
        return await self.get_sale_record(record_id)

    async def get_sale_record(self, record_id: str) -> Optional[dict]:
        db = await get_db()
        try:
            cursor = await db.execute("SELECT * FROM sale_records WHERE id = ?", (record_id,))
            row = await cursor.fetchone()
            return self._normalize_record(dict(row)) if row else None
        finally:
            await db.close()

    @staticmethod
    def _normalize_record(r: dict) -> dict:
        """将 DB 字段映射为前端 SaleRecord 期望的字段名"""
        r["net_profit"] = r.pop("profit", 0)
        # 确保费用明细字段存在
        for field in ("shipping_fee", "refurbish_fee", "platform_fee", "other_fee"):
            r.setdefault(field, 0)
        return r

    async def get_sale_records(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        keyword: Optional[str] = None,
        assignee: Optional[str] = None,
    ) -> List[dict]:
        db = await get_db()
        try:
            conditions = []
            params = []
            if start_date:
                conditions.append("sold_at >= ?")
                params.append(start_date)
            if end_date:
                conditions.append("sold_at <= ?")
                params.append(end_date)
            if keyword:
                conditions.append("keyword = ?")
                params.append(keyword)
            if assignee:
                conditions.append("assignee = ?")
                params.append(assignee)
            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
            cursor = await db.execute(
                f"SELECT * FROM sale_records {where} ORDER BY sold_at DESC", params
            )
            rows = await cursor.fetchall()
            return [self._normalize_record(dict(r)) for r in rows]
        finally:
            await db.close()

    async def get_summary(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        assignee: Optional[str] = None,
    ) -> dict:
        """获取利润汇总"""
        db = await get_db()
        try:
            conditions = []
            params = []
            if start_date:
                conditions.append("sold_at >= ?")
                params.append(start_date)
            if end_date:
                conditions.append("sold_at <= ?")
                params.append(end_date)
            if assignee:
                conditions.append("assignee = ?")
                params.append(assignee)
            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

            cursor = await db.execute(
                f"""SELECT
                    COUNT(*) as total_sold,
                    COALESCE(SUM(sold_price), 0) as total_revenue,
                    COALESCE(SUM(total_cost), 0) as total_cost,
                    COALESCE(SUM(profit), 0) as net_profit,
                    ROUND(COALESCE(AVG(profit_rate), 0), 2) as avg_profit_rate
                FROM sale_records {where}""",
                params,
            )
            row = await cursor.fetchone()
            return dict(row) if row else {
                "total_sold": 0, "total_revenue": 0, "total_cost": 0,
                "net_profit": 0, "avg_profit_rate": 0,
            }
        finally:
            await db.close()

    async def get_profit_by_keyword(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[dict]:
        """按品类统计利润"""
        db = await get_db()
        try:
            conditions = []
            params = []
            if start_date:
                conditions.append("sold_at >= ?")
                params.append(start_date)
            if end_date:
                conditions.append("sold_at <= ?")
                params.append(end_date)
            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

            cursor = await db.execute(
                f"""SELECT
                    keyword,
                    COUNT(*) as sold_count,
                    COALESCE(SUM(sold_price), 0) as total_revenue,
                    COALESCE(SUM(total_cost), 0) as total_cost,
                    COALESCE(SUM(profit), 0) as net_profit,
                    ROUND(COALESCE(AVG(profit_rate), 0), 2) as avg_profit_rate
                FROM sale_records {where}
                GROUP BY keyword
                ORDER BY net_profit DESC""",
                params,
            )
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            await db.close()

    async def get_profit_by_assignee(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[dict]:
        """按成员统计利润"""
        db = await get_db()
        try:
            conditions = []
            params = []
            if start_date:
                conditions.append("sold_at >= ?")
                params.append(start_date)
            if end_date:
                conditions.append("sold_at <= ?")
                params.append(end_date)
            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

            cursor = await db.execute(
                f"""SELECT
                    COALESCE(assignee, '未分配') as assignee,
                    COUNT(*) as sold_count,
                    COALESCE(SUM(sold_price), 0) as total_revenue,
                    COALESCE(SUM(total_cost), 0) as total_cost,
                    COALESCE(SUM(profit), 0) as net_profit,
                    ROUND(COALESCE(AVG(profit_rate), 0), 2) as avg_profit_rate
                FROM sale_records {where}
                GROUP BY assignee
                ORDER BY net_profit DESC""",
                params,
            )
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            await db.close()

    async def get_daily_profit(self, days: int = 30, assignee: Optional[str] = None) -> List[dict]:
        """获取每日利润趋势"""
        since = (datetime.now() - timedelta(days=days)).isoformat()
        db = await get_db()
        try:
            condition = "AND assignee = ?" if assignee else ""
            params = [since] + ([assignee] if assignee else [])

            cursor = await db.execute(
                f"""SELECT
                    DATE(sold_at) as date,
                    COUNT(*) as sold_count,
                    COALESCE(SUM(sold_price), 0) as revenue,
                    COALESCE(SUM(total_cost), 0) as cost,
                    COALESCE(SUM(profit), 0) as profit
                FROM sale_records
                WHERE sold_at >= ? {condition}
                GROUP BY DATE(sold_at)
                ORDER BY date ASC""",
                params,
            )
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            await db.close()
