"""基于 SQLite 的市场基准价仓储实现"""
import os
import aiosqlite
from typing import List, Optional
from datetime import datetime
from src.domain.models.market_price import MarketPrice
from src.domain.repositories.market_price_repository import MarketPriceRepository


CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS market_prices (
    id TEXT PRIMARY KEY,
    task_id INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    reference_price REAL NOT NULL,
    fair_used_price REAL,
    condition TEXT DEFAULT 'good',
    category TEXT DEFAULT '',
    platform TEXT DEFAULT 'xianyu',
    source TEXT DEFAULT '',
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_market_prices_task_id ON market_prices(task_id);
CREATE INDEX IF NOT EXISTS idx_market_prices_keyword ON market_prices(keyword);
"""


class SqliteMarketPriceRepository(MarketPriceRepository):
    """基于 SQLite 的市场基准价仓储"""

    def __init__(self, db_path: str = "data/monitor.db"):
        self.db_path = db_path

    async def _get_db(self) -> aiosqlite.Connection:
        os.makedirs(os.path.dirname(self.db_path) or ".", exist_ok=True)
        db = await aiosqlite.connect(self.db_path)
        db.row_factory = aiosqlite.Row
        await db.executescript(CREATE_TABLE_SQL)
        return db

    def _row_to_model(self, row: dict) -> MarketPrice:
        return MarketPrice(
            id=row["id"],
            task_id=row["task_id"],
            keyword=row["keyword"],
            reference_price=row["reference_price"],
            fair_used_price=row.get("fair_used_price"),
            condition=row.get("condition", "good"),
            category=row.get("category", ""),
            platform=row.get("platform", "xianyu"),
            source=row.get("source", ""),
            note=row.get("note", ""),
            created_at=row.get("created_at", ""),
            updated_at=row.get("updated_at", ""),
        )

    async def get_all(self) -> List[MarketPrice]:
        db = await self._get_db()
        try:
            cursor = await db.execute("SELECT * FROM market_prices ORDER BY created_at DESC")
            rows = await cursor.fetchall()
            return [self._row_to_model(dict(r)) for r in rows]
        finally:
            await db.close()

    async def get_by_id(self, id: str) -> Optional[MarketPrice]:
        db = await self._get_db()
        try:
            cursor = await db.execute("SELECT * FROM market_prices WHERE id = ?", (id,))
            row = await cursor.fetchone()
            return self._row_to_model(dict(row)) if row else None
        finally:
            await db.close()

    async def get_by_task_id(self, task_id: int) -> List[MarketPrice]:
        db = await self._get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM market_prices WHERE task_id = ? ORDER BY created_at DESC",
                (task_id,),
            )
            rows = await cursor.fetchall()
            return [self._row_to_model(dict(r)) for r in rows]
        finally:
            await db.close()

    async def create(self, price: MarketPrice) -> MarketPrice:
        db = await self._get_db()
        try:
            await db.execute(
                """INSERT INTO market_prices
                   (id, task_id, keyword, reference_price, fair_used_price,
                    condition, category, platform, source, note,
                    created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    price.id, price.task_id, price.keyword,
                    price.reference_price, price.fair_used_price,
                    price.condition, price.category, price.platform,
                    price.source, price.note,
                    price.created_at, price.updated_at,
                ),
            )
            await db.commit()
        finally:
            await db.close()
        return price

    async def update(self, id: str, data: dict) -> Optional[MarketPrice]:
        existing = await self.get_by_id(id)
        if not existing:
            return None

        fields = []
        params = []
        updatable = [
            "task_id", "keyword", "reference_price", "fair_used_price",
            "condition", "category", "platform", "source", "note",
        ]
        for field in updatable:
            if field in data:
                fields.append(f"{field} = ?")
                params.append(data[field])

        if not fields:
            return existing

        fields.append("updated_at = ?")
        params.append(datetime.now().isoformat())
        params.append(id)

        db = await self._get_db()
        try:
            await db.execute(
                f"UPDATE market_prices SET {', '.join(fields)} WHERE id = ?",
                params,
            )
            await db.commit()
        finally:
            await db.close()

        return await self.get_by_id(id)

    async def delete(self, id: str) -> bool:
        db = await self._get_db()
        try:
            cursor = await db.execute("DELETE FROM market_prices WHERE id = ?", (id,))
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()
