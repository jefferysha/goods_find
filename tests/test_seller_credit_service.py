"""
TDD: 卖家信用评分体系测试
先写测试 → 看它失败 → 写最少代码让它通过
"""
import pytest
from unittest.mock import AsyncMock, patch


class TestSellerCreditCalculation:
    """卖家信用评分纯计算逻辑测试"""

    def setup_method(self):
        from src.services.seller_credit_service import SellerCreditService
        self.service = SellerCreditService()

    def test_calculate_score_basic(self):
        """基本评分计算：综合多个因子"""
        score = self.service.calculate_credit_score(
            credit_level=4,        # 闲鱼信用等级（1-5）
            total_sold=50,         # 历史成交量
            positive_rate=0.95,    # 好评率
            account_age_days=365,  # 账号年龄
            avg_response_time_hours=2.0,  # 平均回复速度（小时）
        )
        assert 0 <= score <= 100
        assert score > 60  # 这些参数应是中等偏上

    def test_new_seller_low_score(self):
        """新卖家（无交易、新账号）评分应较低"""
        score = self.service.calculate_credit_score(
            credit_level=1,
            total_sold=0,
            positive_rate=0.0,
            account_age_days=7,
            avg_response_time_hours=24.0,
        )
        assert score < 40

    def test_excellent_seller_high_score(self):
        """优质卖家评分应高"""
        score = self.service.calculate_credit_score(
            credit_level=5,
            total_sold=500,
            positive_rate=0.99,
            account_age_days=1000,
            avg_response_time_hours=0.5,
        )
        assert score > 80

    def test_classify_seller_reliable(self):
        """高分卖家分类为 reliable"""
        level = self.service.classify_seller(85)
        assert level == "reliable"

    def test_classify_seller_normal(self):
        """中等评分分类为 normal"""
        level = self.service.classify_seller(55)
        assert level == "normal"

    def test_classify_seller_risky(self):
        """低分卖家分类为 risky"""
        level = self.service.classify_seller(25)
        assert level == "risky"


class TestSellerBlacklist:
    """黑白名单逻辑测试"""

    def setup_method(self):
        from src.services.seller_credit_service import SellerCreditService
        self.service = SellerCreditService()

    @pytest.mark.anyio
    async def test_add_to_blacklist(self):
        """添加到黑名单"""
        with patch.object(self.service, "_save_list_entry", new_callable=AsyncMock) as mock_save:
            mock_save.return_value = True
            result = await self.service.add_to_blacklist(
                seller_id="seller_123",
                seller_name="骗子卖家",
                reason="发假货",
            )
            assert result is True
            mock_save.assert_called_once()

    @pytest.mark.anyio
    async def test_add_to_whitelist(self):
        """添加到白名单"""
        with patch.object(self.service, "_save_list_entry", new_callable=AsyncMock) as mock_save:
            mock_save.return_value = True
            result = await self.service.add_to_whitelist(
                seller_id="seller_456",
                seller_name="靠谱卖家",
                reason="多次交易体验好",
            )
            assert result is True

    @pytest.mark.anyio
    async def test_check_blacklisted(self):
        """检查黑名单"""
        with patch.object(self.service, "_get_list_entry", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"seller_id": "seller_123", "list_type": "blacklist"}
            status = await self.service.check_seller_status("seller_123")
            assert status["is_blacklisted"] is True
            assert status["is_whitelisted"] is False

    @pytest.mark.anyio
    async def test_check_whitelisted(self):
        """检查白名单"""
        with patch.object(self.service, "_get_list_entry", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = {"seller_id": "seller_456", "list_type": "whitelist"}
            status = await self.service.check_seller_status("seller_456")
            assert status["is_blacklisted"] is False
            assert status["is_whitelisted"] is True

    @pytest.mark.anyio
    async def test_check_unknown_seller(self):
        """未标记的卖家"""
        with patch.object(self.service, "_get_list_entry", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = None
            status = await self.service.check_seller_status("seller_789")
            assert status["is_blacklisted"] is False
            assert status["is_whitelisted"] is False


class TestSellerCreditAPI:
    """卖家信用评分 API 路由测试"""

    @pytest.mark.anyio
    async def test_get_seller_credit(self):
        """GET /api/seller-credit/{seller_id} 应返回信用信息"""
        from httpx import AsyncClient, ASGITransport
        from fastapi import FastAPI
        import src.api.routes.seller_credit as sc_module

        app = FastAPI()
        app.include_router(sc_module.router)

        with patch.object(sc_module, "seller_credit_service") as mock_svc:
            mock_svc.check_seller_status = AsyncMock(return_value={
                "is_blacklisted": False, "is_whitelisted": True,
            })
            mock_svc.get_seller_profile = AsyncMock(return_value={
                "seller_id": "seller_123",
                "seller_name": "好卖家",
                "credit_score": 85,
                "credit_level": "reliable",
            })

            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                resp = await client.get("/api/seller-credit/seller_123")

            assert resp.status_code == 200
            data = resp.json()
            assert "credit_score" in data

    @pytest.mark.anyio
    async def test_add_blacklist_endpoint(self):
        """POST /api/seller-credit/blacklist 应成功"""
        from httpx import AsyncClient, ASGITransport
        from fastapi import FastAPI
        import src.api.routes.seller_credit as sc_module

        app = FastAPI()
        app.include_router(sc_module.router)

        with patch.object(sc_module, "seller_credit_service") as mock_svc:
            mock_svc.add_to_blacklist = AsyncMock(return_value=True)

            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as client:
                resp = await client.post("/api/seller-credit/blacklist", json={
                    "seller_id": "s123",
                    "seller_name": "坏人",
                    "reason": "假货",
                })

            assert resp.status_code == 200
