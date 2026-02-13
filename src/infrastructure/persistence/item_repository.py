"""商品数据仓储 —— items 表的读写操作"""
import json
from typing import List, Dict, Any, Optional
from src.infrastructure.persistence.sqlite_manager import get_db


def parse_price(price_str: str) -> float:
    """将价格字符串转为数字，失败返回 0.0"""
    if not price_str:
        return 0.0
    cleaned = str(price_str).replace("¥", "").replace(",", "").strip()
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return 0.0


def parse_int(value, default: int = 0) -> int:
    """安全转 int"""
    if isinstance(value, int):
        return value
    try:
        return int(str(value).replace(",", "").strip())
    except (ValueError, TypeError):
        return default


def record_to_row(record: dict) -> dict:
    """
    将一条 JSONL 格式的完整记录转换为 items 表的一行数据。
    """
    info = record.get("商品信息", {})
    seller = record.get("卖家信息", {})
    ai = record.get("ai_analysis", {})

    item_id = str(info.get("商品ID", ""))
    price = parse_price(info.get("当前售价", "0"))
    original_price = parse_price(info.get("商品原价", "0"))

    return {
        "item_id": item_id,
        "task_name": record.get("任务名称", ""),
        "keyword": record.get("搜索关键字", ""),
        "platform": record.get("platform", "xianyu"),
        "title": info.get("商品标题", ""),
        "price": price,
        "original_price": original_price if original_price > 0 else None,
        "region": info.get("发货地区", ""),
        "publish_time": info.get("发布时间", ""),
        "crawl_time": record.get("爬取时间", ""),
        "item_link": info.get("商品链接", ""),
        "image_url": info.get("商品主图链接", "") or (
            (info.get("商品图片列表") or [None])[0] or ""
        ),
        "want_count": parse_int(info.get("「想要」人数", 0)),
        "view_count": parse_int(info.get("浏览量", 0)),
        "is_recommended": 1 if ai.get("is_recommended") else 0,
        "ai_reason": ai.get("reason", ""),
        "risk_tags": json.dumps(ai.get("risk_tags", []), ensure_ascii=False),
        "seller_name": seller.get("卖家昵称", "") or info.get("卖家昵称", ""),
        "seller_credit": seller.get("卖家信用等级", ""),
        "seller_registration": seller.get("卖家注册时长", ""),
        # 价格本评估字段
        "category_id": record.get("category_id"),
        "category_name": record.get("category_name"),
        "evaluation_status": record.get("evaluation_status"),
        "purchase_range_low": record.get("purchase_range_low"),
        "purchase_range_high": record.get("purchase_range_high"),
        "estimated_profit": record.get("estimated_profit"),
        "estimated_profit_rate": record.get("estimated_profit_rate"),
        "premium_rate": record.get("premium_rate"),
        "raw_item_info": json.dumps(info, ensure_ascii=False),
        "raw_seller_info": json.dumps(seller, ensure_ascii=False),
        "raw_ai_analysis": json.dumps(ai, ensure_ascii=False),
    }


def row_to_record(row: dict) -> dict:
    """
    将 items 表的一行数据还原为前端期望的 JSONL 格式。
    保持与原 JSONL 格式完全一致，前端零改动。
    """
    raw_item = json.loads(row.get("raw_item_info") or "{}")
    raw_seller = json.loads(row.get("raw_seller_info") or "{}")
    raw_ai = json.loads(row.get("raw_ai_analysis") or "{}")

    return {
        "爬取时间": row.get("crawl_time", ""),
        "搜索关键字": row.get("keyword", ""),
        "任务名称": row.get("task_name", ""),
        "商品信息": raw_item,
        "卖家信息": raw_seller,
        "ai_analysis": raw_ai,
        "platform": row.get("platform", "xianyu"),
        # 价格本评估字段
        "category_id": row.get("category_id"),
        "category_name": row.get("category_name"),
        "evaluation_status": row.get("evaluation_status"),
        "purchase_range_low": row.get("purchase_range_low"),
        "purchase_range_high": row.get("purchase_range_high"),
        "estimated_profit": row.get("estimated_profit"),
        "estimated_profit_rate": row.get("estimated_profit_rate"),
        "premium_rate": row.get("premium_rate"),
    }


class ItemRepository:
    """items 表数据操作"""

    async def insert(self, record: dict) -> bool:
        """插入一条商品记录（INSERT OR IGNORE 去重）"""
        row = record_to_row(record)
        if not row["item_id"]:
            return False

        db = await get_db()
        try:
            await db.execute(
                """
                INSERT OR IGNORE INTO items (
                    item_id, task_name, keyword, platform,
                    title, price, original_price, region,
                    publish_time, crawl_time, item_link, image_url,
                    want_count, view_count,
                    is_recommended, ai_reason, risk_tags,
                    category_id, category_name, evaluation_status,
                    purchase_range_low, purchase_range_high,
                    estimated_profit, estimated_profit_rate, premium_rate,
                    seller_name, seller_credit, seller_registration,
                    raw_item_info, raw_seller_info, raw_ai_analysis
                ) VALUES (
                    :item_id, :task_name, :keyword, :platform,
                    :title, :price, :original_price, :region,
                    :publish_time, :crawl_time, :item_link, :image_url,
                    :want_count, :view_count,
                    :is_recommended, :ai_reason, :risk_tags,
                    :category_id, :category_name, :evaluation_status,
                    :purchase_range_low, :purchase_range_high,
                    :estimated_profit, :estimated_profit_rate, :premium_rate,
                    :seller_name, :seller_credit, :seller_registration,
                    :raw_item_info, :raw_seller_info, :raw_ai_analysis
                )
                """,
                row,
            )
            await db.commit()
            return True
        except Exception as e:
            print(f"[ItemRepository] insert 失败: {e}")
            return False
        finally:
            await db.close()

    async def insert_batch(self, records: List[dict]) -> int:
        """批量插入，返回成功条数"""
        rows = []
        for r in records:
            row = record_to_row(r)
            if row["item_id"]:
                rows.append(row)

        if not rows:
            return 0

        db = await get_db()
        inserted = 0
        try:
            for row in rows:
                try:
                    await db.execute(
                        """
                        INSERT OR IGNORE INTO items (
                            item_id, task_name, keyword, platform,
                            title, price, original_price, region,
                            publish_time, crawl_time, item_link, image_url,
                            want_count, view_count,
                            is_recommended, ai_reason, risk_tags,
                            category_id, category_name, evaluation_status,
                            purchase_range_low, purchase_range_high,
                            estimated_profit, estimated_profit_rate, premium_rate,
                            seller_name, seller_credit, seller_registration,
                            raw_item_info, raw_seller_info, raw_ai_analysis
                        ) VALUES (
                            :item_id, :task_name, :keyword, :platform,
                            :title, :price, :original_price, :region,
                            :publish_time, :crawl_time, :item_link, :image_url,
                            :want_count, :view_count,
                            :is_recommended, :ai_reason, :risk_tags,
                            :category_id, :category_name, :evaluation_status,
                            :purchase_range_low, :purchase_range_high,
                            :estimated_profit, :estimated_profit_rate, :premium_rate,
                            :seller_name, :seller_credit, :seller_registration,
                            :raw_item_info, :raw_seller_info, :raw_ai_analysis
                        )
                        """,
                        row,
                    )
                    inserted += 1
                except Exception:
                    continue
            await db.commit()
        finally:
            await db.close()
        return inserted

    async def query(
        self,
        keyword: Optional[str] = None,
        task_name: Optional[str] = None,
        recommended_only: bool = False,
        sort_by: str = "crawl_time",
        sort_order: str = "desc",
        page: int = 1,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """
        通用查询，返回 {total_items, page, limit, items}。
        items 以前端期望的 JSONL 格式返回。
        """
        conditions = []
        params: list = []

        if keyword:
            conditions.append("keyword = ?")
            params.append(keyword)
        if task_name:
            conditions.append("task_name = ?")
            params.append(task_name)
        if recommended_only:
            conditions.append("is_recommended = 1")

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

        # 安全排序字段映射
        sort_map = {
            "crawl_time": "crawl_time",
            "publish_time": "publish_time",
            "price": "price",
        }
        sort_col = sort_map.get(sort_by, "crawl_time")
        order = "DESC" if sort_order == "desc" else "ASC"

        db = await get_db()
        try:
            # 总数
            cursor = await db.execute(
                f"SELECT COUNT(*) as cnt FROM items {where}", params
            )
            row = await cursor.fetchone()
            total = dict(row)["cnt"] if row else 0

            # 分页数据
            offset = (page - 1) * limit
            cursor = await db.execute(
                f"""
                SELECT * FROM items {where}
                ORDER BY {sort_col} {order}
                LIMIT ? OFFSET ?
                """,
                params + [limit, offset],
            )
            rows = await cursor.fetchall()
            items = [row_to_record(dict(r)) for r in rows]

            return {
                "total_items": total,
                "page": page,
                "limit": limit,
                "items": items,
            }
        finally:
            await db.close()

    async def get_keywords(self) -> List[str]:
        """获取所有不同的关键词"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT DISTINCT keyword FROM items ORDER BY keyword"
            )
            rows = await cursor.fetchall()
            return [dict(r)["keyword"] for r in rows]
        finally:
            await db.close()

    async def get_stats(self) -> Dict[str, Any]:
        """获取汇总统计"""
        db = await get_db()
        try:
            cursor = await db.execute(
                """
                SELECT
                    COUNT(*) as total_items,
                    COUNT(DISTINCT keyword) as result_files,
                    COUNT(DISTINCT item_id) as unique_items
                FROM items
                """
            )
            row = await cursor.fetchone()
            return dict(row) if row else {"total_items": 0, "result_files": 0, "unique_items": 0}
        finally:
            await db.close()

    async def get_price_trend(
        self, keyword: str, days: int = 30
    ) -> List[Dict[str, Any]]:
        """按日期聚合某关键词的价格趋势"""
        from datetime import datetime, timedelta

        since = (datetime.now() - timedelta(days=days)).isoformat()
        db = await get_db()
        try:
            cursor = await db.execute(
                """
                SELECT
                    DATE(crawl_time) as date,
                    ROUND(AVG(price), 2) as avg_price,
                    ROUND(MIN(price), 2) as min_price,
                    ROUND(MAX(price), 2) as max_price,
                    COUNT(*) as count
                FROM items
                WHERE keyword = ? AND crawl_time >= ? AND price > 0
                GROUP BY DATE(crawl_time)
                ORDER BY date ASC
                """,
                (keyword, since),
            )
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            await db.close()

    async def get_premium_distribution(self, keyword: str) -> Dict[str, Any]:
        """获取某关键词的价格区间分布"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT price FROM items WHERE keyword = ? AND price > 0",
                (keyword,),
            )
            rows = await cursor.fetchall()
            prices = [dict(r)["price"] for r in rows]
        finally:
            await db.close()

        if not prices:
            return {"total": 0, "distribution": []}

        avg_price = sum(prices) / len(prices)
        brackets = [
            {"label": "极低价 (<50%均价)", "min_ratio": 0, "max_ratio": 0.5, "count": 0},
            {"label": "低价 (50%-80%均价)", "min_ratio": 0.5, "max_ratio": 0.8, "count": 0},
            {"label": "合理价 (80%-120%均价)", "min_ratio": 0.8, "max_ratio": 1.2, "count": 0},
            {"label": "偏高 (120%-150%均价)", "min_ratio": 1.2, "max_ratio": 1.5, "count": 0},
            {"label": "高价 (>150%均价)", "min_ratio": 1.5, "max_ratio": float("inf"), "count": 0},
        ]

        for p in prices:
            ratio = p / avg_price if avg_price > 0 else 0
            for bracket in brackets:
                if bracket["min_ratio"] <= ratio < bracket["max_ratio"]:
                    bracket["count"] += 1
                    break

        distribution = [
            {
                "label": b["label"],
                "count": b["count"],
                "percentage": round(b["count"] / len(prices) * 100, 1),
            }
            for b in brackets
        ]

        return {
            "total": len(prices),
            "avg_price": round(avg_price, 2),
            "distribution": distribution,
        }

    async def get_top_keywords(self, limit: int = 10) -> List[Dict[str, Any]]:
        """热门关键词统计"""
        db = await get_db()
        try:
            cursor = await db.execute(
                """
                SELECT keyword, COUNT(*) as count
                FROM items
                GROUP BY keyword
                ORDER BY count DESC
                LIMIT ?
                """,
                (limit,),
            )
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            await db.close()

    async def get_all_for_keyword(self, keyword: str) -> List[Dict[str, Any]]:
        """获取某关键词的全部原始记录（用于 pricing 分析）"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM items WHERE keyword = ? ORDER BY crawl_time DESC",
                (keyword,),
            )
            rows = await cursor.fetchall()
            return [row_to_record(dict(r)) for r in rows]
        finally:
            await db.close()

    async def get_item_price_history(
        self, item_id: str, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """获取某商品的价格历史"""
        db = await get_db()
        try:
            cursor = await db.execute(
                """
                SELECT item_id, task_name, title, price, crawl_time
                FROM items
                WHERE item_id = ?
                ORDER BY crawl_time ASC
                LIMIT ?
                """,
                (item_id, limit),
            )
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            await db.close()

    async def get_batch_price_history(
        self, item_ids: List[str], limit_per_item: int = 50
    ) -> Dict[str, List[Dict[str, Any]]]:
        """批量获取多个商品的价格历史"""
        result: Dict[str, List[Dict[str, Any]]] = {}
        db = await get_db()
        try:
            for item_id in item_ids:
                cursor = await db.execute(
                    """
                    SELECT item_id, task_name, title, price, crawl_time
                    FROM items
                    WHERE item_id = ?
                    ORDER BY crawl_time ASC
                    LIMIT ?
                    """,
                    (item_id, limit_per_item),
                )
                rows = await cursor.fetchall()
                result[item_id] = [dict(r) for r in rows]
        finally:
            await db.close()
        return result

    async def delete_by_keyword(self, keyword: str) -> int:
        """删除某关键词的所有数据"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "DELETE FROM items WHERE keyword = ?", (keyword,)
            )
            await db.commit()
            return cursor.rowcount
        finally:
            await db.close()

    async def count(self) -> int:
        """总记录数"""
        db = await get_db()
        try:
            cursor = await db.execute("SELECT COUNT(*) as cnt FROM items")
            row = await cursor.fetchone()
            return dict(row)["cnt"] if row else 0
        finally:
            await db.close()
    
    async def query_items(
        self,
        filters: Optional[Dict[str, Any]] = None,
        order_by: str = "crawl_time",
        limit: int = 500
    ) -> List[dict]:
        """
        通用查询方法，支持多种筛选和排序
        
        Args:
            filters: 筛选条件字典 {字段名: 值}
            order_by: 排序字段 (crawl_time/price/profit_rate/profit)
            limit: 最大数量
            
        Returns:
            商品列表（JSONL 格式）
        """
        conditions = []
        params = []
        
        if filters:
            for key, value in filters.items():
                conditions.append(f"{key} = ?")
                params.append(value)
        
        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        
        # 排序映射
        order_map = {
            "crawl_time": "crawl_time DESC",
            "price": "price ASC",
            "profit_rate": "estimated_profit_rate DESC",
            "profit": "estimated_profit DESC"
        }
        order_clause = order_map.get(order_by, "crawl_time DESC")
        
        db = await get_db()
        try:
            cursor = await db.execute(
                f"""
                SELECT * FROM items {where}
                ORDER BY {order_clause}
                LIMIT ?
                """,
                params + [limit]
            )
            rows = await cursor.fetchall()
            return [row_to_record(dict(r)) for r in rows]
        finally:
            await db.close()
