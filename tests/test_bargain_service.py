"""
TDD: AI 议价话术生成服务测试
先写测试 → 看它失败 → 写最少代码让它通过
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock


class TestBargainService:
    """议价话术服务测试"""

    def setup_method(self):
        from src.services.bargain_service import BargainService
        self.service = BargainService()

    def test_build_prompt_contains_item_info(self):
        """构建的 prompt 应包含商品信息"""
        item_info = {
            "title": "MacBook Air M1 95新",
            "price": 3500,
            "description": "MacBook Air M1, 8G+256G, 充放电50次, 无磕碰",
        }
        prompt = self.service.build_bargain_prompt(
            item_info=item_info,
            target_price=3000,
            strategy="gentle",
        )
        assert "MacBook Air M1" in prompt
        assert "3500" in prompt
        assert "3000" in prompt

    def test_build_prompt_strategies(self):
        """不同策略应生成不同的 prompt"""
        item_info = {"title": "iPhone 15", "price": 5000}

        gentle = self.service.build_bargain_prompt(item_info, 4500, "gentle")
        aggressive = self.service.build_bargain_prompt(item_info, 4500, "aggressive")
        defect_focused = self.service.build_bargain_prompt(item_info, 4500, "defect_focused")

        # 三种策略生成的 prompt 应不同
        assert gentle != aggressive
        assert aggressive != defect_focused

    def test_build_prompt_default_strategy(self):
        """不指定策略时使用 gentle"""
        item_info = {"title": "Test", "price": 1000}
        prompt = self.service.build_bargain_prompt(item_info, 800)
        assert prompt  # 非空

    def test_available_strategies(self):
        """应提供多种议价策略"""
        strategies = self.service.get_available_strategies()
        assert isinstance(strategies, list)
        assert len(strategies) >= 3
        strategy_ids = [s["id"] for s in strategies]
        assert "gentle" in strategy_ids
        assert "aggressive" in strategy_ids
        assert "defect_focused" in strategy_ids

    def test_strategy_has_required_fields(self):
        """每个策略应包含 id, name, description"""
        strategies = self.service.get_available_strategies()
        for s in strategies:
            assert "id" in s
            assert "name" in s
            assert "description" in s

    @pytest.mark.anyio
    async def test_generate_bargain_scripts(self):
        """生成议价话术应返回多条话术"""
        mock_ai_response = {
            "scripts": [
                {
                    "opening": "您好，我很喜欢这台MacBook，想了解一下能否优惠到3000？",
                    "reasoning": "这个价位的M1机型普遍在3000-3200之间",
                    "follow_up": "如果可以的话我现在就下单",
                },
                {
                    "opening": "老板你好，我看了好几台同款，这台能少点不？",
                    "reasoning": "同款行情价3000左右，您这台稍贵了一些",
                    "follow_up": "诚意要的，价格合适马上付款",
                },
            ]
        }

        with patch.object(self.service, "_call_ai", new_callable=AsyncMock) as mock_call:
            mock_call.return_value = mock_ai_response
            result = await self.service.generate_bargain_scripts(
                item_info={"title": "MacBook Air M1", "price": 3500},
                target_price=3000,
                strategy="gentle",
            )

        assert "scripts" in result
        assert len(result["scripts"]) == 2
        assert "opening" in result["scripts"][0]
        assert "reasoning" in result["scripts"][0]

    @pytest.mark.anyio
    async def test_generate_bargain_scripts_ai_unavailable(self):
        """AI 不可用时应返回错误信息"""
        with patch.object(self.service, "_call_ai", new_callable=AsyncMock) as mock_call:
            mock_call.return_value = None
            result = await self.service.generate_bargain_scripts(
                item_info={"title": "Test", "price": 1000},
                target_price=800,
            )

        assert result.get("error") is not None or result.get("scripts") == []
