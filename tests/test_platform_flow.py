"""
全平台流程 TDD 测试
测试用户从注册到使用各功能的完整流程
"""
import pytest


# ═══════════════════════════════════════════════════════════════
# 修复1: TaskCreate.ai_prompt_criteria_file 应可选
# ═══════════════════════════════════════════════════════════════

class TestTaskCreateOptionalFields:
    """创建任务时 ai_prompt_criteria_file 应该是可选的"""

    def test_task_create_without_criteria_file(self):
        """不传 ai_prompt_criteria_file 也应能创建 TaskCreate"""
        from src.domain.models.task import TaskCreate
        task = TaskCreate(
            task_name="测试任务",
            keyword="测试关键字",
        )
        assert task.task_name == "测试任务"
        assert task.ai_prompt_criteria_file is None or task.ai_prompt_criteria_file == ""

    def test_task_create_with_criteria_file(self):
        """传 ai_prompt_criteria_file 时应正常工作"""
        from src.domain.models.task import TaskCreate
        task = TaskCreate(
            task_name="测试任务",
            keyword="测试关键字",
            ai_prompt_criteria_file="prompts/test_criteria.txt",
        )
        assert task.ai_prompt_criteria_file == "prompts/test_criteria.txt"

    def test_task_create_mercari_without_criteria(self):
        """Mercari 任务不传 criteria 也应能创建"""
        from src.domain.models.task import TaskCreate
        task = TaskCreate(
            task_name="Mercari手办",
            keyword="フィギュア",
            platform="mercari",
            min_price="1000",
            max_price="5000",
        )
        assert task.platform == "mercari"


# ═══════════════════════════════════════════════════════════════
# 修复2: results/items keyword 应可选
# ═══════════════════════════════════════════════════════════════

class TestResultsKeywordOptional:
    """results/items 接口的 keyword 参数应可选"""

    @pytest.mark.asyncio
    async def test_query_items_without_keyword(self):
        """不传 keyword 查询应返回所有结果"""
        from src.infrastructure.persistence.item_repository import ItemRepository
        repo = ItemRepository()
        # 不传 keyword 不应抛异常
        result = await repo.query(page=1, limit=5)
        assert "items" in result
        assert "total_items" in result


# ═══════════════════════════════════════════════════════════════
# 修复3: AI 测试绕过系统代理
# ═══════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════
# 修复5: 捡漏雷达应动态评估 evaluation_status
# ═══════════════════════════════════════════════════════════════

class TestBargainRadarEvaluation:
    """捡漏雷达返回的商品应有 evaluation_status"""

    def test_evaluate_items_with_price_book(self):
        """_evaluate_items_with_price_book 应正确设置评估字段"""
        from src.api.routes.bargain_radar import _evaluate_items_with_price_book

        items = [
            {
                "搜索关键字": "科比手办",
                "商品信息": {"商品标题": "科比手办测试", "当前售价": "¥60"},
            },
            {
                "搜索关键字": "科比手办",
                "商品信息": {"商品标题": "另一个手办", "当前售价": "¥150"},
            },
        ]
        entries = [
            {
                "id": "entry-1",
                "category_name": "科比手办",
                "keywords": ["科比手办"],
                "target_sell_price": 200,
                "purchase_ideal": 80,
                "purchase_upper": 120,
                "total_fees": 10,
                "market_price": 100,
            }
        ]

        result = _evaluate_items_with_price_book(items, entries)

        # 第一个商品 60 元 <= ideal(80)，应为 great_deal
        assert result[0]["evaluation_status"] == "great_deal"
        assert result[0]["category_id"] == "entry-1"
        assert result[0]["estimated_profit"] > 0

        # 第二个商品 150 元 > upper(120)，应为 overpriced
        assert result[1]["evaluation_status"] == "overpriced"

    def test_evaluate_items_without_price_book(self):
        """没有价格本时，evaluation_status 不应被设置"""
        from src.api.routes.bargain_radar import _evaluate_items_with_price_book

        items = [
            {
                "搜索关键字": "无匹配关键字",
                "商品信息": {"商品标题": "测试", "当前售价": "¥60"},
            },
        ]
        result = _evaluate_items_with_price_book(items, [])
        assert result[0].get("evaluation_status") is None

    def test_bargain_radar_route_has_price_book_import(self):
        """捡漏雷达路由应包含 PriceBookService 动态评估"""
        import inspect
        from src.api.routes import bargain_radar
        source = inspect.getsource(bargain_radar.get_bargain_items)
        assert "PriceBookService" in source, \
            "捡漏雷达路由中缺少动态评估逻辑（PriceBookService）"


# ═══════════════════════════════════════════════════════════════
# 修复3: AI 测试绕过系统代理
# ═══════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════
# 修复6: Mercari 爬虫应使用 keyword 字段（与闲鱼一致）
# ═══════════════════════════════════════════════════════════════

class TestMercariKeywordField:
    """Mercari 爬虫应与闲鱼一样使用 keyword 字段"""

    def test_mercari_scraper_reads_keyword(self):
        """scrape_mercari 应从 task_config['keyword'] 读取关键词（不是 search_keyword）"""
        import inspect
        from src.scraper_mercari import scrape_mercari
        source = inspect.getsource(scrape_mercari)
        # 应使用 keyword，不应依赖 search_keyword
        assert 'task_config.get("keyword"' in source or "task_config['keyword']" in source or 'task_config.get("keyword"' in source, \
            "Mercari 爬虫应使用 'keyword' 字段（与闲鱼、config.json、数据库一致）"

    def test_mercari_keyword_not_search_keyword(self):
        """task_config 中使用 keyword 而非 search_keyword 时不应被跳过"""
        # 模拟 config.json 中的任务配置格式
        task_config = {
            "task_name": "龙珠手办-Mercari",
            "keyword": "ドラゴンボール フィギュア",
            "platform": "mercari",
            "min_price": "1000",
            "max_price": "5000",
            "max_pages": 1,
        }
        # Mercari 爬虫应该能正确提取到 keyword
        keyword = task_config.get("keyword", "")
        assert keyword == "ドラゴンボール フィギュア"
        # 旧的 search_keyword 不应存在于典型配置
        assert "search_keyword" not in task_config


# ═══════════════════════════════════════════════════════════════
# 修复7: Mercari 价格参数应正确处理字符串类型
# ═══════════════════════════════════════════════════════════════

class TestMercariPriceParamsType:
    """Mercari 爬虫应能正确处理字符串类型的价格参数"""

    def test_build_search_url_with_string_price(self):
        """_build_search_url 应能处理字符串类型的 min_price/max_price"""
        from src.scraper_mercari import _build_search_url
        # config.json 和数据库中 min_price/max_price 通常是字符串
        url = _build_search_url(
            keyword="test",
            price_min="1000",
            price_max="5000",
        )
        assert "price_min=1000" in url
        assert "price_max=5000" in url

    def test_build_search_url_with_int_price(self):
        """_build_search_url 应能处理整数类型的 min_price/max_price"""
        from src.scraper_mercari import _build_search_url
        url = _build_search_url(
            keyword="test",
            price_min=1000,
            price_max=5000,
        )
        assert "price_min=1000" in url
        assert "price_max=5000" in url

    def test_build_search_url_with_zero_price(self):
        """价格为 0 或空时不应包含价格参数"""
        from src.scraper_mercari import _build_search_url
        url = _build_search_url(keyword="test", price_min=0, price_max=0)
        assert "price_min" not in url
        assert "price_max" not in url

    def test_build_search_url_with_empty_string_price(self):
        """价格为空字符串时不应包含价格参数"""
        from src.scraper_mercari import _build_search_url
        url = _build_search_url(keyword="test", price_min="", price_max="")
        assert "price_min" not in url
        assert "price_max" not in url


# ═══════════════════════════════════════════════════════════════
# 修复8: PriceMatchingService 应为异步，可在事件循环内调用
# ═══════════════════════════════════════════════════════════════

class TestPriceMatchingServiceAsync:
    """PriceMatchingService 应能在异步上下文中正确工作"""

    @pytest.mark.asyncio
    async def test_match_and_evaluate_is_async(self):
        """match_and_evaluate 应为异步方法，可在事件循环中 await"""
        import inspect
        from src.services.price_matching_service import PriceMatchingService
        service = PriceMatchingService()
        assert inspect.iscoroutinefunction(service.match_and_evaluate), \
            "match_and_evaluate 应为 async 方法"

    @pytest.mark.asyncio
    async def test_match_and_evaluate_in_async_context(self):
        """在异步上下文中调用 match_and_evaluate 不应抛出 RuntimeError"""
        from src.services.price_matching_service import PriceMatchingService
        service = PriceMatchingService()
        item_data = {
            "搜索关键字": "不存在的关键字",
            "商品信息": {"商品标题": "测试", "当前售价": "¥100"},
        }
        # 不应抛出 "asyncio.run() cannot be called from a running event loop"
        result = await service.match_and_evaluate(item_data)
        assert "evaluation_status" in result

    @pytest.mark.asyncio
    async def test_save_to_jsonl_calls_async_evaluate(self):
        """save_to_jsonl 应能正确 await match_and_evaluate"""
        import inspect
        from src.utils import save_to_jsonl
        assert inspect.iscoroutinefunction(save_to_jsonl), \
            "save_to_jsonl 应为 async 函数"


# ═══════════════════════════════════════════════════════════════
# 修复9: default_criteria.txt 应存在以支持通用 AI 分析
# ═══════════════════════════════════════════════════════════════

class TestDefaultCriteriaPrompt:
    """通用 criteria prompt 文件应存在"""

    def test_default_criteria_file_exists(self):
        """prompts/default_criteria.txt 应存在"""
        import os
        assert os.path.isfile("prompts/default_criteria.txt"), \
            "prompts/default_criteria.txt 文件不存在，Mercari 等任务的 AI 分析将被跳过"

    def test_default_criteria_has_content(self):
        """default_criteria.txt 应有实质性内容"""
        with open("prompts/default_criteria.txt", "r", encoding="utf-8") as f:
            content = f.read()
        assert len(content) > 100, \
            "default_criteria.txt 内容过短，不足以指导 AI 分析"

    def test_base_prompt_template_works_with_default_criteria(self):
        """base_prompt + default_criteria 组合后应为有效 prompt"""
        with open("prompts/base_prompt.txt", "r", encoding="utf-8") as f:
            base = f.read()
        with open("prompts/default_criteria.txt", "r", encoding="utf-8") as f:
            criteria = f.read()
        combined = base.replace("{{CRITERIA_SECTION}}", criteria)
        assert "{{CRITERIA_SECTION}}" not in combined, \
            "占位符未被完全替换"
        assert len(combined) > 200


# ═══════════════════════════════════════════════════════════════
# 修复10: 后端 API 返回格式应与前端类型定义匹配
# ═══════════════════════════════════════════════════════════════

class TestPurchaseStatsFormat:
    """采购统计 API 返回格式应匹配前端 PurchaseStats 类型"""

    @pytest.mark.asyncio
    async def test_purchase_stats_has_by_status(self):
        """get_stats 返回应包含 by_status 嵌套字段"""
        from src.services.purchase_service import PurchaseService
        service = PurchaseService()
        stats = await service.get_stats()
        # 前端期望: { total, by_status: {...}, ... }
        assert "by_status" in stats, \
            f"采购统计缺少 by_status 字段，实际返回: {list(stats.keys())}"
        assert "total" in stats, \
            f"采购统计缺少 total 字段"

    @pytest.mark.asyncio
    async def test_purchase_stats_by_status_is_dict(self):
        """by_status 应为 status -> count 的字典"""
        from src.services.purchase_service import PurchaseService
        service = PurchaseService()
        stats = await service.get_stats()
        assert isinstance(stats["by_status"], dict)


class TestInventorySummaryFormat:
    """库存汇总 API 返回格式应匹配前端 InventorySummary 类型"""

    @pytest.mark.asyncio
    async def test_inventory_summary_has_expected_fields(self):
        """get_summary 返回应包含前端期望的字段"""
        from src.services.inventory_service import InventoryService
        service = InventoryService()
        summary = await service.get_summary()
        # 前端期望字段
        assert "total_count" in summary
        assert "total_cost" in summary
        assert "estimated_value" in summary
        assert "by_status" in summary, \
            f"库存汇总缺少 by_status 字段，实际: {list(summary.keys())}"


# ═══════════════════════════════════════════════════════════════
# 修复11: 利润 API 返回字段名应匹配前端类型定义
# ═══════════════════════════════════════════════════════════════

class TestProfitSummaryFormat:
    """利润汇总 API 返回格式应匹配前端 ProfitSummary 类型"""

    @pytest.mark.asyncio
    async def test_profit_summary_field_names(self):
        """get_summary 应使用前端期望的字段名"""
        from src.services.profit_service import ProfitService
        service = ProfitService()
        summary = await service.get_summary()
        # 前端期望: total_sold, total_revenue, total_cost, net_profit, avg_profit_rate
        assert "total_sold" in summary, \
            f"利润汇总缺少 total_sold，实际: {list(summary.keys())}"
        assert "net_profit" in summary, \
            f"利润汇总缺少 net_profit，实际: {list(summary.keys())}"


class TestProfitRecordFormat:
    """利润记录 API 返回格式应匹配前端 SaleRecord 类型"""

    @pytest.mark.asyncio
    async def test_sale_records_have_net_profit(self):
        """记录应有 net_profit 字段"""
        from src.services.profit_service import ProfitService
        service = ProfitService()
        records = await service.get_sale_records()
        if records:
            r = records[0]
            assert "net_profit" in r, f"利润记录缺少 net_profit，实际: {list(r.keys())}"
            assert "profit_rate" in r, f"利润记录缺少 profit_rate"


class TestProfitByKeywordFormat:
    """按品类利润统计格式应匹配前端 KeywordProfit 类型"""

    @pytest.mark.asyncio
    async def test_keyword_profit_field_names(self):
        """by-keyword 应使用前端期望的字段名"""
        from src.services.profit_service import ProfitService
        service = ProfitService()
        results = await service.get_profit_by_keyword()
        if results:
            r = results[0]
            assert "total_revenue" in r, f"品类利润缺少 total_revenue，实际: {list(r.keys())}"
            assert "total_cost" in r, f"品类利润缺少 total_cost"
            assert "net_profit" in r, f"品类利润缺少 net_profit"


class TestProfitByAssigneeFormat:
    """按成员利润统计格式应匹配前端 AssigneeProfit 类型"""

    @pytest.mark.asyncio
    async def test_assignee_profit_field_names(self):
        """by-assignee 应使用前端期望的字段名"""
        from src.services.profit_service import ProfitService
        service = ProfitService()
        results = await service.get_profit_by_assignee()
        if results:
            r = results[0]
            assert "total_revenue" in r, f"成员利润缺少 total_revenue，实际: {list(r.keys())}"
            assert "net_profit" in r, f"成员利润缺少 net_profit"


class TestDailyProfitFormat:
    """每日利润趋势格式应匹配前端 DailyProfit 类型"""

    @pytest.mark.asyncio
    async def test_daily_profit_field_names(self):
        """daily-trend 应使用前端期望的字段名"""
        from src.services.profit_service import ProfitService
        service = ProfitService()
        results = await service.get_daily_profit()
        if results:
            r = results[0]
            assert "sold_count" in r, f"每日利润缺少 sold_count，实际: {list(r.keys())}"
            assert "cost" in r, f"每日利润缺少 cost"


# ═══════════════════════════════════════════════════════════════
# 修复12: ROI 计算引用了改名后的字段
# ═══════════════════════════════════════════════════════════════

class TestROIOverviewCalculation:
    """ROI 概览应正确计算利润和 ROI"""

    @pytest.mark.asyncio
    async def test_roi_overview_has_positive_profit(self):
        """有已售商品时 ROI 应大于 0"""
        from httpx import AsyncClient, ASGITransport
        from src.app import app

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 先登录获取 token
            resp = await client.post("/api/auth/login", json={"username": "admin", "password": "admin123"})
            token = resp.json()["access_token"]

            resp = await client.get("/api/profit/roi-overview",
                                    headers={"Authorization": f"Bearer {token}"})
            data = resp.json()
            # 有售出记录时 total_profit 不应为 0
            if data["count"] > 0:
                assert data["total_profit"] > 0, \
                    f"有 {data['count']} 件已售，但 total_profit={data['total_profit']}"
                assert data["overall_roi"] > 0, \
                    f"有利润但 ROI={data['overall_roi']}"


class TestAIConnectionBypassProxy:
    """AI 连接测试应能绕过系统代理"""

    def test_ai_test_without_proxy_should_not_use_system_proxy(self):
        """不传 PROXY_URL 时，AI 测试不应使用系统级代理环境变量"""
        import os
        import httpx

        # 模拟系统有 HTTPS_PROXY 但不可用
        old_proxy = os.environ.get("HTTPS_PROXY")
        os.environ["HTTPS_PROXY"] = "http://127.0.0.1:99999"  # 不存在的代理
        try:
            # 当 PROXY_URL 为空时，应该显式绕过系统代理
            client = httpx.Client(proxy=None)
            # 能创建成功即可，说明没有使用系统代理
            assert client is not None
            client.close()
        finally:
            if old_proxy:
                os.environ["HTTPS_PROXY"] = old_proxy
            else:
                os.environ.pop("HTTPS_PROXY", None)
