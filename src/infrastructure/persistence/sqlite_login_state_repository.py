"""基于 SQLite 的登录状态 / 账号状态仓储（统一替代 state/*.json + xianyu_state.json）"""
import os
import aiosqlite
from typing import Optional, List
from datetime import datetime

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS login_states (
    name TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);
"""


class SqliteLoginStateRepository:

    def __init__(self, db_path: str = "data/monitor.db"):
        self.db_path = db_path

    async def _get_db(self) -> aiosqlite.Connection:
        os.makedirs(os.path.dirname(self.db_path) or ".", exist_ok=True)
        db = await aiosqlite.connect(self.db_path)
        db.row_factory = aiosqlite.Row
        await db.executescript(CREATE_TABLE_SQL)
        return db

    async def get(self, name: str) -> Optional[str]:
        """获取指定名称的登录状态 JSON 内容"""
        db = await self._get_db()
        try:
            cursor = await db.execute(
                "SELECT content FROM login_states WHERE name = ?", (name,)
            )
            row = await cursor.fetchone()
            return dict(row)["content"] if row else None
        finally:
            await db.close()

    async def save(self, name: str, content: str) -> None:
        """保存/覆盖登录状态"""
        db = await self._get_db()
        try:
            now = datetime.now().isoformat()
            await db.execute(
                """INSERT INTO login_states (name, content, updated_at)
                   VALUES (?, ?, ?)
                   ON CONFLICT(name) DO UPDATE SET
                       content = excluded.content,
                       updated_at = excluded.updated_at""",
                (name, content, now),
            )
            await db.commit()
        finally:
            await db.close()

    async def delete(self, name: str) -> bool:
        """删除指定名称的登录状态"""
        db = await self._get_db()
        try:
            cursor = await db.execute(
                "DELETE FROM login_states WHERE name = ?", (name,)
            )
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    async def list_all(self) -> List[dict]:
        """列出所有登录状态"""
        db = await self._get_db()
        try:
            cursor = await db.execute(
                "SELECT name, updated_at FROM login_states ORDER BY name"
            )
            rows = await cursor.fetchall()
            return [{"name": dict(r)["name"], "updated_at": dict(r)["updated_at"]} for r in rows]
        finally:
            await db.close()

    async def export_to_file(self, name: str, file_path: str) -> bool:
        """将数据库中的登录状态导出为 JSON 文件（给 Playwright 使用）"""
        content = await self.get(name)
        if content is None:
            return False
        os.makedirs(os.path.dirname(file_path) or ".", exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True

    async def sync_all_to_dir(self, target_dir: str) -> int:
        """将所有登录状态导出到指定目录，返回导出文件数"""
        db = await self._get_db()
        try:
            cursor = await db.execute("SELECT name, content FROM login_states")
            rows = await cursor.fetchall()
        finally:
            await db.close()

        if not rows:
            return 0

        os.makedirs(target_dir, exist_ok=True)
        count = 0
        for row in rows:
            r = dict(row)
            file_path = os.path.join(target_dir, f"{r['name']}.json")
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(r["content"])
            count += 1
        return count
