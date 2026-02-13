"""智能提醒规则引擎服务"""
import json
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime

from src.domain.models.alert_rule import AlertRule, AlertRuleCreate, AlertRuleUpdate, AlertCondition
from src.infrastructure.persistence.sqlite_manager import get_db


# 操作符映射
OPERATORS = {
    "lt": lambda a, b: a < b,
    "lte": lambda a, b: a <= b,
    "gt": lambda a, b: a > b,
    "gte": lambda a, b: a >= b,
    "eq": lambda a, b: a == b,
}


class AlertService:
    """提醒规则 CRUD + 条件评估引擎"""

    # ===== CRUD =====

    async def get_all_rules(self, task_id: Optional[int] = None) -> List[AlertRule]:
        """获取所有提醒规则，可按 task_id 筛选"""
        db = await get_db()
        try:
            if task_id is not None:
                cursor = await db.execute(
                    "SELECT * FROM alert_rules WHERE task_id = ? ORDER BY created_at DESC",
                    (task_id,),
                )
            else:
                cursor = await db.execute(
                    "SELECT * FROM alert_rules ORDER BY created_at DESC"
                )
            rows = await cursor.fetchall()
            return [self._row_to_rule(dict(row)) for row in rows]
        finally:
            await db.close()

    async def get_rule_by_id(self, rule_id: str) -> Optional[AlertRule]:
        """按 ID 获取单条规则"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT * FROM alert_rules WHERE id = ?", (rule_id,)
            )
            row = await cursor.fetchone()
            if row is None:
                return None
            return self._row_to_rule(dict(row))
        finally:
            await db.close()

    async def create_rule(self, data: AlertRuleCreate) -> AlertRule:
        """创建新规则"""
        now = datetime.now().isoformat()
        rule = AlertRule(
            id=str(uuid.uuid4()),
            task_id=data.task_id,
            name=data.name,
            enabled=data.enabled,
            conditions=data.conditions,
            channels=data.channels,
            created_at=now,
            updated_at=now,
        )

        db = await get_db()
        try:
            await db.execute(
                """
                INSERT INTO alert_rules (id, task_id, name, enabled, conditions, channels, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    rule.id,
                    rule.task_id,
                    rule.name,
                    1 if rule.enabled else 0,
                    json.dumps([c.dict() for c in rule.conditions], ensure_ascii=False),
                    json.dumps(rule.channels, ensure_ascii=False),
                    rule.created_at,
                    rule.updated_at,
                ),
            )
            await db.commit()
        finally:
            await db.close()

        return rule

    async def update_rule(self, rule_id: str, data: AlertRuleUpdate) -> Optional[AlertRule]:
        """更新规则"""
        existing = await self.get_rule_by_id(rule_id)
        if existing is None:
            return None

        now = datetime.now().isoformat()
        update_fields = data.dict(exclude_unset=True)

        if "name" in update_fields:
            existing.name = update_fields["name"]
        if "enabled" in update_fields:
            existing.enabled = update_fields["enabled"]
        if "conditions" in update_fields:
            existing.conditions = update_fields["conditions"]
        if "channels" in update_fields:
            existing.channels = update_fields["channels"]

        existing.updated_at = now

        db = await get_db()
        try:
            await db.execute(
                """
                UPDATE alert_rules
                SET name = ?, enabled = ?, conditions = ?, channels = ?, updated_at = ?
                WHERE id = ?
                """,
                (
                    existing.name,
                    1 if existing.enabled else 0,
                    json.dumps([c.dict() for c in existing.conditions], ensure_ascii=False),
                    json.dumps(existing.channels, ensure_ascii=False),
                    existing.updated_at,
                    rule_id,
                ),
            )
            await db.commit()
        finally:
            await db.close()

        return existing

    async def delete_rule(self, rule_id: str) -> bool:
        """删除规则"""
        db = await get_db()
        try:
            cursor = await db.execute(
                "DELETE FROM alert_rules WHERE id = ?", (rule_id,)
            )
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    # ===== 条件评估引擎 =====

    def evaluate_item(self, item: Dict[str, Any], rules: List[AlertRule]) -> List[Dict[str, Any]]:
        """
        对单个商品评估所有已启用规则。
        返回匹配的规则列表（包含规则信息和触发详情）。
        """
        triggered: List[Dict[str, Any]] = []

        for rule in rules:
            if not rule.enabled:
                continue

            match_results = self._evaluate_conditions(item, rule.conditions)
            if match_results["all_matched"]:
                triggered.append({
                    "rule_id": rule.id,
                    "rule_name": rule.name,
                    "channels": rule.channels,
                    "match_details": match_results["details"],
                })

        return triggered

    def _evaluate_conditions(
        self,
        item: Dict[str, Any],
        conditions: List[AlertCondition],
    ) -> Dict[str, Any]:
        """评估一组条件，所有条件都满足才算匹配（AND 逻辑）"""
        details: List[Dict[str, Any]] = []
        all_matched = True

        for cond in conditions:
            actual_value = self._extract_field_value(item, cond.field)
            if actual_value is None:
                all_matched = False
                details.append({
                    "field": cond.field,
                    "matched": False,
                    "reason": f"字段 {cond.field} 不存在或值无效",
                })
                continue

            op_func = OPERATORS.get(cond.operator)
            if op_func is None:
                all_matched = False
                details.append({
                    "field": cond.field,
                    "matched": False,
                    "reason": f"不支持的操作符: {cond.operator}",
                })
                continue

            matched = op_func(actual_value, cond.value)
            if not matched:
                all_matched = False

            details.append({
                "field": cond.field,
                "operator": cond.operator,
                "expected": cond.value,
                "actual": actual_value,
                "matched": matched,
            })

        return {"all_matched": all_matched, "details": details}

    def _extract_field_value(self, item: Dict[str, Any], field: str) -> Optional[float]:
        """从商品数据中提取指定字段的数值"""
        # 直接字段
        if field in item:
            return self._to_float(item[field])

        # 嵌套在 商品信息 中
        info = item.get("商品信息", {})
        field_mapping = {
            "price": "当前售价",
            "premium_rate": "溢价率",
            "ai_score": "AI评分",
        }

        mapped_key = field_mapping.get(field, field)
        if mapped_key in info:
            return self._to_float(info[mapped_key])

        # 尝试直接用原始 field 名在 info 中查找
        if field in info:
            return self._to_float(info[field])

        # 尝试在分析数据中查找
        analysis = item.get("分析结果", item.get("analysis", {}))
        if field in analysis:
            return self._to_float(analysis[field])

        return None

    @staticmethod
    def _to_float(value: Any) -> Optional[float]:
        """安全地转换为 float"""
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        try:
            cleaned = str(value).replace("¥", "").replace(",", "").replace("%", "").strip()
            return float(cleaned)
        except (ValueError, TypeError):
            return None

    # ===== 工具方法 =====

    @staticmethod
    def _row_to_rule(row: Dict[str, Any]) -> AlertRule:
        """将数据库行转换为 AlertRule 对象"""
        conditions_raw = json.loads(row.get("conditions", "[]"))
        conditions = [AlertCondition(**c) for c in conditions_raw]
        channels = json.loads(row.get("channels", "[]"))

        return AlertRule(
            id=row["id"],
            task_id=row.get("task_id"),
            name=row["name"],
            enabled=bool(row.get("enabled", 1)),
            conditions=conditions,
            channels=channels,
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
        )
