"""
Mercari (jp.mercari.com) 爬虫模块
使用 Playwright 抓取日本 Mercari 平台的商品数据，
输出格式与闲鱼爬虫一致，可统一入库和 AI 分析。
"""
import asyncio
import json
import os
import random
from datetime import datetime
from typing import Optional
from urllib.parse import urlencode, quote

from playwright.async_api import (
    Page,
    BrowserContext,
    Response,
    TimeoutError as PlaywrightTimeoutError,
    async_playwright,
)

from src.ai_handler import (
    download_all_images,
    get_ai_analysis,
    send_ntfy_notification,
    cleanup_task_images,
)
from src.utils import (
    random_sleep,
    safe_get,
    save_to_jsonl,
    log_time,
)


# ─── 常量 ──────────────────────────────────────────────────────
MERCARI_BASE_URL = "https://jp.mercari.com"
MERCARI_SEARCH_URL = f"{MERCARI_BASE_URL}/search"
MERCARI_ITEM_URL = f"{MERCARI_BASE_URL}/item"

# Mercari 搜索 API 拦截模式
MERCARI_SEARCH_API_PATTERN = "api.mercari.jp/v2/entities:search"
MERCARI_ITEM_API_PATTERN = "api.mercari.jp/items/get"

# 商品状态映射
ITEM_STATUS_MAP = {
    "ITEM_STATUS_ON_SALE": "在售",
    "ITEM_STATUS_SOLD_OUT": "已售",
    "ITEM_STATUS_TRADING": "交易中",
    "on_sale": "在售",
    "sold_out": "已售",
}

# 商品成色映射
ITEM_CONDITION_MAP = {
    "ITEM_CONDITION_ID_1": "全新/未使用",
    "ITEM_CONDITION_ID_2": "接近全新",
    "ITEM_CONDITION_ID_3": "无明显伤痕和污渍",
    "ITEM_CONDITION_ID_4": "轻微伤痕和污渍",
    "ITEM_CONDITION_ID_5": "有伤痕和污渍",
    "ITEM_CONDITION_ID_6": "整体状况差",
    "1": "全新/未使用",
    "2": "接近全新",
    "3": "无明显伤痕和污渍",
    "4": "轻微伤痕和污渍",
    "5": "有伤痕和污渍",
    "6": "整体状况差",
}


def _jpy_to_display(price_value) -> str:
    """将日元价格值转为显示字符串"""
    try:
        p = int(price_value)
        return f"¥{p:,}"
    except (TypeError, ValueError):
        return str(price_value) if price_value else "暂无"


def _normalize_photos(photos: list) -> list[str]:
    """
    统一 photos 格式。
    搜索 API 新格式: [{"uri": "https://..."}]
    详情 API / 老格式: ["https://..."]
    """
    result = []
    for p in photos:
        if isinstance(p, str):
            result.append(p)
        elif isinstance(p, dict):
            uri = p.get("uri", "") or p.get("url", "")
            if uri:
                result.append(uri)
    return result


def _parse_mercari_item(raw_item: dict, keyword: str, task_name: str) -> Optional[dict]:
    """
    将 Mercari 原始商品数据解析为统一格式。
    输出结构与闲鱼爬虫的 data_record 一致。
    """
    item_id = raw_item.get("id", "")
    if not item_id:
        return None

    name = raw_item.get("name", "")
    price = raw_item.get("price", 0)
    status_str = raw_item.get("status", "")

    # 成色：兼容搜索 API (itemConditionId 顶层) 和详情 API (item_condition.id)
    condition_id = raw_item.get("itemConditionId", "")
    if not condition_id:
        condition_obj = raw_item.get("item_condition")
        if isinstance(condition_obj, dict):
            condition_id = str(condition_obj.get("id", ""))
    condition_id = str(condition_id)
    condition_name = ITEM_CONDITION_MAP.get(condition_id, condition_id)

    # 图片：统一处理新旧格式
    thumbnails = raw_item.get("thumbnails", [])
    photos = _normalize_photos(raw_item.get("photos", []))
    image_list = photos if photos else thumbnails

    # 卖家信息（搜索 API 中 seller 可能为 null）
    seller = raw_item.get("seller", {}) or {}
    seller_id = seller.get("id", "") or raw_item.get("sellerId", "")
    seller_name = seller.get("name", "")
    seller_photo = seller.get("photo_thumbnail_url", "") or seller.get("photo_url", "")
    seller_ratings = seller.get("ratings", {}) or {}
    seller_good = seller_ratings.get("good", 0)
    seller_normal = seller_ratings.get("normal", 0)
    seller_bad = seller_ratings.get("bad", 0)
    seller_total = seller_good + seller_normal + seller_bad
    seller_good_rate = f"{seller_good / seller_total * 100:.1f}%" if seller_total > 0 else "暂无"

    # 卖家在售/已售数
    num_sell_items = seller.get("num_sell_items", "")

    num_likes = raw_item.get("num_likes", 0)
    num_comments = raw_item.get("num_comments", 0)
    created = raw_item.get("created", 0)
    updated = raw_item.get("updated", 0)

    # 时间戳转日期
    publish_time = ""
    if created:
        try:
            publish_time = datetime.fromtimestamp(int(created)).strftime("%Y-%m-%d %H:%M")
        except (TypeError, ValueError, OSError):
            pass

    # 标签
    tags = []
    item_status = ITEM_STATUS_MAP.get(status_str, status_str)
    if item_status == "在售":
        tags.append("在售")
    if condition_name:
        tags.append(condition_name)
    # 兼容搜索API (shippingPayerId) 和详情API (shipping_method)
    shipping_payer_id = raw_item.get("shippingPayerId", "")
    shipping_method = raw_item.get("shipping_method", {})
    if shipping_payer_id == "2" or (shipping_method and shipping_method.get("is_seller_payment")):
        tags.append("卖家包邮")

    shipping_from = raw_item.get("shipping_from_area", {})
    region = shipping_from.get("name", "") if isinstance(shipping_from, dict) else str(shipping_from)

    item_link = f"{MERCARI_ITEM_URL}/{item_id}"
    main_image = image_list[0] if image_list else ""

    return {
        "爬取时间": datetime.now().isoformat(),
        "搜索关键字": keyword,
        "任务名称": task_name,
        "platform": "mercari",
        "_seller_id": str(seller_id),  # 内部字段，用于后续补充卖家信息
        "商品信息": {
            "商品ID": str(item_id),
            "商品标题": name,
            "当前售价": _jpy_to_display(price),
            "商品原价": "暂无",
            "「想要」人数": num_likes,
            "商品标签": tags,
            "发货地区": region,
            "卖家昵称": seller_name,
            "商品链接": item_link,
            "发布时间": publish_time,
            "商品图片列表": image_list,
            "商品主图链接": main_image,
            "浏览量": num_comments,  # Mercari 不直接暴露浏览量，用评论数近似
        },
        "卖家信息": {
            "卖家昵称": seller_name,
            "卖家头像链接": seller_photo,
            "卖家个性签名": "",
            "卖家在售/已售商品数": str(num_sell_items) if num_sell_items else "",
            "卖家收到的评价总数": str(seller_total),
            "卖家信用等级": "",
            "买家信用等级": "",
            "卖家芝麻信用": "",
            "卖家注册时长": "",
            "作为卖家的好评数": f"{seller_good}/{seller_total}",
            "作为卖家的好评率": seller_good_rate,
            "作为买家的好评数": "",
            "作为买家的好评率": "",
        },
        "ai_analysis": {},
    }


def _safe_int(val, default: int = 0) -> int:
    """安全转换为整数，处理字符串/None/空值"""
    if val is None or val == "":
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def _build_search_url(keyword: str, sort: str = "sort_score", order: str = "desc",
                       status: str = "on_sale", price_min=0, price_max=0,
                       page_token: str = "") -> str:
    """构建 Mercari 搜索 URL"""
    params = {
        "keyword": keyword,
        "sort": sort,
        "order": order,
        "status": status,
    }
    price_min_int = _safe_int(price_min)
    price_max_int = _safe_int(price_max)
    if price_min_int > 0:
        params["price_min"] = str(price_min_int)
    if price_max_int > 0:
        params["price_max"] = str(price_max_int)
    if page_token:
        params["page_token"] = page_token
    return f"{MERCARI_SEARCH_URL}?{urlencode(params)}"


async def _scrape_search_page(page: Page, keyword: str, task_config: dict) -> list[dict]:
    """
    通过 Playwright 访问 Mercari 搜索页面，解析商品列表。
    优先通过拦截 API 请求获取结构化数据；
    如果拦截失败，降级为 DOM 解析。
    """
    task_name = task_config.get("task_name", keyword)
    price_min = task_config.get("min_price", 0)
    price_max = task_config.get("max_price", 0)
    max_pages = task_config.get("max_pages", 3)

    all_items = []
    page_token = ""

    for page_num in range(1, max_pages + 1):
        url = _build_search_url(
            keyword=keyword,
            price_min=price_min,
            price_max=price_max,
            page_token=page_token,
        )
        print(f"  [Mercari] 第 {page_num}/{max_pages} 页: {url}")

        captured_data = {}

        async def handle_response(response: Response):
            """拦截搜索 API 响应"""
            try:
                if MERCARI_SEARCH_API_PATTERN in response.url and response.status == 200:
                    body = await response.json()
                    captured_data["search_response"] = body
            except Exception:
                pass

        page.on("response", handle_response)

        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
        except PlaywrightTimeoutError:
            print(f"  [Mercari] 页面加载超时，尝试继续解析...")

        page.remove_listener("response", handle_response)

        # 等待页面渲染
        await random_sleep(1.5, 3.0)

        # 方式1: 从拦截到的 API 数据中解析
        if "search_response" in captured_data:
            api_data = captured_data["search_response"]
            items_raw = api_data.get("items", [])
            for raw in items_raw:
                parsed = _parse_mercari_item(raw, keyword, task_name)
                if parsed:
                    all_items.append(parsed)

            # 翻页 token
            page_token = api_data.get("meta", {}).get("nextPageToken", "")
            if not page_token:
                print(f"  [Mercari] 没有更多页面了")
                break
        else:
            # 方式2: 降级为 DOM 解析
            print(f"  [Mercari] 未拦截到 API 数据，降级为 DOM 解析")
            items_from_dom = await _parse_search_dom(page, keyword, task_name)
            all_items.extend(items_from_dom)
            break  # DOM 模式不支持翻页 token

        if page_num < max_pages and page_token:
            await random_sleep(2.0, 4.0)

    # 补充卖家信息：搜索 API 不返回卖家详情，需要单独获取
    if all_items:
        await _enrich_seller_info(page, all_items)

    return all_items


async def _enrich_seller_info(page: Page, items: list[dict], concurrency: int = 5):
    """
    批量获取卖家信息。
    Mercari 搜索 API 不返回卖家详情，需通过并发打开商品详情页、
    拦截 items/get API 响应来提取卖家数据。
    使用多 tab 并发 + Semaphore 控制并发数，效率较高。
    """
    # 收集需要补充的商品（卖家昵称为空的）
    needs_enrich = [
        item for item in items
        if not item["卖家信息"]["卖家昵称"].strip() and item.get("_seller_id")
    ]
    if not needs_enrich:
        return

    # 按 sellerId 去重，避免重复请求同一卖家
    seller_id_to_items: dict[str, list[dict]] = {}
    item_id_to_item: dict[str, dict] = {}
    for item in needs_enrich:
        sid = item.get("_seller_id", "")
        iid = item["商品信息"]["商品ID"]
        if sid:
            seller_id_to_items.setdefault(sid, []).append(item)
        item_id_to_item[iid] = item

    # 选取每个卖家的一个商品 ID 来查询详情
    items_to_fetch = []
    for sid, sitems in seller_id_to_items.items():
        items_to_fetch.append((sid, sitems[0]["商品信息"]["商品ID"]))

    print(f"  [Mercari] 补充卖家信息: {len(items_to_fetch)} 个卖家, {len(needs_enrich)} 个商品 (并发={concurrency})")

    browser_context = page.context
    sem = asyncio.Semaphore(concurrency)

    async def _fetch_one(seller_id: str, item_id: str) -> Optional[dict]:
        """打开一个新 tab 导航到商品详情页，拦截 API 响应获取卖家信息"""
        async with sem:
            tab = await browser_context.new_page()
            detail: dict = {}

            async def _on_response(resp: Response):
                try:
                    if "api.mercari.jp/items/get?" in resp.url and resp.status == 200:
                        body = await resp.json()
                        seller = (body.get("data") or body).get("seller")
                        if seller and seller.get("name"):
                            detail["seller"] = seller
                except Exception:
                    pass

            tab.on("response", _on_response)
            try:
                await tab.goto(
                    f"{MERCARI_ITEM_URL}/{item_id}",
                    wait_until="domcontentloaded",
                    timeout=10000,
                )
                # 轮询等待 API 响应（最多 5 秒）
                for _ in range(10):
                    if "seller" in detail:
                        break
                    await tab.wait_for_timeout(500)
            except Exception:
                pass
            finally:
                tab.remove_listener("response", _on_response)
                await tab.close()

            return detail.get("seller")

    # 并发获取所有卖家信息
    tasks = [_fetch_one(sid, iid) for sid, iid in items_to_fetch]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # 更新商品数据
    for (sid, _item_id), result in zip(items_to_fetch, results):
        if isinstance(result, Exception) or not result:
            continue

        seller = result
        s_name = seller.get("name", "")
        s_photo = seller.get("photo_thumbnail_url", "") or seller.get("photo_url", "")
        s_ratings = seller.get("ratings", {}) or {}
        s_good = s_ratings.get("good", 0)
        s_normal = s_ratings.get("normal", 0)
        s_bad = s_ratings.get("bad", 0)
        s_total = s_good + s_normal + s_bad
        s_good_rate = f"{s_good / s_total * 100:.1f}%" if s_total > 0 else "暂无"
        s_sell_items = seller.get("num_sell_items", "")

        target_items = seller_id_to_items.get(sid, [])
        for item in target_items:
            item["商品信息"]["卖家昵称"] = s_name
            item["卖家信息"]["卖家昵称"] = s_name
            item["卖家信息"]["卖家头像链接"] = s_photo
            item["卖家信息"]["卖家收到的评价总数"] = str(s_total)
            item["卖家信息"]["作为卖家的好评数"] = f"{s_good}/{s_total}"
            item["卖家信息"]["作为卖家的好评率"] = s_good_rate
            item["卖家信息"]["卖家在售/已售商品数"] = str(s_sell_items) if s_sell_items else ""

    enriched = sum(1 for item in needs_enrich if item["卖家信息"]["卖家昵称"].strip())
    print(f"  [Mercari] 卖家信息补充完成: {enriched}/{len(needs_enrich)}")


async def _parse_search_dom(page: Page, keyword: str, task_name: str) -> list[dict]:
    """
    DOM 降级解析：从搜索结果页面的 HTML 中提取商品信息。
    当 API 拦截失败时使用。
    """
    items = []
    try:
        # Mercari 搜索结果使用 data-testid="item-cell" 的元素
        cards = await page.query_selector_all('[data-testid="item-cell"], li[data-testid] a[href*="/item/"]')
        if not cards:
            # 尝试更宽泛的选择器
            cards = await page.query_selector_all('a[href*="/item/m"]')

        for card in cards:
            try:
                href = await card.get_attribute("href") or ""
                if "/item/" not in href:
                    parent = await card.query_selector("a[href*='/item/']")
                    if parent:
                        href = await parent.get_attribute("href") or ""

                item_id = href.split("/item/")[-1].split("?")[0] if "/item/" in href else ""
                if not item_id:
                    continue

                # 提取标题
                title_el = await card.query_selector('[data-testid="thumbnail-item-name"], span[class*="itemName"]')
                title = (await title_el.inner_text()).strip() if title_el else ""
                if not title:
                    title_el = await card.query_selector("span")
                    title = (await title_el.inner_text()).strip() if title_el else "未知商品"

                # 提取价格
                price_el = await card.query_selector('[data-testid="thumbnail-item-price"], span[class*="price"]')
                price_text = (await price_el.inner_text()).strip() if price_el else "0"

                # 提取图片
                img_el = await card.query_selector("img")
                img_url = (await img_el.get_attribute("src") or "") if img_el else ""

                item_link = f"{MERCARI_BASE_URL}{href}" if href.startswith("/") else href

                items.append({
                    "爬取时间": datetime.now().isoformat(),
                    "搜索关键字": keyword,
                    "任务名称": task_name,
                    "platform": "mercari",
                    "商品信息": {
                        "商品ID": item_id,
                        "商品标题": title,
                        "当前售价": price_text,
                        "商品原价": "暂无",
                        "「想要」人数": 0,
                        "商品标签": [],
                        "发货地区": "",
                        "卖家昵称": "",
                        "商品链接": item_link,
                        "发布时间": "",
                        "商品图片列表": [img_url] if img_url else [],
                        "商品主图链接": img_url,
                        "浏览量": 0,
                    },
                    "卖家信息": {
                        "卖家昵称": "",
                        "卖家头像链接": "",
                        "卖家个性签名": "",
                        "卖家在售/已售商品数": "",
                        "卖家收到的评价总数": "",
                        "卖家信用等级": "",
                        "买家信用等级": "",
                        "卖家芝麻信用": "",
                        "卖家注册时长": "",
                        "作为卖家的好评数": "",
                        "作为卖家的好评率": "",
                        "作为买家的好评数": "",
                        "作为买家的好评率": "",
                    },
                    "ai_analysis": {},
                })
            except Exception as e:
                print(f"  [Mercari] DOM 解析单个商品失败: {e}")
                continue

    except Exception as e:
        print(f"  [Mercari] DOM 解析失败: {e}")

    print(f"  [Mercari] DOM 模式解析到 {len(items)} 个商品")
    return items


async def scrape_mercari(task_config: dict, debug_limit: int = 0) -> int:
    """
    Mercari 爬虫核心入口。与 scrape_xianyu 对等。
    
    Args:
        task_config: 任务配置（来自 config.json），需包含:
            - task_name: 任务名称
            - keyword: 搜索关键词（与闲鱼爬虫、数据库字段统一）
            - min_price / max_price: 价格范围（日元）
            - max_pages: 最大翻页数（默认 3）
            - ai_prompt_text: AI 分析 Prompt（可选）
        debug_limit: 调试模式限制处理的商品数（0=无限制）
        
    Returns:
        本次处理的新商品数量
    """
    task_name = task_config.get("task_name", "Mercari")
    keyword = task_config.get("keyword", "") or task_config.get("search_keyword", "")
    ai_prompt_text = task_config.get("ai_prompt_text", "")
    instant_notify = task_config.get("instant_notify", False)

    if not keyword:
        print(f"[Mercari] 任务 '{task_name}' 缺少搜索关键词，跳过")
        return 0

    print(f"\n{'='*50}")
    print(f"[Mercari] 开始任务: {task_name} | 关键词: {keyword}")
    print(f"{'='*50}")

    processed_count = 0

    async with async_playwright() as p:
        # Mercari 不需要登录态，直接启动无头浏览器
        headless = os.getenv("RUN_HEADLESS", "true").lower() in ("1", "true", "yes")
        browser = await p.chromium.launch(
            headless=headless,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
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
            # 1. 搜索并获取商品列表
            search_results = await _scrape_search_page(page, keyword, task_config)
            print(f"  [Mercari] 搜索到 {len(search_results)} 个商品")

            if not search_results:
                print(f"  [Mercari] 没有搜索结果，任务结束")
                return 0

            # 2. 去重：检查数据库中已存在的商品
            from src.infrastructure.persistence.item_repository import ItemRepository
            repo = ItemRepository()
            existing_ids = set()
            try:
                data = await repo.query(keyword=keyword, page=1, limit=10000)
                for item in data.get("items", []):
                    existing_ids.add(item.get("商品信息", {}).get("商品ID", ""))
            except Exception:
                pass

            new_items = [
                item for item in search_results
                if item["商品信息"]["商品ID"] not in existing_ids
            ]
            print(f"  [Mercari] 去重后剩余 {len(new_items)} 个新商品（已存在 {len(search_results) - len(new_items)} 个）")

            if debug_limit > 0:
                new_items = new_items[:debug_limit]
                print(f"  [Mercari] 调试模式：只处理前 {debug_limit} 个")

            # 3. 逐个处理新商品：AI 分析 + 保存
            for idx, item_record in enumerate(new_items, 1):
                item_id = item_record["商品信息"]["商品ID"]
                title = item_record["商品信息"]["商品标题"][:40]
                print(f"\n  [{idx}/{len(new_items)}] 处理: {title}...")

                # 即时推送模式
                if instant_notify:
                    try:
                        await send_ntfy_notification(item_record, keyword)
                    except Exception as e:
                        print(f"    即时推送失败: {e}")

                # AI 分析
                if ai_prompt_text:
                    try:
                        image_urls = item_record["商品信息"].get("商品图片列表", [])[:3]
                        if image_urls:
                            local_images = await download_all_images(image_urls, item_id)
                        else:
                            local_images = []

                        ai_result = await get_ai_analysis(
                            item_record, ai_prompt_text, local_images
                        )
                        if ai_result:
                            item_record["ai_analysis"] = ai_result
                            print(f"    AI: {'✅ 推荐' if ai_result.get('is_recommended') else '❌ 不推荐'}")
                    except Exception as e:
                        print(f"    AI 分析失败: {e}")
                        item_record["ai_analysis"] = {
                            "is_recommended": None,
                            "reason": f"分析失败: {e}",
                            "risk_tags": [],
                        }

                # 保存到数据库（统一走 save_to_jsonl）
                await save_to_jsonl(item_record, keyword)
                processed_count += 1

                # 非即时推送模式，且 AI 推荐的，发送通知
                if not instant_notify and item_record.get("ai_analysis", {}).get("is_recommended"):
                    try:
                        await send_ntfy_notification(item_record, keyword)
                    except Exception as e:
                        print(f"    通知推送失败: {e}")

                # 随机延迟
                if idx < len(new_items):
                    await random_sleep(1.0, 2.5)

        except Exception as e:
            print(f"  [Mercari] 爬虫异常: {e}")
            import traceback
            traceback.print_exc()
        finally:
            await context.close()
            await browser.close()
            try:
                cleanup_task_images(task_name)
            except Exception:
                pass

    print(f"\n[Mercari] 任务 '{task_name}' 完成，处理了 {processed_count} 个新商品")
    return processed_count
