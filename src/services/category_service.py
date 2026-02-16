"""品类树服务 — 管理品类层级（最多三级）"""
import json
import os
from uuid import uuid4

import aiosqlite

_DEFAULT_DB_PATH = "data/monitor.db"

_CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS category_tree (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    keywords TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (parent_id) REFERENCES category_tree(id)
);
CREATE INDEX IF NOT EXISTS idx_category_tree_parent ON category_tree(parent_id);
CREATE INDEX IF NOT EXISTS idx_category_tree_level ON category_tree(level);
"""


class CategoryService:
    def __init__(self, db_path: str | None = None):
        self.db_path = db_path or _DEFAULT_DB_PATH

    async def _get_db(self) -> aiosqlite.Connection:
        os.makedirs(os.path.dirname(self.db_path) or ".", exist_ok=True)
        db = await aiosqlite.connect(self.db_path)
        db.row_factory = aiosqlite.Row
        return db

    async def init_tables(self) -> None:
        db = await self._get_db()
        try:
            await db.executescript(_CREATE_TABLE_SQL)
            await db.commit()
        finally:
            await db.close()

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------

    async def create_category(
        self,
        name: str,
        level: int,
        parent_id: str | None = None,
        keywords: list[str] | None = None,
    ) -> dict:
        cat_id = str(uuid4())
        kw_json = json.dumps(keywords or [], ensure_ascii=False)

        db = await self._get_db()
        try:
            await db.execute(
                "INSERT INTO category_tree (id, name, parent_id, level, keywords) VALUES (?, ?, ?, ?, ?)",
                (cat_id, name, parent_id, level, kw_json),
            )
            await db.commit()
        finally:
            await db.close()

        return {
            "id": cat_id,
            "name": name,
            "parent_id": parent_id,
            "level": level,
            "keywords": keywords or [],
        }

    async def get_category(self, category_id: str) -> dict | None:
        db = await self._get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM category_tree WHERE id = ?", (category_id,)
            )
            row = await cursor.fetchone()
            if row is None:
                return None
            return self._row_to_dict(row)
        finally:
            await db.close()

    async def get_category_tree(self) -> list[dict]:
        db = await self._get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM category_tree ORDER BY level, created_at"
            )
            rows = await cursor.fetchall()
        finally:
            await db.close()

        nodes: dict[str, dict] = {}
        for row in rows:
            node = self._row_to_dict(row)
            node["children"] = []
            nodes[node["id"]] = node

        roots: list[dict] = []
        for node in nodes.values():
            pid = node["parent_id"]
            if pid is None:
                roots.append(node)
            elif pid in nodes:
                nodes[pid]["children"].append(node)

        return roots

    async def update_category(
        self,
        category_id: str,
        name: str | None = None,
        keywords: list[str] | None = None,
    ) -> dict:
        sets: list[str] = []
        params: list = []

        if name is not None:
            sets.append("name = ?")
            params.append(name)
        if keywords is not None:
            sets.append("keywords = ?")
            params.append(json.dumps(keywords, ensure_ascii=False))

        if not sets:
            return await self.get_category(category_id)  # type: ignore[return-value]

        params.append(category_id)
        sql = f"UPDATE category_tree SET {', '.join(sets)} WHERE id = ?"

        db = await self._get_db()
        try:
            await db.execute(sql, params)
            await db.commit()
        finally:
            await db.close()

        return await self.get_category(category_id)  # type: ignore[return-value]

    async def delete_category(self, category_id: str) -> bool:
        db = await self._get_db()
        try:
            cursor = await db.execute(
                "DELETE FROM category_tree WHERE id = ?", (category_id,)
            )
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    async def get_category_path(self, category_id: str) -> str:
        parts: list[str] = []
        current_id: str | None = category_id

        db = await self._get_db()
        try:
            while current_id is not None:
                cursor = await db.execute(
                    "SELECT id, name, parent_id FROM category_tree WHERE id = ?",
                    (current_id,),
                )
                row = await cursor.fetchone()
                if row is None:
                    break
                parts.append(row["name"])
                current_id = row["parent_id"]
        finally:
            await db.close()

        parts.reverse()
        return "/".join(parts)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _row_to_dict(row: aiosqlite.Row) -> dict:
        d = dict(row)
        d["keywords"] = json.loads(d.get("keywords") or "[]")
        return d
