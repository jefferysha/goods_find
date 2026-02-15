"""
AI 议价话术生成服务
基于商品信息和目标价格，通过 AI 生成多种议价话术。
"""
import json
from typing import Dict, List, Optional, Any
from src.infrastructure.external.ai_client import AIClient


# 议价策略定义
STRATEGIES = [
    {
        "id": "gentle",
        "name": "温和友好型",
        "description": "以礼貌友好的态度协商价格，适合面对个人卖家",
        "prompt_hint": "使用友好、礼貌的语气，表达诚意购买的意愿，委婉提出价格商量。",
    },
    {
        "id": "aggressive",
        "name": "强势压价型",
        "description": "直接指出价格偏高，引用市场行情数据施压",
        "prompt_hint": "直接了当地指出当前价格高于市场行情，引用同类商品价格数据，要求降价。语气坚定但不失礼貌。",
    },
    {
        "id": "defect_focused",
        "name": "瑕疵议价型",
        "description": "针对商品瑕疵或不足之处进行议价",
        "prompt_hint": "根据商品描述中可能存在的瑕疵、磨损、使用痕迹等问题，合理地以此作为降价理由。",
    },
    {
        "id": "bulk_buyer",
        "name": "批量诚意型",
        "description": "表达批量采购意向或长期合作诚意",
        "prompt_hint": "表达长期关注、诚意购买、可能多次回购的意愿，以此争取优惠价格。",
    },
]


class BargainService:
    """AI 议价话术生成服务"""

    def __init__(self):
        self.ai_client = AIClient()

    def get_available_strategies(self) -> List[Dict[str, str]]:
        """获取可用的议价策略列表"""
        return [{"id": s["id"], "name": s["name"], "description": s["description"]} for s in STRATEGIES]

    def build_bargain_prompt(
        self,
        item_info: Dict[str, Any],
        target_price: float,
        strategy: str = "gentle",
    ) -> str:
        """构建议价话术的 AI prompt"""
        strategy_obj = next((s for s in STRATEGIES if s["id"] == strategy), STRATEGIES[0])

        title = item_info.get("title", "未知商品")
        price = item_info.get("price", "未知")
        description = item_info.get("description", "")

        prompt = f"""你是一位经验丰富的二手交易议价专家。请根据以下商品信息，生成2-3条议价话术。

## 商品信息
- 商品标题: {title}
- 卖家标价: {price}元
- 我的目标价: {target_price}元
- 商品描述: {description}

## 议价策略
{strategy_obj['prompt_hint']}

## 输出要求
请以 JSON 格式输出，包含 scripts 数组，每条话术包含：
- opening: 开场白（第一句话）
- reasoning: 议价理由（为什么应该降价）
- follow_up: 跟进话术（对方犹豫时的回复）

注意：
1. 话术要自然口语化，像真人聊天
2. 避免过于套路化的表达
3. 理由要合理、有说服力
4. 语气符合策略要求"""

        return prompt

    async def _call_ai(self, prompt: str) -> Optional[Dict]:
        """调用 AI 生成话术"""
        if not self.ai_client.is_available():
            return None

        try:
            messages = [{"role": "user", "content": [{"type": "text", "text": prompt}]}]
            response_text = await self.ai_client._call_ai(messages)
            return self.ai_client._parse_response(response_text)
        except Exception as e:
            print(f"AI 议价话术生成失败: {e}")
            return None

    async def generate_bargain_scripts(
        self,
        item_info: Dict[str, Any],
        target_price: float,
        strategy: str = "gentle",
    ) -> Dict[str, Any]:
        """
        生成议价话术。

        Args:
            item_info: 商品信息 (title, price, description 等)
            target_price: 目标价格
            strategy: 议价策略 (gentle/aggressive/defect_focused/bulk_buyer)

        Returns:
            包含 scripts 列表的字典
        """
        prompt = self.build_bargain_prompt(item_info, target_price, strategy)
        result = await self._call_ai(prompt)

        if result is None:
            return {"scripts": [], "error": "AI 服务不可用，请检查配置"}

        if "scripts" not in result:
            return {"scripts": [], "error": "AI 返回格式异常"}

        return result
