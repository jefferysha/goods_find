"""商品匹配服务 — 管理商品组与商品↔组映射"""
import os
from uuid import uuid4

import aiosqlite

_DEFAULT_DB_PATH = "data/monitor.db"

_CREATE_TABLES_SQL = """
CREATE TABLE IF NOT EXISTS product_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    normalized_name TEXT,
    category_path TEXT,
    brand TEXT,
    model TEXT,
    spec_summary TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_product_groups_brand ON product_groups(brand);
CREATE INDEX IF NOT EXISTS idx_product_groups_model ON product_groups(model);
CREATE INDEX IF NOT EXISTS idx_product_groups_category ON product_groups(category_path);

CREATE TABLE IF NOT EXISTS item_product_match (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    product_group_id TEXT NOT NULL,
    condition_tier TEXT,
    condition_detail TEXT,
    confidence REAL DEFAULT 0.0,
    matched_by TEXT DEFAULT 'ai',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (product_group_id) REFERENCES product_groups(id)
);
CREATE INDEX IF NOT EXISTS idx_item_match_item ON item_product_match(item_id);
CREATE INDEX IF NOT EXISTS idx_item_match_group ON item_product_match(product_group_id);
CREATE INDEX IF NOT EXISTS idx_item_match_condition ON item_product_match(condition_tier);
"""


class ProductMatchService:
    def __init__(self, db_path: str | None = None):
        self.db_path = db_path or _DEFAULT_DB_PATH

    async def _get_db(self) -> aiosqlite.Connection:
        os.makedirs(os.path.dirname(self.db_path) or ".", exist_ok=True)
        db = await aiosqlite.connect(self.db_path)
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys = ON")
        return db

    async def init_tables(self) -> None:
        db = await self._get_db()
        try:
            await db.executescript(_CREATE_TABLES_SQL)
            await db.commit()
        finally:
            await db.close()

    # ------------------------------------------------------------------
    # Product Groups CRUD
    # ------------------------------------------------------------------

    async def create_product_group(
        self,
        name: str,
        brand: str | None = None,
        model: str | None = None,
        category_path: str | None = None,
        spec_summary: str | None = None,
    ) -> dict:
        group_id = str(uuid4())
        normalized_name = name.strip().lower()

        db = await self._get_db()
        try:
            await db.execute(
                """INSERT INTO product_groups
                   (id, name, normalized_name, category_path, brand, model, spec_summary)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (group_id, name, normalized_name, category_path, brand, model, spec_summary),
            )
            await db.commit()
        finally:
            await db.close()

        return {
            "id": group_id,
            "name": name,
            "normalized_name": normalized_name,
            "category_path": category_path,
            "brand": brand,
            "model": model,
            "spec_summary": spec_summary,
        }

    async def get_product_group(self, group_id: str) -> dict | None:
        db = await self._get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM product_groups WHERE id = ?", (group_id,)
            )
            row = await cursor.fetchone()
            if row is None:
                return None
            return dict(row)
        finally:
            await db.close()

    async def list_product_groups(
        self,
        brand: str | None = None,
        model: str | None = None,
        category_path: str | None = None,
    ) -> list[dict]:
        conditions: list[str] = []
        params: list = []

        if brand is not None:
            conditions.append("brand = ?")
            params.append(brand)
        if model is not None:
            conditions.append("model = ?")
            params.append(model)
        if category_path is not None:
            conditions.append("category_path = ?")
            params.append(category_path)

        where = f" WHERE {' AND '.join(conditions)}" if conditions else ""
        sql = f"SELECT * FROM product_groups{where} ORDER BY created_at DESC"

        db = await self._get_db()
        try:
            cursor = await db.execute(sql, params)
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            await db.close()

    async def find_similar_groups(
        self,
        brand: str | None = None,
        model: str | None = None,
    ) -> list[dict]:
        conditions: list[str] = []
        params: list = []

        if brand is not None:
            conditions.append("brand = ?")
            params.append(brand)
        if model is not None:
            conditions.append("model = ?")
            params.append(model)

        if not conditions:
            return []

        where = " AND ".join(conditions)
        sql = f"SELECT * FROM product_groups WHERE {where} ORDER BY created_at DESC"

        db = await self._get_db()
        try:
            cursor = await db.execute(sql, params)
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            await db.close()

    async def delete_product_group(self, group_id: str) -> bool:
        db = await self._get_db()
        try:
            await db.execute(
                "DELETE FROM item_product_match WHERE product_group_id = ?",
                (group_id,),
            )
            cursor = await db.execute(
                "DELETE FROM product_groups WHERE id = ?", (group_id,)
            )
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    # ------------------------------------------------------------------
    # Item ↔ Group Mapping
    # ------------------------------------------------------------------

    async def link_item_to_group(
        self,
        item_id: str,
        product_group_id: str,
        condition_tier: str = "good",
        condition_detail: str = "",
        confidence: float = 0.0,
        matched_by: str = "ai",
    ) -> dict:
        link_id = str(uuid4())

        db = await self._get_db()
        try:
            await db.execute(
                """INSERT INTO item_product_match
                   (id, item_id, product_group_id, condition_tier, condition_detail, confidence, matched_by)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (link_id, item_id, product_group_id, condition_tier, condition_detail, confidence, matched_by),
            )
            await db.commit()
        finally:
            await db.close()

        return {
            "id": link_id,
            "item_id": item_id,
            "product_group_id": product_group_id,
            "condition_tier": condition_tier,
            "condition_detail": condition_detail,
            "confidence": confidence,
            "matched_by": matched_by,
        }

    async def get_group_items(self, group_id: str) -> list[dict]:
        db = await self._get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM item_product_match WHERE product_group_id = ? ORDER BY created_at DESC",
                (group_id,),
            )
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            await db.close()

    async def move_item(self, item_id: str, new_group_id: str) -> bool:
        db = await self._get_db()
        try:
            cursor = await db.execute(
                "UPDATE item_product_match SET product_group_id = ? WHERE item_id = ?",
                (new_group_id, item_id),
            )
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    async def merge_groups(
        self,
        target_group_id: str,
        source_group_ids: list[str],
    ) -> bool:
        if not source_group_ids:
            return False

        db = await self._get_db()
        try:
            for source_id in source_group_ids:
                await db.execute(
                    "UPDATE item_product_match SET product_group_id = ? WHERE product_group_id = ?",
                    (target_group_id, source_id),
                )
                await db.execute(
                    "DELETE FROM product_groups WHERE id = ?",
                    (source_id,),
                )
            await db.commit()
            return True
        finally:
            await db.close()
