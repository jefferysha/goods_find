"""团队管理服务"""
import json
from datetime import datetime
from typing import List, Optional
from src.infrastructure.persistence.sqlite_manager import get_db


class TeamService:

    async def get_all_members(self) -> List[dict]:
        db = await get_db()
        try:
            cursor = await db.execute(
                """SELECT u.id as user_id, u.username, u.display_name, u.is_active, u.created_at,
                          COALESCE(t.role, 'member') as role,
                          COALESCE(t.focus_keywords, '[]') as focus_keywords
                   FROM users u
                   LEFT JOIN team_members t ON u.id = t.user_id
                   WHERE u.is_active = 1
                   ORDER BY u.id"""
            )
            rows = await cursor.fetchall()
            result = []
            for r in rows:
                member = dict(r)
                member["focus_keywords"] = json.loads(member.get("focus_keywords") or "[]")
                result.append(member)
            return result
        finally:
            await db.close()

    async def get_member(self, user_id: int) -> Optional[dict]:
        db = await get_db()
        try:
            cursor = await db.execute(
                """SELECT u.id as user_id, u.username, u.display_name, u.is_active, u.created_at,
                          COALESCE(t.role, 'member') as role,
                          COALESCE(t.focus_keywords, '[]') as focus_keywords
                   FROM users u
                   LEFT JOIN team_members t ON u.id = t.user_id
                   WHERE u.id = ?""",
                (user_id,),
            )
            row = await cursor.fetchone()
            if not row:
                return None
            member = dict(row)
            member["focus_keywords"] = json.loads(member.get("focus_keywords") or "[]")
            return member
        finally:
            await db.close()

    async def update_member(self, user_id: int, data: dict) -> Optional[dict]:
        member = await self.get_member(user_id)
        if not member:
            return None

        db = await get_db()
        try:
            # Upsert team_members row
            role = data.get("role", member.get("role", "member"))
            focus_keywords = data.get("focus_keywords", member.get("focus_keywords", []))
            keywords_json = json.dumps(focus_keywords, ensure_ascii=False)

            await db.execute(
                """INSERT INTO team_members (user_id, role, focus_keywords, updated_at)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(user_id) DO UPDATE SET
                   role = excluded.role,
                   focus_keywords = excluded.focus_keywords,
                   updated_at = excluded.updated_at""",
                (user_id, role, keywords_json, datetime.now().isoformat()),
            )

            # Update display_name in users table if provided
            if "display_name" in data and data["display_name"] is not None:
                await db.execute(
                    "UPDATE users SET display_name = ?, updated_at = datetime('now') WHERE id = ?",
                    (data["display_name"], user_id),
                )

            await db.commit()
        finally:
            await db.close()

        return await self.get_member(user_id)

    async def get_member_performance(self, user_id: Optional[int] = None, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[dict]:
        """获取成员业绩统计"""
        members = await self.get_all_members()
        if user_id:
            members = [m for m in members if m["user_id"] == user_id]

        results = []
        for member in members:
            username = member["username"]

            # Purchase stats
            db = await get_db()
            try:
                date_cond = ""
                date_params = []
                if start_date:
                    date_cond += " AND created_at >= ?"
                    date_params.append(start_date)
                if end_date:
                    date_cond += " AND created_at <= ?"
                    date_params.append(end_date)

                cursor = await db.execute(
                    f"""SELECT COUNT(*) as count, COALESCE(SUM(actual_price), 0) as total
                        FROM purchase_items WHERE assignee = ? AND status = 'purchased'{date_cond}""",
                    [username] + date_params,
                )
                purchase_row = await cursor.fetchone()
                purchase_stats = dict(purchase_row) if purchase_row else {"count": 0, "total": 0}

                # Sales stats
                sale_date_cond = ""
                sale_params = []
                if start_date:
                    sale_date_cond += " AND sold_at >= ?"
                    sale_params.append(start_date)
                if end_date:
                    sale_date_cond += " AND sold_at <= ?"
                    sale_params.append(end_date)

                cursor = await db.execute(
                    f"""SELECT COUNT(*) as count, COALESCE(SUM(sold_price), 0) as revenue,
                               COALESCE(SUM(total_cost), 0) as cost, COALESCE(SUM(profit), 0) as profit,
                               ROUND(COALESCE(AVG(profit_rate), 0), 2) as avg_profit_rate
                        FROM sale_records WHERE assignee = ?{sale_date_cond}""",
                    [username] + sale_params,
                )
                sale_row = await cursor.fetchone()
                sale_stats = dict(sale_row) if sale_row else {"count": 0, "revenue": 0, "cost": 0, "profit": 0, "avg_profit_rate": 0}

                # Inventory stats
                cursor = await db.execute(
                    """SELECT COUNT(*) as count, COALESCE(SUM(total_cost), 0) as value
                       FROM inventory_items WHERE assignee = ? AND status IN ('in_stock','refurbishing','listed')""",
                    (username,),
                )
                inv_row = await cursor.fetchone()
                inv_stats = dict(inv_row) if inv_row else {"count": 0, "value": 0}
            finally:
                await db.close()

            results.append({
                "user_id": member["user_id"],
                "username": username,
                "display_name": member.get("display_name", username),
                "purchase_count": purchase_stats["count"],
                "purchase_total": purchase_stats["total"],
                "sold_count": sale_stats["count"],
                "revenue": sale_stats["revenue"],
                "total_cost": sale_stats["cost"],
                "profit": sale_stats["profit"],
                "avg_profit_rate": sale_stats["avg_profit_rate"],
                "inventory_count": inv_stats["count"],
                "inventory_value": inv_stats["value"],
            })

        return results

    async def get_workspace_data(self, user_id: int) -> dict:
        """获取成员工作台数据"""
        member = await self.get_member(user_id)
        if not member:
            return {}

        username = member["username"]

        # My purchases (active)
        from src.services.purchase_service import PurchaseService
        purchase_service = PurchaseService()
        my_purchases = await purchase_service.get_all(assignee=username)
        active_purchases = [p for p in my_purchases if p["status"] not in ("purchased", "abandoned")]

        # My inventory summary
        from src.services.inventory_service import InventoryService
        inv_service = InventoryService()
        inv_summary = await inv_service.get_summary(assignee=username)
        aging_alerts = await inv_service.get_aging_alerts(days_threshold=7, assignee=username)

        # My performance this month
        from datetime import datetime
        now = datetime.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        perf = await self.get_member_performance(user_id=user_id, start_date=month_start)
        my_perf = perf[0] if perf else {}

        # Purchase stats by status
        purchase_stats = {}
        for p in active_purchases:
            s = p["status"]
            purchase_stats[s] = purchase_stats.get(s, 0) + 1

        return {
            "member": member,
            "active_purchases": active_purchases[:20],
            "purchase_stats": purchase_stats,
            "inventory_summary": inv_summary,
            "aging_alerts": aging_alerts[:10],
            "monthly_performance": my_perf,
        }
