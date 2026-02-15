"""跨平台比价分析功能测试 (TDD)"""
import pytest
from typing import List, Dict

# ═══════════════════════════════════════════════════════════════
# 数据层测试: 新表结构
# ═══════════════════════════════════════════════════════════════


class TestCrossPlatformSchema:
    """数据库应包含跨平台比价所需的表"""

    @pytest.mark.asyncio
    async def test_cross_platform_config_table_exists(self):
        """cross_platform_config 表应存在"""
        from src.infrastructure.persistence.sqlite_manager import get_db, init_db
        await init_db()
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='cross_platform_config'"
            )
            row = await cursor.fetchone()
            assert row is not None, "cross_platform_config 表不存在"
        finally:
            await db.close()

    @pytest.mark.asyncio
    async def test_keyword_category_map_table_exists(self):
        """keyword_category_map 表应存在"""
        from src.infrastructure.persistence.sqlite_manager import get_db, init_db
        await init_db()
        db = await get_db()
        try:
            cursor = await db.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='keyword_category_map'"
            )
            row = await cursor.fetchone()
            assert row is not None, "keyword_category_map 表不存在"
        finally:
            await db.close()

    @pytest.mark.asyncio
    async def test_cross_platform_config_crud(self):
        """cross_platform_config 表应支持基本 CRUD"""
        from src.infrastructure.persistence.sqlite_manager import get_db, init_db
        await init_db()
        db = await get_db()
        try:
            await db.execute(
                "INSERT OR REPLACE INTO cross_platform_config (key, value) VALUES (?, ?)",
                ("exchange_rate_JPY_to_CNY", "0.048"),
            )
            await db.commit()
            cursor = await db.execute(
                "SELECT value FROM cross_platform_config WHERE key = ?",
                ("exchange_rate_JPY_to_CNY",),
            )
            row = await cursor.fetchone()
            assert row is not None
            assert dict(row)["value"] == "0.048"
        finally:
            await db.execute("DELETE FROM cross_platform_config WHERE key = ?", ("exchange_rate_JPY_to_CNY",))
            await db.commit()
            await db.close()

    @pytest.mark.asyncio
    async def test_keyword_category_map_unique_constraint(self):
        """keyword_category_map 应有 (keyword, platform) 唯一约束"""
        from src.infrastructure.persistence.sqlite_manager import get_db, init_db
        await init_db()
        db = await get_db()
        try:
            await db.execute(
                "INSERT OR REPLACE INTO keyword_category_map (keyword, platform, category_id) VALUES (?, ?, ?)",
                ("test_kw", "xianyu", "cat_001"),
            )
            await db.commit()
            await db.execute(
                "INSERT OR REPLACE INTO keyword_category_map (keyword, platform, category_id) VALUES (?, ?, ?)",
                ("test_kw", "xianyu", "cat_002"),
            )
            await db.commit()
            cursor = await db.execute(
                "SELECT COUNT(*) as cnt FROM keyword_category_map WHERE keyword = ? AND platform = ?",
                ("test_kw", "xianyu"),
            )
            row = await cursor.fetchone()
            assert dict(row)["cnt"] == 1, "唯一约束未生效，出现重复记录"
        finally:
            await db.execute("DELETE FROM keyword_category_map WHERE keyword = ?", ("test_kw",))
            await db.commit()
            await db.close()


# ═══════════════════════════════════════════════════════════════
# 服务层测试: 汇率管理 + 货币换算
# ═══════════════════════════════════════════════════════════════


class TestExchangeRateManagement:
    """汇率管理功能"""

    @pytest.mark.asyncio
    async def test_get_exchange_rates_returns_dict(self):
        """get_exchange_rates 应返回字典"""
        from src.services.cross_platform_service import CrossPlatformService
        service = CrossPlatformService()
        rates = await service.get_exchange_rates()
        assert isinstance(rates, dict)

    @pytest.mark.asyncio
    async def test_set_and_get_exchange_rate(self):
        """设置汇率后应能读取"""
        from src.services.cross_platform_service import CrossPlatformService
        service = CrossPlatformService()
        await service.set_exchange_rate("JPY", "CNY", 0.048)
        rates = await service.get_exchange_rates()
        assert "JPY_to_CNY" in rates
        assert rates["JPY_to_CNY"] == 0.048

    @pytest.mark.asyncio
    async def test_convert_price_jpy_to_cny(self):
        """日元转人民币应正确换算"""
        from src.services.cross_platform_service import CrossPlatformService
        service = CrossPlatformService()
        await service.set_exchange_rate("JPY", "CNY", 0.048)
        result = await service.convert_price(1000, "JPY")
        assert result == 48.0  # 1000 * 0.048

    @pytest.mark.asyncio
    async def test_convert_price_cny_stays_same(self):
        """人民币不需要换算"""
        from src.services.cross_platform_service import CrossPlatformService
        service = CrossPlatformService()
        result = await service.convert_price(100, "CNY")
        assert result == 100.0

    @pytest.mark.asyncio
    async def test_platform_currency_mapping(self):
        """平台应正确映射到货币"""
        from src.services.cross_platform_service import PLATFORM_CURRENCY
        assert PLATFORM_CURRENCY["xianyu"] == "CNY"
        assert PLATFORM_CURRENCY["mercari"] == "JPY"


# ═══════════════════════════════════════════════════════════════
# 服务层测试: 关键词-品类映射
# ═══════════════════════════════════════════════════════════════


class TestKeywordMapping:
    """关键词→品类映射管理"""

    @pytest.mark.asyncio
    async def test_set_and_get_mapping(self):
        """设置映射后应能查到"""
        from src.services.cross_platform_service import CrossPlatformService
        service = CrossPlatformService()
        await service.set_keyword_mapping("テスト", "mercari", "cat_test")
        mappings = await service.get_keyword_mappings()
        found = [m for m in mappings if m["keyword"] == "テスト"]
        assert len(found) == 1
        assert found[0]["category_id"] == "cat_test"
        # 清理
        await service.delete_keyword_mapping(found[0]["id"])

    @pytest.mark.asyncio
    async def test_delete_mapping(self):
        """删除映射后不应存在"""
        from src.services.cross_platform_service import CrossPlatformService
        service = CrossPlatformService()
        await service.set_keyword_mapping("テスト_del", "mercari", "cat_del")
        mappings = await service.get_keyword_mappings()
        found = [m for m in mappings if m["keyword"] == "テスト_del"]
        assert len(found) == 1
        await service.delete_keyword_mapping(found[0]["id"])
        mappings = await service.get_keyword_mappings()
        found = [m for m in mappings if m["keyword"] == "テスト_del"]
        assert len(found) == 0


# ═══════════════════════════════════════════════════════════════
# 服务层测试: 套利等级计算
# ═══════════════════════════════════════════════════════════════


class TestArbitrageClassification:
    """套利等级判定"""

    def test_high_arbitrage(self):
        """差价>=30% 应为 high"""
        from src.services.cross_platform_service import classify_arbitrage
        assert classify_arbitrage(35.0) == "high"

    def test_medium_arbitrage(self):
        """差价 15-30% 应为 medium"""
        from src.services.cross_platform_service import classify_arbitrage
        assert classify_arbitrage(20.0) == "medium"

    def test_low_arbitrage(self):
        """差价 5-15% 应为 low"""
        from src.services.cross_platform_service import classify_arbitrage
        assert classify_arbitrage(10.0) == "low"

    def test_no_arbitrage(self):
        """差价 <5% 应为 none"""
        from src.services.cross_platform_service import classify_arbitrage
        assert classify_arbitrage(3.0) == "none"

    def test_zero_gap(self):
        """差价 0% 应为 none"""
        from src.services.cross_platform_service import classify_arbitrage
        assert classify_arbitrage(0.0) == "none"

    def test_boundary_30(self):
        """差价 30% 边界应为 high"""
        from src.services.cross_platform_service import classify_arbitrage
        assert classify_arbitrage(30.0) == "high"


# ═══════════════════════════════════════════════════════════════
# 服务层测试: 品类聚合对比
# ═══════════════════════════════════════════════════════════════


class TestCategoryComparison:
    """品类聚合对比"""

    @pytest.mark.asyncio
    async def test_get_comparable_categories_returns_list(self):
        """get_comparable_categories 应返回列表"""
        from src.services.cross_platform_service import CrossPlatformService
        service = CrossPlatformService()
        result = await service.get_comparable_categories()
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_category_has_required_fields(self):
        """品类对比结果应包含必要字段"""
        from src.services.cross_platform_service import CrossPlatformService
        service = CrossPlatformService()
        categories = await service.get_comparable_categories()
        if categories:
            cat = categories[0]
            assert "category_id" in cat
            assert "category_name" in cat
            assert "platforms" in cat
            assert "price_gap_pct" in cat
            assert "arbitrage_opportunity" in cat
            assert "cheapest_platform" in cat


# ═══════════════════════════════════════════════════════════════
# 服务层测试: 混排商品列表
# ═══════════════════════════════════════════════════════════════


class TestCrossPlatformItems:
    """跨平台混排商品列表"""

    @pytest.mark.asyncio
    async def test_get_items_returns_list(self):
        """get_cross_platform_items 应返回列表"""
        from src.services.cross_platform_service import CrossPlatformService
        service = CrossPlatformService()
        result = await service.get_cross_platform_items()
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_items_have_converted_price(self):
        """每个商品应有 converted_price 字段"""
        from src.services.cross_platform_service import CrossPlatformService
        service = CrossPlatformService()
        items = await service.get_cross_platform_items()
        for item in items[:5]:
            assert "converted_price" in item, f"商品缺少 converted_price 字段"
            assert "platform" in item
            assert "currency" in item

    @pytest.mark.asyncio
    async def test_items_sorted_by_converted_price(self):
        """默认按换算价升序排序"""
        from src.services.cross_platform_service import CrossPlatformService
        service = CrossPlatformService()
        items = await service.get_cross_platform_items(sort_by="converted_price")
        prices = [i["converted_price"] for i in items if i["converted_price"] is not None]
        if len(prices) > 1:
            assert prices == sorted(prices), "商品未按换算价升序排序"


# ═══════════════════════════════════════════════════════════════
# API 层测试: 端点可用性
# ═══════════════════════════════════════════════════════════════


class TestCrossPlatformAPI:
    """跨平台比价 API 端点"""

    @pytest.mark.asyncio
    async def test_categories_endpoint(self):
        """GET /api/cross-platform/categories 应返回 200"""
        from httpx import AsyncClient, ASGITransport
        from src.app import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
            token = resp.json()["access_token"]
            resp = await client.get("/api/cross-platform/categories",
                                    headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200
            assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_items_endpoint(self):
        """GET /api/cross-platform/items 应返回 200"""
        from httpx import AsyncClient, ASGITransport
        from src.app import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
            token = resp.json()["access_token"]
            resp = await client.get("/api/cross-platform/items",
                                    headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200
            assert isinstance(resp.json(), list)

    @pytest.mark.asyncio
    async def test_exchange_rates_endpoint(self):
        """GET /api/cross-platform/exchange-rates 应返回 200"""
        from httpx import AsyncClient, ASGITransport
        from src.app import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
            token = resp.json()["access_token"]
            resp = await client.get("/api/cross-platform/exchange-rates",
                                    headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200
            assert isinstance(resp.json(), dict)

    @pytest.mark.asyncio
    async def test_keyword_mappings_endpoint(self):
        """GET /api/cross-platform/keyword-mappings 应返回 200"""
        from httpx import AsyncClient, ASGITransport
        from src.app import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
            token = resp.json()["access_token"]
            resp = await client.get("/api/cross-platform/keyword-mappings",
                                    headers={"Authorization": f"Bearer {token}"})
            assert resp.status_code == 200
            assert isinstance(resp.json(), list)
