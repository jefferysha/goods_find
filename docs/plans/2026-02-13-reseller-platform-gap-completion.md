# 二手倒卖平台重构 — 缺口补全实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 补全设计文档中尚未实现的 3 个新页面（溢价地图、行情走势、竞品观察）+ 2 个现有页面改造（结果页增强、仪表盘经营驾驶舱）+ 路由/侧边栏补全

**Architecture:** 
- 3 个新页面的数据全部来自已有的 `items` 表 + `price_book` 表，通过 `ItemRepository` 和 `PriceBookService` 组合查询
- 需要在后端新增 3 个 API 端点（溢价地图、行情走势、竞品观察），前端新建对应的 api/hook/page
- ResultsPage 和 DashboardPage 在现有代码基础上增强，不破坏已有功能

**Tech Stack:** FastAPI, React 18, TypeScript, Recharts, shadcn/ui, Tailwind CSS

**并发执行组：**
- Group A（可并发）: Task 1-3 — 后端 3 个新 API
- Group B（可并发，依赖 Group A）: Task 4-6 — 前端 3 个新页面
- Group C（可并发）: Task 7-8 — 现有页面改造
- Group D（串行）: Task 9 — 路由/侧边栏补全 + 构建验证

---

## Task 1: 后端 — 溢价地图 API

**Files:**
- Modify: `src/api/routes/results.py`

**目标:** 提供品类溢价概览和溢价分布数据

### Step 1: 在 results.py 中添加溢价地图 API

在 `src/api/routes/results.py` 文件末尾添加以下两个端点：

```python
@router.get("/premium-map/overview")
async def get_premium_map_overview():
    """
    溢价地图 — 品类溢价概览
    返回每个品类的：在监控数量、行情均价、当前中位价、平均溢价率、可收商品数
    """
    from src.services.price_book_service import PriceBookService
    import statistics

    pb_service = PriceBookService()
    entries = await pb_service.get_all()

    result = []
    for entry in entries:
        keywords = entry.get("keywords", [])
        if not keywords:
            continue

        # 获取该品类所有商品
        all_prices = []
        total_items = 0
        for kw in keywords:
            data = await item_repo.query(keyword=kw, page=1, limit=10000)
            items = data.get("items", [])
            total_items += len(items)
            for item in items:
                price_str = item.get("商品信息", {}).get("当前售价", "")
                price = float(str(price_str).replace("¥", "").replace(",", "").strip() or "0")
                if price > 0:
                    all_prices.append(price)

        if not all_prices:
            continue

        median_price = round(statistics.median(all_prices), 2)
        market_price = entry.get("market_price") or median_price
        avg_premium = round((median_price - market_price) / market_price * 100, 2) if market_price > 0 else 0

        # 计算可收商品数
        purchase_upper = entry.get("purchase_upper")
        good_deal_count = sum(1 for p in all_prices if purchase_upper and p <= purchase_upper)

        result.append({
            "id": entry["id"],
            "category_name": entry["category_name"],
            "keywords": keywords,
            "total_items": total_items,
            "market_price": market_price,
            "median_price": median_price,
            "avg_premium_rate": avg_premium,
            "good_deal_count": good_deal_count,
            "purchase_range": entry.get("purchase_range", [None, None]),
            "new_price": entry.get("new_price"),
        })

    return result


@router.get("/premium-map/distribution")
async def get_premium_distribution_detail(keyword: str = Query(...)):
    """
    溢价地图 — 选中品类的价格分布
    返回价格区间分布直方图数据
    """
    from src.services.price_book_service import PriceBookService

    pb_service = PriceBookService()
    entry = await pb_service.get_by_keyword(keyword)

    data = await item_repo.query(keyword=keyword, page=1, limit=10000)
    items = data.get("items", [])

    prices = []
    for item in items:
        price_str = item.get("商品信息", {}).get("当前售价", "")
        price = float(str(price_str).replace("¥", "").replace(",", "").strip() or "0")
        if price > 0:
            prices.append(price)

    if not prices:
        return {"bins": [], "reference_lines": {}}

    # 生成价格区间分布
    min_p, max_p = min(prices), max(prices)
    bin_count = min(20, max(5, len(prices) // 3))
    bin_width = (max_p - min_p) / bin_count if bin_count > 0 else 1

    bins = []
    for i in range(bin_count):
        low = round(min_p + i * bin_width, 0)
        high = round(min_p + (i + 1) * bin_width, 0)
        count = sum(1 for p in prices if low <= p < high) if i < bin_count - 1 else sum(1 for p in prices if low <= p <= high)
        bins.append({"range_low": low, "range_high": high, "count": count, "label": f"¥{int(low)}-{int(high)}"})

    reference_lines = {}
    if entry:
        reference_lines["market_price"] = entry.get("market_price")
        reference_lines["new_price"] = entry.get("new_price")
        pr = entry.get("purchase_range", [None, None])
        reference_lines["purchase_ideal"] = pr[0] if pr else None
        reference_lines["purchase_upper"] = pr[1] if pr else None

    return {"bins": bins, "reference_lines": reference_lines}
```

### Step 2: 验证

```bash
curl -s http://localhost:8000/api/results/premium-map/overview | python -m json.tool | head -20
curl -s "http://localhost:8000/api/results/premium-map/distribution?keyword=科比手办" | python -m json.tool | head -20
```

Expected: 返回 JSON，无 500 错误

### Step 3: 提交

```bash
git add src/api/routes/results.py
git commit -m "feat(api): add premium map overview and distribution endpoints"
```

---

## Task 2: 后端 — 行情走势 API

**Files:**
- Modify: `src/api/routes/results.py`

**目标:** 提供品类级别的历史价格走势数据

### Step 1: 在 results.py 中添加行情走势 API

```python
@router.get("/market-trend")
async def get_market_trend(
    keyword: str = Query(...),
    days: int = Query(30, ge=7, le=90),
):
    """
    行情走势 — 指定品类最近 N 天的价格走势
    返回每天的：平均价、中位价、最低价、最高价、商品数量
    """
    import statistics
    from datetime import datetime, timedelta

    since = (datetime.now() - timedelta(days=days)).isoformat()

    db = await __import__('src.infrastructure.persistence.sqlite_manager', fromlist=['get_db']).get_db()
    try:
        cursor = await db.execute(
            """SELECT date(crawl_time) as day, price
               FROM items
               WHERE keyword = ? AND crawl_time >= ? AND price > 0
               ORDER BY day""",
            (keyword, since),
        )
        rows = await cursor.fetchall()
    finally:
        await db.close()

    # 按天聚合
    from collections import defaultdict
    daily: dict[str, list[float]] = defaultdict(list)
    for row in rows:
        r = dict(row)
        daily[r["day"]].append(r["price"])

    trend = []
    for day in sorted(daily.keys()):
        prices = daily[day]
        trend.append({
            "date": day,
            "avg_price": round(statistics.mean(prices), 2),
            "median_price": round(statistics.median(prices), 2),
            "min_price": round(min(prices), 2),
            "max_price": round(max(prices), 2),
            "count": len(prices),
        })

    return {"keyword": keyword, "days": days, "trend": trend}
```

**注意：** 上面的 import 写法不好，实际应该在文件顶部导入。改为在文件顶部加一个导入：

在 `results.py` 文件顶部的 import 区域添加：
```python
from src.infrastructure.persistence.sqlite_manager import get_db as get_raw_db
import statistics as _statistics
from collections import defaultdict as _defaultdict
from datetime import datetime as _datetime, timedelta as _timedelta
```

然后端点内直接用这些变量。

### Step 2: 验证

```bash
curl -s "http://localhost:8000/api/results/market-trend?keyword=科比手办&days=30" | python -m json.tool | head -20
```

### Step 3: 提交

```bash
git add src/api/routes/results.py
git commit -m "feat(api): add market trend endpoint for category price history"
```

---

## Task 3: 后端 — 竞品观察 API

**Files:**
- Modify: `src/api/routes/results.py`

**目标:** 提供品类下按卖家分组的价格分布

### Step 1: 添加竞品观察 API

```python
@router.get("/competitor-analysis")
async def get_competitor_analysis(keyword: str = Query(...)):
    """
    竞品观察 — 指定品类的卖家定价分布
    返回：按卖家分组的商品和定价
    """
    data = await item_repo.query(keyword=keyword, page=1, limit=10000)
    items = data.get("items", [])

    seller_map: dict[str, list] = {}
    price_distribution: list[float] = []

    for item in items:
        info = item.get("商品信息", {})
        seller = item.get("卖家信息", {})
        seller_name = seller.get("卖家昵称") or info.get("卖家昵称") or "未知卖家"
        price_str = info.get("当前售价", "")
        price = float(str(price_str).replace("¥", "").replace(",", "").strip() or "0")

        if price <= 0:
            continue

        price_distribution.append(price)

        if seller_name not in seller_map:
            seller_map[seller_name] = []

        seller_map[seller_name].append({
            "title": info.get("商品标题", ""),
            "price": price,
            "item_link": info.get("商品链接", ""),
            "crawl_time": item.get("爬取时间", ""),
        })

    # 按卖家商品数排序
    sellers = []
    for name, items_list in sorted(seller_map.items(), key=lambda x: len(x[1]), reverse=True):
        prices = [x["price"] for x in items_list]
        sellers.append({
            "seller_name": name,
            "item_count": len(items_list),
            "avg_price": round(sum(prices) / len(prices), 2),
            "min_price": min(prices),
            "max_price": max(prices),
            "items": items_list[:5],  # 每个卖家最多展示5个
        })

    return {
        "keyword": keyword,
        "total_sellers": len(sellers),
        "total_items": len(price_distribution),
        "sellers": sellers,
        "price_stats": {
            "avg": round(sum(price_distribution) / len(price_distribution), 2) if price_distribution else 0,
            "min": min(price_distribution) if price_distribution else 0,
            "max": max(price_distribution) if price_distribution else 0,
        },
    }
```

### Step 2: 验证

```bash
curl -s "http://localhost:8000/api/results/competitor-analysis?keyword=科比手办" | python -m json.tool | head -30
```

### Step 3: 提交

```bash
git add src/api/routes/results.py
git commit -m "feat(api): add competitor analysis endpoint"
```

---

## Task 4: 前端 — 溢价地图页面

**Files:**
- Create: `web-ui/src/api/premiumMap.ts`
- Create: `web-ui/src/hooks/premiumMap/usePremiumMap.ts`
- Create: `web-ui/src/pages/PremiumMapPage.tsx`

### Step 1: 创建 API 客户端

`web-ui/src/api/premiumMap.ts`:

```typescript
import { http } from './http'

export interface CategoryOverview {
  id: string
  category_name: string
  keywords: string[]
  total_items: number
  market_price: number
  median_price: number
  avg_premium_rate: number
  good_deal_count: number
  purchase_range: [number | null, number | null]
  new_price?: number
}

export interface PriceBin {
  range_low: number
  range_high: number
  count: number
  label: string
}

export interface DistributionData {
  bins: PriceBin[]
  reference_lines: {
    market_price?: number
    new_price?: number
    purchase_ideal?: number
    purchase_upper?: number
  }
}

export async function getPremiumMapOverview(): Promise<CategoryOverview[]> {
  return http('/api/results/premium-map/overview')
}

export async function getPremiumDistribution(keyword: string): Promise<DistributionData> {
  return http('/api/results/premium-map/distribution', { params: { keyword } })
}
```

### Step 2: 创建 Hook

`web-ui/src/hooks/premiumMap/usePremiumMap.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import * as api from '@/api/premiumMap'
import type { CategoryOverview, DistributionData } from '@/api/premiumMap'

export function usePremiumMap() {
  const [categories, setCategories] = useState<CategoryOverview[]>([])
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)
  const [distribution, setDistribution] = useState<DistributionData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDistLoading, setIsDistLoading] = useState(false)

  const fetchOverview = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.getPremiumMapOverview()
      setCategories(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchDistribution = useCallback(async (keyword: string) => {
    setIsDistLoading(true)
    try {
      const data = await api.getPremiumDistribution(keyword)
      setDistribution(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsDistLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview])

  useEffect(() => {
    if (selectedKeyword) fetchDistribution(selectedKeyword)
    else setDistribution(null)
  }, [selectedKeyword, fetchDistribution])

  return { categories, selectedKeyword, setSelectedKeyword, distribution, isLoading, isDistLoading, refresh: fetchOverview }
}
```

### Step 3: 创建页面

`web-ui/src/pages/PremiumMapPage.tsx`:

页面布局：
- **上半部分**：品类溢价概览卡片网格（每个品类一张卡片，显示在监控数、行情均价、当前中位价、溢价率、可收商品数）
- **下半部分**：选中品类后的价格分布直方图（BarChart），标注收购区间（绿色）、行情价（蓝线）、新品价（灰线）

使用 `Card`, `Button`, `Badge` 组件。图表使用 `BarChart` from recharts。
溢价率为负（价格洼地）用绿色，为正用红色。

### Step 4: 注册路由和侧边栏

在 `routes.tsx` 添加 `/premium-map` 路由。
在 `SidebarNav.tsx` 的"发现商品"分组中添加"溢价地图"菜单项。

### Step 5: 构建验证

```bash
cd web-ui && pnpm run build
```

### Step 6: 提交

```bash
git add web-ui/src/api/premiumMap.ts web-ui/src/hooks/premiumMap/usePremiumMap.ts web-ui/src/pages/PremiumMapPage.tsx
git commit -m "feat(frontend): add premium map page with category overview and distribution chart"
```

---

## Task 5: 前端 — 行情走势页面

**Files:**
- Create: `web-ui/src/api/marketTrend.ts`
- Create: `web-ui/src/hooks/marketTrend/useMarketTrend.ts`
- Create: `web-ui/src/pages/MarketTrendPage.tsx`

### Step 1: 创建 API 客户端

`web-ui/src/api/marketTrend.ts`:

```typescript
import { http } from './http'

export interface TrendPoint {
  date: string
  avg_price: number
  median_price: number
  min_price: number
  max_price: number
  count: number
}

export interface MarketTrendResponse {
  keyword: string
  days: number
  trend: TrendPoint[]
}

export async function getMarketTrend(keyword: string, days: number = 30): Promise<MarketTrendResponse> {
  return http('/api/results/market-trend', { params: { keyword, days } })
}
```

### Step 2: 创建 Hook

`web-ui/src/hooks/marketTrend/useMarketTrend.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import * as api from '@/api/marketTrend'
import type { MarketTrendResponse } from '@/api/marketTrend'

export function useMarketTrend() {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)
  const [days, setDays] = useState(30)
  const [data, setData] = useState<MarketTrendResponse | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchKeywords = useCallback(async () => {
    try {
      const res = await import('@/api/results').then(m => m.getKeywords())
      setKeywords(res)
      if (!selectedKeyword && res.length > 0) setSelectedKeyword(res[0])
    } catch (e) { console.error(e) }
  }, [])

  const fetchTrend = useCallback(async () => {
    if (!selectedKeyword) return
    setIsLoading(true)
    try {
      const result = await api.getMarketTrend(selectedKeyword, days)
      setData(result)
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }, [selectedKeyword, days])

  useEffect(() => { fetchKeywords() }, [fetchKeywords])
  useEffect(() => { fetchTrend() }, [fetchTrend])

  return { keywords, selectedKeyword, setSelectedKeyword, days, setDays, data, isLoading, refresh: fetchTrend }
}
```

### Step 3: 创建页面

`web-ui/src/pages/MarketTrendPage.tsx`:

页面布局：
- **顶部**：品类选择器（Select）+ 时间范围切换（30天/60天/90天 Tab按钮）
- **主体**：折线图（LineChart from recharts）
  - 4 条线：平均价（蓝色实线）、中位价（绿色实线）、最低价（灰色虚线）、最高价（灰色虚线）
  - X轴：日期，Y轴：价格
  - Tooltip 显示详情
- **底部**：日期对应的商品数量柱状图

### Step 4: 注册路由和侧边栏

`routes.tsx` 添加 `/market-trend`。
`SidebarNav.tsx` 的"价格管理"分组添加"行情走势"。

### Step 5: 提交

```bash
git add web-ui/src/api/marketTrend.ts web-ui/src/hooks/marketTrend/useMarketTrend.ts web-ui/src/pages/MarketTrendPage.tsx
git commit -m "feat(frontend): add market trend page with multi-line price chart"
```

---

## Task 6: 前端 — 竞品观察页面

**Files:**
- Create: `web-ui/src/api/competitor.ts`
- Create: `web-ui/src/hooks/competitor/useCompetitor.ts`
- Create: `web-ui/src/pages/CompetitorPage.tsx`

### Step 1: 创建 API 客户端

`web-ui/src/api/competitor.ts`:

```typescript
import { http } from './http'

export interface SellerItem {
  title: string
  price: number
  item_link: string
  crawl_time: string
}

export interface SellerData {
  seller_name: string
  item_count: number
  avg_price: number
  min_price: number
  max_price: number
  items: SellerItem[]
}

export interface CompetitorAnalysis {
  keyword: string
  total_sellers: number
  total_items: number
  sellers: SellerData[]
  price_stats: { avg: number; min: number; max: number }
}

export async function getCompetitorAnalysis(keyword: string): Promise<CompetitorAnalysis> {
  return http('/api/results/competitor-analysis', { params: { keyword } })
}
```

### Step 2: 创建 Hook

`web-ui/src/hooks/competitor/useCompetitor.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import * as api from '@/api/competitor'
import type { CompetitorAnalysis } from '@/api/competitor'

export function useCompetitor() {
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null)
  const [data, setData] = useState<CompetitorAnalysis | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchKeywords = useCallback(async () => {
    try {
      const res = await import('@/api/results').then(m => m.getKeywords())
      setKeywords(res)
      if (!selectedKeyword && res.length > 0) setSelectedKeyword(res[0])
    } catch (e) { console.error(e) }
  }, [])

  const fetchData = useCallback(async () => {
    if (!selectedKeyword) return
    setIsLoading(true)
    try {
      const result = await api.getCompetitorAnalysis(selectedKeyword)
      setData(result)
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }, [selectedKeyword])

  useEffect(() => { fetchKeywords() }, [fetchKeywords])
  useEffect(() => { fetchData() }, [fetchData])

  return { keywords, selectedKeyword, setSelectedKeyword, data, isLoading, refresh: fetchData }
}
```

### Step 3: 创建页面

`web-ui/src/pages/CompetitorPage.tsx`:

页面布局：
- **顶部**：品类选择器 + 统计（总卖家数、总商品数、均价）
- **主体上半**：卖家定价分布表格
  | 卖家昵称 | 在售数量 | 均价 | 最低价 | 最高价 | 价差 |
  - 可展开查看该卖家具体商品
- **主体下半**：价格分布直方图（可复用溢价地图的分布组件逻辑）

### Step 4: 注册路由和侧边栏

`routes.tsx` 添加 `/competitor`。
`SidebarNav.tsx` 的"价格管理"分组添加"竞品观察"。

### Step 5: 提交

```bash
git add web-ui/src/api/competitor.ts web-ui/src/hooks/competitor/useCompetitor.ts web-ui/src/pages/CompetitorPage.tsx
git commit -m "feat(frontend): add competitor analysis page with seller breakdown"
```

---

## Task 7: ResultsPage 增强

**Files:**
- Modify: `web-ui/src/pages/ResultsPage.tsx`

**目标:** 按设计文档增加 3 个功能：
1. 每个商品卡片显示预估利润
2. 新增列表视图（表格模式），与卡片视图可切换
3. 新增"加入采购"操作

### Step 1: 添加利润显示和加入采购

在 `ResultCard` 组件中：
- CardContent 区域添加预估利润显示（需调用 PriceBook evaluate）
- CardFooter 添加"加入采购"按钮

### Step 2: 添加视图切换

在筛选栏添加视图切换按钮组（卡片视图 / 表格视图）。
表格视图使用 Table 组件，列：商品标题、售价、溢价率、AI建议、预估利润、操作。

### Step 3: 加入采购功能

导入 `createPurchase` from `@/api/purchases`，在操作按钮点击时调用：

```typescript
import { createPurchase } from '@/api/purchases'

const handleAddToPurchase = async (item: ResultItem) => {
  const info = item.商品信息
  await createPurchase({
    item_id: info.商品ID,
    title: info.商品标题,
    price: parsePriceNumber(info.当前售价),
    image_url: info.商品主图链接 || '',
    item_link: info.商品链接 || '',
    platform: item.platform || 'xianyu',
    keyword: item.搜索关键字 || '',
  })
  toast({ title: '已加入采购清单' })
}
```

### Step 4: 构建验证

```bash
cd web-ui && pnpm run build
```

### Step 5: 提交

```bash
git add web-ui/src/pages/ResultsPage.tsx
git commit -m "feat(frontend): enhance ResultsPage with profit display, list view and purchase action"
```

---

## Task 8: DashboardPage 经营驾驶舱改造

**Files:**
- Modify: `web-ui/src/pages/DashboardPage.tsx`
- Modify: `web-ui/src/hooks/dashboard/useDashboard.ts`
- Modify: `web-ui/src/api/dashboard.ts`

**目标:** 按设计文档改造仪表盘为以利润为核心的经营驾驶舱

### Step 1: 更新 dashboard API 调用

在 `web-ui/src/api/dashboard.ts` 添加：

```typescript
export async function fetchProfitSummary(): Promise<any> {
  return http('/api/profit/summary')
}
export async function fetchDailyProfit(days?: number): Promise<any> {
  return http('/api/profit/daily-trend', { params: { days } })
}
export async function fetchInventorySummary(): Promise<any> {
  return http('/api/inventory/summary')
}
export async function fetchAgingAlerts(days?: number): Promise<any> {
  return http('/api/inventory/aging-alerts', { params: { days } })
}
export async function fetchTeamPerformance(): Promise<any> {
  return http('/api/team/performance')
}
export async function fetchProfitByKeyword(): Promise<any> {
  return http('/api/profit/by-keyword')
}
```

### Step 2: 更新 useDashboard hook

添加利润、库存、团队数据的状态和加载逻辑。

### Step 3: 改造 DashboardPage 布局

按设计文档四行布局：
- **第一行**：6 个核心指标卡片（今日新发现、可收商品、本月营收、本月利润、利润率、库存货值）
- **第二行**：左 利润趋势图（LineChart）、右 品类利润排行（BarChart）
- **第三行**：左 今日捡漏 TOP 10、右 库龄预警
- **第四行**：左 团队业绩排行、右 品类行情速报

### Step 4: 构建验证

```bash
cd web-ui && pnpm run build
```

### Step 5: 提交

```bash
git add web-ui/src/pages/DashboardPage.tsx web-ui/src/hooks/dashboard/useDashboard.ts web-ui/src/api/dashboard.ts
git commit -m "feat(frontend): redesign dashboard as profit-driven operations cockpit"
```

---

## Task 9: 路由与侧边栏最终统一

**Files:**
- Modify: `web-ui/src/app/routes.tsx`
- Modify: `web-ui/src/components/layout/Sidebar/SidebarNav.tsx`

### Step 1: 确保路由完整

routes.tsx 应包含以下所有路由：

```
/dashboard          → DashboardPage
/bargain-radar      → BargainRadarPage
/premium-map        → PremiumMapPage       ← 新增
/results            → ResultsPage
/price-book         → PriceBookPage
/market-trend       → MarketTrendPage      ← 新增
/competitor         → CompetitorPage       ← 新增
/purchases          → PurchasesPage
/inventory          → InventoryPage
/profit             → ProfitPage
/team               → TeamPage
/tasks              → TasksPage
/accounts           → AccountsPage
/alerts             → AlertsPage
/logs               → LogsPage
/settings           → SettingsPage
```

### Step 2: 确保侧边栏完整

```
📊 总览
   └─ 仪表盘            /dashboard

🔍 发现商品
   ├─ 捡漏雷达          /bargain-radar
   ├─ 溢价地图          /premium-map         ← 新增
   └─ 全部结果          /results

💰 价格管理
   ├─ 价格本            /price-book
   ├─ 行情走势          /market-trend        ← 新增
   └─ 竞品观察          /competitor          ← 新增

📦 交易管理
   ├─ 采购清单          /purchases
   ├─ 库存台账          /inventory
   └─ 利润核算          /profit

👥 团队
   └─ 团队工作台        /team

⚙️ 系统
   ├─ 任务管理          /tasks
   ├─ 账号管理          /accounts
   ├─ 智能提醒          /alerts
   ├─ 运行日志          /logs
   └─ 系统设置          /settings
```

图标建议：
- 溢价地图: `Map` from lucide-react
- 行情走势: `TrendingUp` from lucide-react
- 竞品观察: `Eye` from lucide-react

### Step 3: 构建验证

```bash
cd web-ui && pnpm run build
```

Expected: 0 errors, 所有页面 chunk 正常生成

### Step 4: 完整功能验证

```bash
# 后端
uv run uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload

# 验证所有 API
curl -s http://localhost:8000/api/results/premium-map/overview
curl -s "http://localhost:8000/api/results/market-trend?keyword=科比手办&days=30"
curl -s "http://localhost:8000/api/results/competitor-analysis?keyword=科比手办"
curl -s http://localhost:8000/api/profit/summary
curl -s http://localhost:8000/api/inventory/summary
curl -s http://localhost:8000/api/team/performance
```

Expected: 所有接口返回 JSON，无 500 错误

### Step 5: 提交

```bash
git add web-ui/src/app/routes.tsx web-ui/src/components/layout/Sidebar/SidebarNav.tsx
git commit -m "feat: complete all 15 pages routing and sidebar navigation"
```

---

## 完整验收清单

对照设计文档逐项检查：

### 页面（15 个）
- [ ] 仪表盘（经营驾驶舱） — Task 8
- [ ] 捡漏雷达 — 已完成
- [ ] 溢价地图 — Task 4
- [ ] 全部结果（增强版） — Task 7
- [ ] 价格本 — 已完成
- [ ] 行情走势 — Task 5
- [ ] 竞品观察 — Task 6
- [ ] 采购清单 — 已完成
- [ ] 库存台账 — 已完成
- [ ] 利润核算 — 已完成
- [ ] 团队工作台 — 已完成
- [ ] 任务管理 — 保留不变
- [ ] 账号管理 — 保留不变
- [ ] 智能提醒 — 保留不变
- [ ] 运行日志 — 保留不变
- [ ] 系统设置 — 保留不变

### 后端 API
- [ ] /api/results/premium-map/overview — Task 1
- [ ] /api/results/premium-map/distribution — Task 1
- [ ] /api/results/market-trend — Task 2
- [ ] /api/results/competitor-analysis — Task 3

### 前端改造
- [ ] ResultsPage 加入采购 + 列表视图 + 利润显示 — Task 7
- [ ] DashboardPage 利润驾驶舱 — Task 8

### 侧边栏
- [ ] 完整 6 分组 15 个菜单项 — Task 9
