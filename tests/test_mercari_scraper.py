"""TDD: Mercari 爬虫模块测试
分两部分：
1. 纯函数测试（数据解析、URL 构建）—— 无需网络
2. 集成爬取测试 —— 需要 Playwright + 网络，验证能否真正从 Mercari 拿到数据
"""
import pytest
from src.scraper_mercari import (
    _jpy_to_display,
    _parse_mercari_item,
    _build_search_url,
    _normalize_photos,
)


# ═══════════════════════════════════════════════════════════════
# 第一部分：纯函数测试
# ═══════════════════════════════════════════════════════════════


# ─── _jpy_to_display ─────────────────────────────────────────

class TestJpyToDisplay:
    def test_integer_price(self):
        assert _jpy_to_display(3500) == "¥3,500"

    def test_string_price(self):
        assert _jpy_to_display("12000") == "¥12,000"

    def test_zero_price(self):
        assert _jpy_to_display(0) == "¥0"

    def test_none_price(self):
        assert _jpy_to_display(None) == "暂无"

    def test_empty_string(self):
        assert _jpy_to_display("") == "暂无"

    def test_invalid_string(self):
        result = _jpy_to_display("abc")
        assert result == "abc"  # 无法转换时原样返回


# ─── _build_search_url ──────────────────────────────────────

class TestBuildSearchUrl:
    def test_basic_url(self):
        url = _build_search_url(keyword="フィギュア")
        assert "https://jp.mercari.com/search?" in url
        assert "keyword=" in url
        assert "sort=sort_score" in url
        assert "status=on_sale" in url

    def test_with_price_range(self):
        url = _build_search_url(keyword="test", price_min=1000, price_max=5000)
        assert "price_min=1000" in url
        assert "price_max=5000" in url

    def test_without_price_range(self):
        url = _build_search_url(keyword="test")
        assert "price_min" not in url
        assert "price_max" not in url

    def test_with_page_token(self):
        url = _build_search_url(keyword="test", page_token="abc123")
        assert "page_token=abc123" in url


# ─── _normalize_photos ───────────────────────────────────────

class TestNormalizePhotos:
    def test_string_list(self):
        """老格式：字符串列表"""
        result = _normalize_photos(["https://img1.jpg", "https://img2.jpg"])
        assert result == ["https://img1.jpg", "https://img2.jpg"]

    def test_dict_list_with_uri(self):
        """新格式：字典列表 [{"uri": "..."}]"""
        result = _normalize_photos([{"uri": "https://img1.jpg"}, {"uri": "https://img2.jpg"}])
        assert result == ["https://img1.jpg", "https://img2.jpg"]

    def test_dict_list_with_url(self):
        """兼容 url 字段"""
        result = _normalize_photos([{"url": "https://img1.jpg"}])
        assert result == ["https://img1.jpg"]

    def test_empty_list(self):
        result = _normalize_photos([])
        assert result == []

    def test_mixed_format(self):
        """混合格式"""
        result = _normalize_photos(["https://str.jpg", {"uri": "https://dict.jpg"}])
        assert result == ["https://str.jpg", "https://dict.jpg"]

    def test_skips_empty_dict(self):
        result = _normalize_photos([{"uri": ""}, {"other": "val"}])
        assert result == []


# ─── _parse_mercari_item ────────────────────────────────────

class TestParseMercariItem:
    """测试 Mercari API 响应数据 → 统一格式的转换"""

    SAMPLE_RAW = {
        "id": "m12345678",
        "name": "コービー フィギュア NBA",
        "price": 3500,
        "status": "ITEM_STATUS_ON_SALE",
        "item_condition": {"id": "ITEM_CONDITION_ID_2"},
        "thumbnails": ["https://static.mercdn.net/item/detail/thumb1.jpg"],
        "photos": [
            "https://static.mercdn.net/item/detail/photo1.jpg",
            "https://static.mercdn.net/item/detail/photo2.jpg",
        ],
        "seller": {
            "id": "seller_001",
            "name": "テスト出品者",
            "photo_thumbnail_url": "https://static.mercdn.net/seller.jpg",
            "ratings": {"good": 95, "normal": 3, "bad": 2},
        },
        "num_likes": 12,
        "num_comments": 3,
        "created": 1700000000,
        "shipping_method": {"is_seller_payment": True},
        "shipping_from_area": {"name": "東京都"},
    }

    def test_returns_correct_structure(self):
        result = _parse_mercari_item(self.SAMPLE_RAW, "コービー", "科比手办")
        assert result is not None
        assert "商品信息" in result
        assert "卖家信息" in result
        assert "ai_analysis" in result
        assert result["platform"] == "mercari"
        assert result["搜索关键字"] == "コービー"
        assert result["任务名称"] == "科比手办"

    def test_item_id_extracted(self):
        result = _parse_mercari_item(self.SAMPLE_RAW, "test", "task")
        assert result["商品信息"]["商品ID"] == "m12345678"

    def test_title_extracted(self):
        result = _parse_mercari_item(self.SAMPLE_RAW, "test", "task")
        assert result["商品信息"]["商品标题"] == "コービー フィギュア NBA"

    def test_price_formatted_as_jpy(self):
        result = _parse_mercari_item(self.SAMPLE_RAW, "test", "task")
        assert result["商品信息"]["当前售价"] == "¥3,500"

    def test_photos_preferred_over_thumbnails(self):
        result = _parse_mercari_item(self.SAMPLE_RAW, "test", "task")
        images = result["商品信息"]["商品图片列表"]
        assert len(images) == 2
        assert "photo1.jpg" in images[0]

    def test_seller_info_extracted(self):
        result = _parse_mercari_item(self.SAMPLE_RAW, "test", "task")
        seller = result["卖家信息"]
        assert seller["卖家昵称"] == "テスト出品者"
        assert "95.0%" in seller["作为卖家的好评率"]
        assert seller["卖家收到的评价总数"] == "100"

    def test_tags_include_status_and_condition(self):
        result = _parse_mercari_item(self.SAMPLE_RAW, "test", "task")
        tags = result["商品信息"]["商品标签"]
        assert "在售" in tags
        assert "接近全新" in tags
        assert "卖家包邮" in tags

    def test_region_extracted(self):
        result = _parse_mercari_item(self.SAMPLE_RAW, "test", "task")
        assert result["商品信息"]["发货地区"] == "東京都"

    def test_item_link_correct(self):
        result = _parse_mercari_item(self.SAMPLE_RAW, "test", "task")
        assert result["商品信息"]["商品链接"] == "https://jp.mercari.com/item/m12345678"

    def test_publish_time_parsed(self):
        result = _parse_mercari_item(self.SAMPLE_RAW, "test", "task")
        publish = result["商品信息"]["发布时间"]
        assert publish != ""
        assert "2023" in publish  # 1700000000 → 2023-11-14

    def test_returns_none_for_empty_id(self):
        raw = {"name": "test", "price": 100}  # 没有 id
        result = _parse_mercari_item(raw, "test", "task")
        assert result is None

    def test_handles_missing_seller(self):
        raw = {"id": "m999", "name": "test", "price": 100, "seller": None}
        result = _parse_mercari_item(raw, "test", "task")
        assert result is not None
        assert result["卖家信息"]["卖家昵称"] == ""
        assert result["卖家信息"]["作为卖家的好评率"] == "暂无"

    def test_handles_missing_thumbnails_and_photos(self):
        raw = {"id": "m999", "name": "test", "price": 100}
        result = _parse_mercari_item(raw, "test", "task")
        assert result["商品信息"]["商品图片列表"] == []
        assert result["商品信息"]["商品主图链接"] == ""

    def test_likes_mapped_to_want_count(self):
        result = _parse_mercari_item(self.SAMPLE_RAW, "test", "task")
        assert result["商品信息"]["「想要」人数"] == 12

    def test_new_photo_format_dict_uri(self):
        """搜索 API 新格式 photos: [{"uri": "..."}] 应被正确解析"""
        raw = {
            "id": "m999",
            "name": "test",
            "price": 1000,
            "photos": [{"uri": "https://static.mercdn.net/item/detail/photo1.jpg"}],
            "thumbnails": ["https://static.mercdn.net/thumb/thumb1.jpg"],
        }
        result = _parse_mercari_item(raw, "test", "task")
        assert result["商品信息"]["商品图片列表"] == ["https://static.mercdn.net/item/detail/photo1.jpg"]
        assert result["商品信息"]["商品主图链接"] == "https://static.mercdn.net/item/detail/photo1.jpg"

    def test_seller_id_from_top_level(self):
        """搜索 API 中 seller 为 null 时，应从 sellerId 提取"""
        raw = {
            "id": "m888",
            "name": "test",
            "price": 500,
            "seller": None,
            "sellerId": "12345678",
        }
        result = _parse_mercari_item(raw, "test", "task")
        assert result["_seller_id"] == "12345678"

    def test_condition_from_itemConditionId(self):
        """搜索 API 使用 itemConditionId 字段（纯数字）"""
        raw = {
            "id": "m777",
            "name": "test",
            "price": 100,
            "itemConditionId": "2",
        }
        result = _parse_mercari_item(raw, "test", "task")
        assert "接近全新" in result["商品信息"]["商品标签"]

    def test_shipping_payer_id_tag(self):
        """搜索 API 使用 shippingPayerId='2' 表示卖家包邮"""
        raw = {
            "id": "m666",
            "name": "test",
            "price": 100,
            "shippingPayerId": "2",
            "status": "ITEM_STATUS_ON_SALE",
        }
        result = _parse_mercari_item(raw, "test", "task")
        assert "卖家包邮" in result["商品信息"]["商品标签"]


# ═══════════════════════════════════════════════════════════════
# 第二部分：集成爬取测试（需要 Playwright + 网络）
# ═══════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_mercari_can_be_accessed():
    """验证 Playwright 能否成功访问 Mercari 搜索页面并获取 HTTP 200"""
    import asyncio
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
        )
        context = await browser.new_context(
            viewport={"width": 1280, "height": 900},
            locale="ja-JP",
            timezone_id="Asia/Tokyo",
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/121.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()

        try:
            resp = await page.goto(
                "https://jp.mercari.com/search?keyword=フィギュア&status=on_sale",
                wait_until="domcontentloaded",
                timeout=30000,
            )
            # 基本验证：页面能访问
            assert resp is not None, "响应为 None，可能被拦截或超时"
            assert resp.status == 200, f"HTTP 状态码不是 200，实际: {resp.status}"

            # Mercari 是 SPA，等待 JS 渲染完成
            await asyncio.sleep(3)

            # 页面 URL 应保持在 mercari 域名（没被重定向到登录/拦截页）
            current_url = page.url
            assert "mercari.com" in current_url, f"被重定向离开了 Mercari: {current_url}"

            # 页面内容非空（HTML body 有渲染内容）
            body_text = await page.inner_text("body")
            assert len(body_text) > 100, f"页面内容过少，可能被拦截: {body_text[:200]}"

            print(f"\n  [测试] 页面 URL: {current_url}")
            print(f"  [测试] 页面标题: {await page.title()}")
            print(f"  [测试] Body 文本长度: {len(body_text)}")
        finally:
            await context.close()
            await browser.close()


@pytest.fixture(scope="module")
def mercari_search_results():
    """模块级 fixture：执行一次真实搜索，所有后续测试复用结果"""
    import asyncio
    from src.scraper_mercari import _scrape_search_page
    from playwright.async_api import async_playwright

    async def _fetch():
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
            )
            context = await browser.new_context(
                viewport={"width": 1280, "height": 900},
                locale="ja-JP",
                timezone_id="Asia/Tokyo",
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/121.0.0.0 Safari/537.36"
                ),
            )
            page = await context.new_page()
            try:
                task_config = {
                    "task_name": "测试任务",
                    "search_keyword": "フィギュア",
                    "max_pages": 1,
                }
                return await _scrape_search_page(page, "フィギュア", task_config)
            finally:
                await context.close()
                await browser.close()

    return asyncio.get_event_loop().run_until_complete(_fetch())


class TestMercariSearchIntegration:
    """集成测试：验证从 Mercari 搜索回来的真实数据质量"""

    def test_search_returns_items(self, mercari_search_results):
        """搜索 'フィギュア' 应该返回至少 10 个商品"""
        assert len(mercari_search_results) >= 10, (
            f"搜索结果太少：{len(mercari_search_results)} 个"
        )
        print(f"\n  [测试] 搜索到 {len(mercari_search_results)} 个商品")

    def test_all_items_have_platform_mercari(self, mercari_search_results):
        """所有商品的 platform 都应该是 'mercari'"""
        for item in mercari_search_results:
            assert item["platform"] == "mercari"

    def test_all_items_have_valid_id(self, mercari_search_results):
        """所有商品的 ID 不为空"""
        for item in mercari_search_results:
            assert item["商品信息"]["商品ID"] != "", "商品 ID 为空"

    def test_all_items_have_title(self, mercari_search_results):
        """所有商品都有标题"""
        for item in mercari_search_results:
            assert item["商品信息"]["商品标题"] != "", "商品标题为空"

    def test_all_items_have_valid_link(self, mercari_search_results):
        """所有商品链接都是 Mercari item URL 格式"""
        for item in mercari_search_results:
            link = item["商品信息"]["商品链接"]
            assert link.startswith("https://jp.mercari.com/item/"), f"链接格式错误: {link}"

    def test_all_items_have_jpy_price(self, mercari_search_results):
        """所有商品价格都是日元格式 ¥x,xxx"""
        for item in mercari_search_results:
            price = item["商品信息"]["当前售价"]
            assert price.startswith("¥"), f"价格格式不对: {price}"

    def test_items_have_keyword(self, mercari_search_results):
        """搜索关键字被正确填入"""
        for item in mercari_search_results:
            assert item["搜索关键字"] == "フィギュア"

    def test_items_have_images(self, mercari_search_results):
        """大部分商品应有图片（至少 80%）"""
        with_images = sum(1 for item in mercari_search_results if item["商品信息"]["商品图片列表"])
        ratio = with_images / len(mercari_search_results)
        assert ratio >= 0.8, f"有图片商品占比太低: {ratio:.0%}"
        print(f"\n  [测试] 有图片商品: {with_images}/{len(mercari_search_results)} ({ratio:.0%})")

    def test_sample_item_structure_complete(self, mercari_search_results):
        """验证第一个商品的完整数据结构"""
        first = mercari_search_results[0]

        # 顶层字段
        assert "爬取时间" in first
        assert "搜索关键字" in first
        assert "任务名称" in first
        assert "platform" in first
        assert "商品信息" in first
        assert "卖家信息" in first
        assert "ai_analysis" in first

        # 商品信息字段
        goods = first["商品信息"]
        expected_fields = [
            "商品ID", "商品标题", "当前售价", "商品原价",
            "「想要」人数", "商品标签", "发货地区", "卖家昵称",
            "商品链接", "发布时间", "商品图片列表", "商品主图链接", "浏览量",
        ]
        for field in expected_fields:
            assert field in goods, f"缺少商品信息字段: {field}"

        # 卖家信息字段
        seller = first["卖家信息"]
        expected_seller = [
            "卖家昵称", "卖家头像链接", "卖家收到的评价总数",
            "作为卖家的好评数", "作为卖家的好评率",
        ]
        for field in expected_seller:
            assert field in seller, f"缺少卖家信息字段: {field}"

        print(f"\n  [测试] 第一个: {goods['商品标题'][:50]} | {goods['当前售价']}")
        print(f"  [测试] 卖家: {seller['卖家昵称']} | 好评率: {seller['作为卖家的好评率']}")

    def test_seller_name_not_empty(self, mercari_search_results):
        """卖家昵称不应为空（大部分商品应有卖家信息，至少 80%）"""
        with_seller = sum(
            1 for item in mercari_search_results
            if item["卖家信息"]["卖家昵称"].strip()
        )
        ratio = with_seller / len(mercari_search_results)
        assert ratio >= 0.8, (
            f"有卖家昵称的商品占比太低: {with_seller}/{len(mercari_search_results)} ({ratio:.0%})"
        )
        print(f"\n  [测试] 有卖家昵称: {with_seller}/{len(mercari_search_results)} ({ratio:.0%})")

    def test_seller_good_rate_not_empty(self, mercari_search_results):
        """卖家好评率不应全是'暂无'（大部分应有评价数据，至少 50%）"""
        with_rating = sum(
            1 for item in mercari_search_results
            if item["卖家信息"]["作为卖家的好评率"] != "暂无"
            and item["卖家信息"]["作为卖家的好评率"].strip()
        )
        ratio = with_rating / len(mercari_search_results)
        assert ratio >= 0.5, (
            f"有好评率的商品占比太低: {with_rating}/{len(mercari_search_results)} ({ratio:.0%})"
        )
        print(f"\n  [测试] 有好评率: {with_rating}/{len(mercari_search_results)} ({ratio:.0%})")
