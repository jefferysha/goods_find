"""AI 品类归类与商品匹配服务"""
import json
from typing import Optional, List, Dict, Any


class AIClassificationService:
    """AI 品类归类与商品特征提取"""

    def __init__(self, db_path: str = None):
        self.db_path = db_path

    async def init(self):
        """初始化（确保品类表存在）"""
        from src.services.category_service import CategoryService

        cat_service = CategoryService(db_path=self.db_path)
        await cat_service.init_tables()

    async def build_classification_prompt(
        self,
        title: str,
        platform: str,
        description: str = "",
        images: list = None,
    ) -> str:
        """构建品类归类 prompt"""
        from src.services.category_service import CategoryService

        cat_service = CategoryService(db_path=self.db_path)
        tree = await cat_service.get_category_tree()

        categories_text = self._format_category_tree(tree)

        prompt = f"""你是一个商品品类归类专家。请根据以下商品信息，判断它属于哪个品类。

## 已有品类树
{categories_text if categories_text else "（暂无已有品类）"}

## 商品信息
- 标题: {title}
- 平台: {platform}
- 描述: {description or '无'}

## 输出要求
请以 JSON 格式返回:
{{
    "category_path": "一级品类/二级品类/三级品类",
    "category_level1": "一级品类名",
    "category_level2": "二级品类名（可为null）",
    "category_level3": "三级品类名（可为null）",
    "confidence": 0.0-1.0,
    "suggested_new_category": null 或 {{"name": "新品类名", "parent": "父品类名"}}
}}
"""
        return prompt

    def _format_category_tree(self, tree: list, indent: int = 0) -> str:
        """格式化品类树为文本"""
        lines = []
        for node in tree:
            prefix = "  " * indent + "- "
            keywords = node.get("keywords", [])
            kw_text = f" (关键词: {', '.join(keywords)})" if keywords else ""
            lines.append(f"{prefix}{node['name']}{kw_text}")
            if node.get("children"):
                lines.append(
                    self._format_category_tree(node["children"], indent + 1)
                )
        return "\n".join(lines)

    def parse_classification_response(self, response_text: str) -> Dict[str, Any]:
        """解析品类归类的 AI 响应"""
        try:
            text = response_text.strip()
            if text.startswith("```"):
                lines = text.split("\n")
                lines = [l for l in lines if not l.strip().startswith("```")]
                text = "\n".join(lines)

            data = json.loads(text)
            return {
                "category_path": data.get("category_path", ""),
                "category_level1": data.get("category_level1", ""),
                "category_level2": data.get("category_level2"),
                "category_level3": data.get("category_level3"),
                "confidence": float(data.get("confidence", 0.0)),
                "suggested_new_category": data.get("suggested_new_category"),
            }
        except (json.JSONDecodeError, ValueError, TypeError):
            return {
                "category_path": "",
                "category_level1": "",
                "category_level2": None,
                "category_level3": None,
                "confidence": 0.0,
                "suggested_new_category": None,
            }

    async def build_product_match_prompt(
        self,
        title: str,
        platform: str,
        description: str = "",
        images: list = None,
    ) -> str:
        """构建商品特征提取 prompt（用于跨平台匹配）"""
        prompt = f"""你是一个二手商品鉴定专家。请从以下商品信息中提取关键特征，用于跨平台同商品识别。

## 商品信息
- 标题: {title}
- 平台: {platform}
- 描述: {description or '无'}
- 图片数量: {len(images) if images else 0}

## 输出要求
请以 JSON 格式返回:
{{
    "brand": "品牌名",
    "model": "型号",
    "specs": {{"key": "value"}},
    "condition_tier": "new/like_new/good/fair/poor",
    "condition_detail": "成色描述",
    "suggested_group_name": "建议的商品组名称"
}}

注意:
1. brand 和 model 尽量用英文或原始名称
2. condition_tier 必须是 new/like_new/good/fair/poor 之一
3. suggested_group_name 应简洁且能跨语言识别（如 "PS5 光驱版" 而非 "プレステ5"）
"""
        return prompt

    def parse_product_match_response(self, response_text: str) -> Dict[str, Any]:
        """解析商品特征提取的 AI 响应"""
        try:
            text = response_text.strip()
            if text.startswith("```"):
                lines = text.split("\n")
                lines = [l for l in lines if not l.strip().startswith("```")]
                text = "\n".join(lines)

            data = json.loads(text)
            return {
                "brand": data.get("brand", ""),
                "model": data.get("model", ""),
                "specs": data.get("specs", {}),
                "condition_tier": data.get("condition_tier", "good"),
                "condition_detail": data.get("condition_detail", ""),
                "suggested_group_name": data.get("suggested_group_name", ""),
            }
        except (json.JSONDecodeError, ValueError, TypeError):
            return {
                "brand": "",
                "model": "",
                "specs": {},
                "condition_tier": "good",
                "condition_detail": "",
                "suggested_group_name": "",
            }
