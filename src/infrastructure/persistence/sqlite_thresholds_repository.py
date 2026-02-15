"""基于 SQLite 的溢价阈值仓储"""
import os
import aiosqlite
from typing import Optional

DEFAULT_THRESHOLDS = {
    "task_id": None,
    "low_price_max": -15.0,
    "fair_max": 5.0,
    "slight_premium_max": 20.0,
}

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS pricing_thresholds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    low_price_max REAL NOT NULL DEFAULT -15.0,
    fair_max REAL NOT NULL DEFAULT 5.0,
    slight_premium_max REAL NOT NULL DEFAULT 20.0,
    UNIQUE(task_id)
);
"""


class SqliteThresholdsRepository:

    def __init__(self, db_path: str = "data/monitor.db"):
        self.db_path = db_path

    async def _get_db(self) -> aiosqlite.Connection:
        os.makedirs(os.path.dirname(self.db_path) or ".", exist_ok=True)
        db = await aiosqlite.connect(self.db_path)
        db.row_factory = aiosqlite.Row
        await db.executescript(CREATE_TABLE_SQL)
        return db

    async def get(self, task_id: Optional[int] = None) -> dict:
        db = await self._get_db()
        try:
            # 先查指定 task_id
            if task_id is not None:
                cursor = await db.execute(
                    "SELECT * FROM pricing_thresholds WHERE task_id = ?", (task_id,)
                )
                row = await cursor.fetchone()
                if row:
                    return dict(row)

            # 找全局 (task_id IS NULL)
            cursor = await db.execute(
                "SELECT * FROM pricing_thresholds WHERE task_id IS NULL"
            )
            row = await cursor.fetchone()
            if row:
                return dict(row)

            # 都没有，返回默认值
            return dict(DEFAULT_THRESHOLDS)
        finally:
            await db.close()

    async def upsert(self, data: dict) -> dict:
        task_id = data.get("task_id")
        low_price_max = data.get("low_price_max", -15.0)
        fair_max = data.get("fair_max", 5.0)
        slight_premium_max = data.get("slight_premium_max", 20.0)

        db = await self._get_db()
        try:
            if task_id is None:
                # SQLite 无法用 = 比较 NULL，用 IS NULL
                await db.execute(
                    """INSERT INTO pricing_thresholds (task_id, low_price_max, fair_max, slight_premium_max)
                       VALUES (NULL, ?, ?, ?)
                       ON CONFLICT(task_id) DO UPDATE SET
                           low_price_max = excluded.low_price_max,
                           fair_max = excluded.fair_max,
                           slight_premium_max = excluded.slight_premium_max""",
                    (low_price_max, fair_max, slight_premium_max),
                )
            else:
                await db.execute(
                    """INSERT INTO pricing_thresholds (task_id, low_price_max, fair_max, slight_premium_max)
                       VALUES (?, ?, ?, ?)
                       ON CONFLICT(task_id) DO UPDATE SET
                           low_price_max = excluded.low_price_max,
                           fair_max = excluded.fair_max,
                           slight_premium_max = excluded.slight_premium_max""",
                    (task_id, low_price_max, fair_max, slight_premium_max),
                )
            await db.commit()
        finally:
            await db.close()

        return await self.get(task_id=task_id)
