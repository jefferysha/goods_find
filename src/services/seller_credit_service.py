"""
卖家信用评分服务
基于多维度指标计算卖家信用分，提供黑白名单管理。
"""
from typing import Dict, Optional, Any
from src.infrastructure.persistence.sqlite_manager import get_db


# 评分权重
WEIGHT_CREDIT_LEVEL = 20     # 闲鱼信用等级（满分20）
WEIGHT_TOTAL_SOLD = 20       # 成交量（满分20）
WEIGHT_POSITIVE_RATE = 30    # 好评率（满分30）
WEIGHT_ACCOUNT_AGE = 15      # 账号年龄（满分15）
WEIGHT_RESPONSE_TIME = 15    # 回复速度（满分15）

# 信用等级阈值
RELIABLE_THRESHOLD = 70
RISKY_THRESHOLD = 40


class SellerCreditService:
    """卖家信用评分服务"""

    # ── 评分计算 ────────────────────────────────────────────

    def calculate_credit_score(
        self,
        credit_level: int = 1,
        total_sold: int = 0,
        positive_rate: float = 0.0,
        account_age_days: int = 0,
        avg_response_time_hours: float = 24.0,
    ) -> float:
        """
        计算卖家信用分（0-100）。

        各维度得分 * 权重归一化后求和。
        """
        # 1. 信用等级分 (1-5 → 0-20)
        level_score = min(credit_level, 5) / 5 * WEIGHT_CREDIT_LEVEL

        # 2. 成交量分 (0-500+ → 0-20)，对数衰减
        import math
        sold_score = min(math.log10(max(total_sold, 1) + 1) / math.log10(501), 1.0) * WEIGHT_TOTAL_SOLD

        # 3. 好评率分 (0-1 → 0-30)
        rate_score = min(max(positive_rate, 0.0), 1.0) * WEIGHT_POSITIVE_RATE

        # 4. 账号年龄分 (0-1000+ 天 → 0-15)
        age_score = min(account_age_days / 1000, 1.0) * WEIGHT_ACCOUNT_AGE

        # 5. 回复速度分 (0-24+ 小时 → 15-0，越快越高)
        response_score = max(1.0 - min(avg_response_time_hours, 24.0) / 24.0, 0.0) * WEIGHT_RESPONSE_TIME

        total = level_score + sold_score + rate_score + age_score + response_score
        return round(min(max(total, 0), 100), 2)

    def classify_seller(self, score: float) -> str:
        """根据信用分分类卖家"""
        if score >= RELIABLE_THRESHOLD:
            return "reliable"
        elif score >= RISKY_THRESHOLD:
            return "normal"
        else:
            return "risky"

    # ── 黑白名单 ────────────────────────────────────────────

    async def _save_list_entry(
        self, seller_id: str, seller_name: str, list_type: str, reason: str
    ) -> bool:
        """保存到黑/白名单"""
        from datetime import datetime
        db = await get_db()
        try:
            await db.execute(
                """INSERT OR REPLACE INTO seller_lists
                   (seller_id, seller_name, list_type, reason, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (seller_id, seller_name, list_type, reason, datetime.now().isoformat()),
            )
            await db.commit()
            return True
        except Exception as e:
            print(f"保存卖家名单失败: {e}")
            return False
        finally:
            await db.close()

    async def _get_list_entry(self, seller_id: str) -> Optional[Dict]:
        """获取卖家名单信息"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM seller_lists WHERE seller_id = ?", (seller_id,)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None
        finally:
            await db.close()

    async def add_to_blacklist(self, seller_id: str, seller_name: str, reason: str = "") -> bool:
        return await self._save_list_entry(seller_id, seller_name, "blacklist", reason)

    async def add_to_whitelist(self, seller_id: str, seller_name: str, reason: str = "") -> bool:
        return await self._save_list_entry(seller_id, seller_name, "whitelist", reason)

    async def remove_from_list(self, seller_id: str) -> bool:
        db = await get_db()
        try:
            cursor = await db.execute("DELETE FROM seller_lists WHERE seller_id = ?", (seller_id,))
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    async def check_seller_status(self, seller_id: str) -> Dict[str, bool]:
        """检查卖家是否在黑/白名单中"""
        entry = await self._get_list_entry(seller_id)
        if entry is None:
            return {"is_blacklisted": False, "is_whitelisted": False}
        return {
            "is_blacklisted": entry.get("list_type") == "blacklist",
            "is_whitelisted": entry.get("list_type") == "whitelist",
        }

    async def get_seller_profile(self, seller_id: str) -> Optional[Dict[str, Any]]:
        """获取卖家信用概况（从缓存/数据库）"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM seller_profiles WHERE seller_id = ?", (seller_id,)
            )
            row = await cursor.fetchone()
            return dict(row) if row else None
        finally:
            await db.close()

    async def get_blacklist(self) -> list:
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM seller_lists WHERE list_type = 'blacklist' ORDER BY created_at DESC"
            )
            return [dict(r) for r in await cursor.fetchall()]
        finally:
            await db.close()

    async def get_whitelist(self) -> list:
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM seller_lists WHERE list_type = 'whitelist' ORDER BY created_at DESC"
            )
            return [dict(r) for r in await cursor.fetchall()]
        finally:
            await db.close()
