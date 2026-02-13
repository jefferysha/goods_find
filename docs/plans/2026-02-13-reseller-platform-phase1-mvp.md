# 二手倒卖平台 Phase 1 MVP 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现核心定价引擎 + 捡漏雷达 + 采购清单的完整闭环，让团队能立即开始使用系统发现好货并管理采购

**Architecture:** 
- 后端已有 PriceBookService、PurchaseService 等核心服务，需补充 API 路由和前端集成
- 前端新建 3 个页面：价格本管理、捡漏雷达、采购清单
- 数据流：价格本定义模板 → 爬虫抓取商品 → 自动计算利润 → 捡漏雷达展示 → 加入采购清单

**Tech Stack:** FastAPI, React 18, TypeScript, SQLite, Recharts, shadcn/ui

**Parallel Execution Groups:**
- Group A: 后端 API 路由（Task 1-3 可并发）
- Group B: 前端页面（Task 4-6 可并发，依赖 Group A 完成）
- Group C: 集成测试（Task 7-8 串行，依赖 A+B）

---

## Task 1: 价格本 API 路由

**Files:**
- Create: `src/api/routes/price_book.py`
- Test: `tests/api/test_price_book_api.py`

**依赖:** 已有 `PriceBookService` (src/services/price_book_service.py)

### Step 1: 编写 API 路由测试

创建 `tests/api/test_price_book_api.py`:

```python
import pytest
from httpx import AsyncClient
from src.app import app


@pytest.mark.asyncio
async def test_create_price_book_entry():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/price-book/", json={
            "category_name": "MacBook Pro M2 14寸",
            "keywords": ["MacBook Pro M2", "MacBook Pro 14"],
            "new_price": 14999,
            "market_price": 9500,
            "target_sell_price": 10000,
            "fees": {
                "shipping_fee": 30,
                "refurbish_fee": 100,
                "platform_fee_rate": 0.05,
                "other_fee": 0
            },
            "min_profit_rate": 0.15,
            "ideal_profit_rate": 0.25
        })
        assert response.status_code == 200
        data = response.json()
        assert data["category_name"] == "MacBook Pro M2 14寸"
        assert "id" in data
        assert "purchase_range" in data
        assert len(data["purchase_range"]) == 2


@pytest.mark.asyncio
async def test_get_all_price_book_entries():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/price-book/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


@pytest.mark.asyncio
async def test_evaluate_items():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # First create a price book entry
        await client.post("/api/price-book/", json={
            "category_name": "测试品类",
            "keywords": ["测试关键词"],
            "new_price": 5000,
            "market_price": 3000,
            "target_sell_price": 3500,
            "fees": {"shipping_fee": 20, "refurbish_fee": 50, "platform_fee_rate": 0.05},
            "min_profit_rate": 0.15,
            "ideal_profit_rate": 0.25
        })
        
        # Then evaluate items
        response = await client.post("/api/price-book/evaluate", json={
            "items": [
                {"keyword": "测试关键词", "price": 2000},
                {"keyword": "测试关键词", "price": 2500}
            ]
        })
        assert response.status_code == 200
        results = response.json()
        assert len(results) == 2
        assert "evaluation" in results[0]
        assert results[0]["evaluation"]["status"] in ["great_deal", "good_deal", "overpriced"]
```

### Step 2: 运行测试验证失败

```bash
cd /Users/jiayin/Documents/code_manager/h-backend/ai-goofish-monitor
uv run pytest tests/api/test_price_book_api.py -v
```

**Expected:** FAIL - 404 Not Found (路由不存在)

### Step 3: 实现 API 路由

创建 `src/api/routes/price_book.py`:

```python
"""价格本 API 路由"""
from fastapi import APIRouter, HTTPException
from typing import List
from src.services.price_book_service import PriceBookService
from src.domain.models.price_book import PriceBookCreate, PriceBookUpdate, PriceBookBatchUpdate

router = APIRouter(prefix="/api/price-book", tags=["price_book"])
service = PriceBookService()


@router.get("/")
async def get_all_entries():
    """获取所有价格本条目"""
    return await service.get_all()


@router.get("/{entry_id}")
async def get_entry(entry_id: str):
    """获取单个价格本条目"""
    entry = await service.get_by_id(entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="价格本条目不存在")
    return entry


@router.post("/")
async def create_entry(data: PriceBookCreate):
    """创建价格本条目"""
    return await service.create(data.dict())


@router.put("/{entry_id}")
async def update_entry(entry_id: str, data: PriceBookUpdate):
    """更新价格本条目"""
    result = await service.update(entry_id, data.dict(exclude_unset=True))
    if not result:
        raise HTTPException(status_code=404, detail="价格本条目不存在")
    return result


@router.delete("/{entry_id}")
async def delete_entry(entry_id: str):
    """删除价格本条目"""
    success = await service.delete(entry_id)
    if not success:
        raise HTTPException(status_code=404, detail="价格本条目不存在")
    return {"message": "删除成功"}


@router.post("/batch-update")
async def batch_update(data: PriceBookBatchUpdate):
    """批量更新价格本条目"""
    count = await service.batch_update(data.ids, data.dict(exclude={"ids"}, exclude_unset=True))
    return {"updated_count": count}


@router.post("/evaluate")
async def evaluate_items(data: dict):
    """批量评估商品"""
    items = data.get("items", [])
    if not items:
        raise HTTPException(status_code=400, detail="items 不能为空")
    return await service.evaluate_items_batch(items)


@router.post("/auto-update-market-prices")
async def auto_update_market_prices():
    """自动更新所有行情价"""
    await service.auto_update_market_prices()
    return {"message": "行情价更新完成"}
```

### Step 4: 注册路由到 app

修改 `src/app.py`，在路由注册部分添加:

```python
from src.api.routes import price_book

app.include_router(price_book.router)
```

### Step 5: 运行测试验证通过

```bash
uv run pytest tests/api/test_price_book_api.py -v
```

**Expected:** PASS (3/3 tests)

### Step 6: 提交

```bash
git add src/api/routes/price_book.py tests/api/test_price_book_api.py src/app.py
git commit -m "feat(api): add price book API routes with tests"
```

---

## Task 2: 采购清单 API 路由

**Files:**
- Create: `src/api/routes/purchases.py`
- Test: `tests/api/test_purchases_api.py`

**依赖:** 已有 `PurchaseService` (src/services/purchase_service.py)

### Step 1: 编写 API 路由测试

创建 `tests/api/test_purchases_api.py`:

```python
import pytest
from httpx import AsyncClient
from src.app import app


@pytest.mark.asyncio
async def test_create_purchase_item():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/api/purchases/", json={
            "item_id": "test_item_001",
            "title": "MacBook Pro M2 14寸 95新",
            "price": 7200,
            "platform": "xianyu",
            "keyword": "MacBook Pro M2",
            "item_link": "https://example.com/item/001",
            "estimated_profit": 2170,
            "estimated_profit_rate": 30.1
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "MacBook Pro M2 14寸 95新"
        assert data["status"] == "new"


@pytest.mark.asyncio
async def test_get_purchase_list():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/purchases/")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data


@pytest.mark.asyncio
async def test_update_purchase_status():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create first
        create_resp = await client.post("/api/purchases/", json={
            "item_id": "test_002",
            "title": "Test Item",
            "price": 1000,
            "keyword": "test"
        })
        item_id = create_resp.json()["id"]
        
        # Update status
        response = await client.put(f"/api/purchases/{item_id}", json={
            "status": "contacting",
            "assignee": "张三"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "contacting"
        assert data["assignee"] == "张三"


@pytest.mark.asyncio
async def test_mark_purchased():
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Create
        create_resp = await client.post("/api/purchases/", json={
            "item_id": "test_003",
            "title": "Test Item",
            "price": 1500,
            "keyword": "test"
        })
        item_id = create_resp.json()["id"]
        
        # Mark as purchased
        response = await client.post(f"/api/purchases/{item_id}/mark-purchased", json={
            "actual_price": 1400
        })
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "已标记为已收货，商品已进入库存"
```

### Step 2: 运行测试验证失败

```bash
uv run pytest tests/api/test_purchases_api.py -v
```

**Expected:** FAIL - 404 Not Found

### Step 3: 实现 API 路由

创建 `src/api/routes/purchases.py`:

```python
"""采购清单 API 路由"""
from fastapi import APIRouter, HTTPException, Query
from src.services.purchase_service import PurchaseService
from src.domain.models.purchase_item import PurchaseItemCreate, PurchaseItemUpdate

router = APIRouter(prefix="/api/purchases", tags=["purchases"])
service = PurchaseService()


@router.get("/")
async def get_purchase_list(
    status: str = Query(None),
    assignee: str = Query(None),
    keyword: str = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """获取采购清单"""
    return await service.get_list(
        status=status,
        assignee=assignee,
        keyword=keyword,
        page=page,
        limit=limit
    )


@router.get("/{item_id}")
async def get_purchase_item(item_id: str):
    """获取单个采购项"""
    item = await service.get_by_id(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="采购项不存在")
    return item


@router.post("/")
async def create_purchase_item(data: PurchaseItemCreate):
    """创建采购项（从结果页/捡漏雷达加入）"""
    return await service.create(data.dict())


@router.put("/{item_id}")
async def update_purchase_item(item_id: str, data: PurchaseItemUpdate):
    """更新采购项（状态、负责人等）"""
    result = await service.update(item_id, data.dict(exclude_unset=True))
    if not result:
        raise HTTPException(status_code=404, detail="采购项不存在")
    return result


@router.delete("/{item_id}")
async def delete_purchase_item(item_id: str):
    """删除采购项"""
    success = await service.delete(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="采购项不存在")
    return {"message": "删除成功"}


@router.post("/{item_id}/mark-purchased")
async def mark_as_purchased(item_id: str, data: dict):
    """标记为已收货（自动进入库存）"""
    actual_price = data.get("actual_price")
    if actual_price is None:
        raise HTTPException(status_code=400, detail="actual_price 必填")
    
    result = await service.mark_purchased(item_id, actual_price)
    if not result:
        raise HTTPException(status_code=404, detail="采购项不存在")
    return {"message": "已标记为已收货，商品已进入库存", "inventory_id": result}


@router.post("/batch-assign")
async def batch_assign(data: dict):
    """批量分配负责人"""
    ids = data.get("ids", [])
    assignee = data.get("assignee")
    if not ids or not assignee:
        raise HTTPException(status_code=400, detail="ids 和 assignee 必填")
    
    count = await service.batch_assign(ids, assignee)
    return {"updated_count": count}


@router.get("/stats/summary")
async def get_purchase_stats():
    """获取采购清单统计"""
    return await service.get_stats()
```

### Step 4: 注册路由

修改 `src/app.py`:

```python
from src.api.routes import purchases

app.include_router(purchases.router)
```

### Step 5: 运行测试验证通过

```bash
uv run pytest tests/api/test_purchases_api.py -v
```

**Expected:** PASS (4/4 tests)

### Step 6: 提交

```bash
git add src/api/routes/purchases.py tests/api/test_purchases_api.py src/app.py
git commit -m "feat(api): add purchases API routes with tests"
```

---

## Task 3: 捡漏雷达后端逻辑

**Files:**
- Modify: `src/api/routes/results.py`
- Modify: `src/infrastructure/persistence/item_repository.py`
- Test: `tests/api/test_bargain_radar.py`

**目标:** 在现有 results API 基础上增加自动评估和筛选功能

### Step 1: 编写捡漏雷达测试

创建 `tests/api/test_bargain_radar.py`:

```python
import pytest
from httpx import AsyncClient
from src.app import app


@pytest.mark.asyncio
async def test_get_bargain_radar():
    """测试捡漏雷达接口"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/results/bargain-radar")
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "items" in data
        assert "total" in data.get("summary", {})


@pytest.mark.asyncio
async def test_bargain_radar_filters():
    """测试捡漏雷达筛选"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get("/api/results/bargain-radar", params={
            "status": "good_deal",
            "min_profit_rate": 20,
            "sort_by": "profit",
            "sort_order": "desc"
        })
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        # Verify sorted by profit descending
        if len(items) >= 2:
            assert items[0].get("evaluation", {}).get("profit", 0) >= \
                   items[1].get("evaluation", {}).get("profit", 0)
```

### Step 2: 运行测试验证失败

```bash
uv run pytest tests/api/test_bargain_radar.py -v
```

**Expected:** FAIL - 404 Not Found

### Step 3: 实现捡漏雷达接口

修改 `src/api/routes/results.py`，添加:

```python
from src.services.price_book_service import PriceBookService

price_book_service = PriceBookService()


@router.get("/bargain-radar")
async def get_bargain_radar(
    keyword: str = Query(None),
    platform: str = Query(None),
    status: str = Query(None),  # great_deal / good_deal / overpriced
    min_profit_rate: float = Query(None),
    sort_by: str = Query("profit_rate"),  # profit / profit_rate / crawl_time
    sort_order: str = Query("desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200)
):
    """
    捡漏雷达 - 显示所有值得收购的商品
    默认按利润率降序排列
    """
    # 1. 获取所有商品
    all_items_data = await item_repo.query(
        keyword=keyword,
        page=1,
        limit=10000,  # Get all
        sort_by="crawl_time",
        sort_order="desc"
    )
    all_items = all_items_data.get("items", [])
    
    # 2. 批量评估
    evaluated = await price_book_service.evaluate_items_batch(all_items)
    
    # 3. 筛选
    filtered = []
    for result in evaluated:
        eval_data = result.get("evaluation", {})
        item_status = eval_data.get("status")
        profit_rate = eval_data.get("profit_rate", 0)
        
        # 平台筛选
        if platform and result["item"].get("platform") != platform:
            continue
        
        # 状态筛选
        if status and item_status != status:
            continue
        
        # 利润率筛选
        if min_profit_rate is not None and profit_rate < min_profit_rate:
            continue
        
        # 合并商品和评估数据
        merged = {**result["item"], "evaluation": eval_data}
        filtered.append(merged)
    
    # 4. 排序
    sort_key_map = {
        "profit": lambda x: x.get("evaluation", {}).get("profit", 0),
        "profit_rate": lambda x: x.get("evaluation", {}).get("profit_rate", 0),
        "crawl_time": lambda x: x.get("爬取时间", ""),
    }
    sort_key = sort_key_map.get(sort_by, sort_key_map["profit_rate"])
    filtered.sort(key=sort_key, reverse=(sort_order == "desc"))
    
    # 5. 分页
    total = len(filtered)
    start = (page - 1) * limit
    end = start + limit
    paginated = filtered[start:end]
    
    # 6. 汇总统计
    good_deals = [x for x in filtered if x.get("evaluation", {}).get("status") in ["great_deal", "good_deal"]]
    total_profit = sum(x.get("evaluation", {}).get("profit", 0) for x in good_deals)
    
    summary = {
        "total": total,
        "good_deals_count": len(good_deals),
        "estimated_total_profit": round(total_profit, 2),
        "avg_profit_rate": round(
            sum(x.get("evaluation", {}).get("profit_rate", 0) for x in good_deals) / len(good_deals)
            if good_deals else 0,
            2
        )
    }
    
    return {
        "summary": summary,
        "items": paginated,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }
```

### Step 4: 运行测试验证通过

```bash
uv run pytest tests/api/test_bargain_radar.py -v
```

**Expected:** PASS (2/2 tests)

### Step 5: 提交

```bash
git add src/api/routes/results.py tests/api/test_bargain_radar.py
git commit -m "feat(api): add bargain radar endpoint with filtering"
```

---

## Task 4: 前端 - 价格本管理页面

**Files:**
- Create: `web-ui/src/pages/PriceBookPage.tsx`
- Create: `web-ui/src/api/priceBook.ts`
- Create: `web-ui/src/hooks/priceBook/usePriceBook.ts`
- Create: `web-ui/src/types/priceBook.d.ts`

**依赖:** Task 1 完成（API 路由）

### Step 1: 定义类型

创建 `web-ui/src/types/priceBook.d.ts`:

```typescript
export interface FeeTemplate {
  shipping_fee: number
  refurbish_fee: number
  platform_fee_rate: number
  other_fee: number
}

export interface PriceBookEntry {
  id: string
  category_name: string
  keywords: string[]
  new_price?: number
  market_price?: number
  market_price_source: 'manual' | 'auto_7d_median'
  target_sell_price?: number
  fees: FeeTemplate
  min_profit_rate: number
  ideal_profit_rate: number
  platform: string
  note: string
  created_at: string
  updated_at: string
  // 计算字段
  total_fees?: number
  purchase_ideal?: number
  purchase_upper?: number
  purchase_range?: [number | null, number | null]
}

export interface PriceBookCreate {
  category_name: string
  keywords: string[]
  new_price?: number
  market_price?: number
  market_price_source?: 'manual' | 'auto_7d_median'
  target_sell_price?: number
  fees?: FeeTemplate
  min_profit_rate?: number
  ideal_profit_rate?: number
  platform?: string
  note?: string
}

export interface PriceBookUpdate extends Partial<PriceBookCreate> {}
```

### Step 2: 创建 API 客户端

创建 `web-ui/src/api/priceBook.ts`:

```typescript
import { http } from './http'
import type { PriceBookEntry, PriceBookCreate, PriceBookUpdate } from '@/types/priceBook'

export async function getAllPriceBookEntries(): Promise<PriceBookEntry[]> {
  return await http('/api/price-book/')
}

export async function getPriceBookEntry(id: string): Promise<PriceBookEntry> {
  return await http(`/api/price-book/${id}`)
}

export async function createPriceBookEntry(data: PriceBookCreate): Promise<PriceBookEntry> {
  return await http('/api/price-book/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updatePriceBookEntry(id: string, data: PriceBookUpdate): Promise<PriceBookEntry> {
  return await http(`/api/price-book/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deletePriceBookEntry(id: string): Promise<void> {
  await http(`/api/price-book/${id}`, { method: 'DELETE' })
}

export async function batchUpdatePriceBook(ids: string[], data: Partial<PriceBookUpdate>): Promise<{ updated_count: number }> {
  return await http('/api/price-book/batch-update', {
    method: 'POST',
    body: JSON.stringify({ ids, ...data }),
  })
}

export async function autoUpdateMarketPrices(): Promise<{ message: string }> {
  return await http('/api/price-book/auto-update-market-prices', { method: 'POST' })
}
```

### Step 3: 创建 Hook

创建 `web-ui/src/hooks/priceBook/usePriceBook.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import type { PriceBookEntry, PriceBookCreate, PriceBookUpdate } from '@/types/priceBook'
import * as api from '@/api/priceBook'

export function usePriceBook() {
  const [entries, setEntries] = useState<PriceBookEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchEntries = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.getAllPriceBookEntries()
      setEntries(data)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createEntry = useCallback(async (data: PriceBookCreate) => {
    const entry = await api.createPriceBookEntry(data)
    await fetchEntries()
    return entry
  }, [fetchEntries])

  const updateEntry = useCallback(async (id: string, data: PriceBookUpdate) => {
    const entry = await api.updatePriceBookEntry(id, data)
    await fetchEntries()
    return entry
  }, [fetchEntries])

  const deleteEntry = useCallback(async (id: string) => {
    await api.deletePriceBookEntry(id)
    await fetchEntries()
  }, [fetchEntries])

  const batchUpdate = useCallback(async (ids: string[], data: Partial<PriceBookUpdate>) => {
    const result = await api.batchUpdatePriceBook(ids, data)
    await fetchEntries()
    return result
  }, [fetchEntries])

  const autoUpdatePrices = useCallback(async () => {
    const result = await api.autoUpdateMarketPrices()
    await fetchEntries()
    return result
  }, [fetchEntries])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  return {
    entries,
    isLoading,
    error,
    fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    batchUpdate,
    autoUpdatePrices,
  }
}
```

### Step 4: 创建页面组件

创建 `web-ui/src/pages/PriceBookPage.tsx`:

```typescript
import { useState } from 'react'
import { usePriceBook } from '@/hooks/priceBook/usePriceBook'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PriceBookEntry, PriceBookCreate } from '@/types/priceBook'

export default function PriceBookPage() {
  const { entries, isLoading, createEntry, updateEntry, deleteEntry, autoUpdatePrices } = usePriceBook()
  const { toast } = useToast()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PriceBookEntry | null>(null)
  const [formData, setFormData] = useState<Partial<PriceBookCreate>>({})

  const handleCreate = async () => {
    try {
      await createEntry(formData as PriceBookCreate)
      toast({ title: '创建成功' })
      setIsCreateOpen(false)
      setFormData({})
    } catch (e) {
      toast({ title: '创建失败', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const handleAutoUpdate = async () => {
    try {
      await autoUpdatePrices()
      toast({ title: '行情价自动更新成功' })
    } catch (e) {
      toast({ title: '更新失败', description: (e as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">价格本管理</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAutoUpdate}>
            自动更新行情价
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>新建品类</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">加载中...</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>品类名称</TableHead>
                <TableHead>关键词</TableHead>
                <TableHead>新品参考价</TableHead>
                <TableHead>二手行情价</TableHead>
                <TableHead>目标出货价</TableHead>
                <TableHead>收购区间</TableHead>
                <TableHead>最低利润率</TableHead>
                <TableHead>理想利润率</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.category_name}</TableCell>
                  <TableCell>{entry.keywords.join(', ')}</TableCell>
                  <TableCell>¥{entry.new_price?.toFixed(0) || '-'}</TableCell>
                  <TableCell>¥{entry.market_price?.toFixed(0) || '-'}</TableCell>
                  <TableCell>¥{entry.target_sell_price?.toFixed(0) || '-'}</TableCell>
                  <TableCell>
                    {entry.purchase_range && entry.purchase_range[0] && entry.purchase_range[1]
                      ? `¥${entry.purchase_range[0].toFixed(0)} ~ ¥${entry.purchase_range[1].toFixed(0)}`
                      : '-'}
                  </TableCell>
                  <TableCell>{(entry.min_profit_rate * 100).toFixed(0)}%</TableCell>
                  <TableCell>{(entry.ideal_profit_rate * 100).toFixed(0)}%</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setEditingEntry(entry)}>
                      编辑
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog - 简化版，完整表单在实际实施时补充 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建品类</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">品类名称</Label>
              <Input
                className="col-span-3"
                value={formData.category_name || ''}
                onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
              />
            </div>
            {/* 其他字段省略，实施时补充 */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

### Step 5: 注册路由

修改 `web-ui/src/App.tsx` 或路由配置文件，添加:

```typescript
import PriceBookPage from '@/pages/PriceBookPage'

// In routes:
{
  path: '/price-book',
  element: <PriceBookPage />,
}
```

### Step 6: 手动测试

```bash
cd web-ui
pnpm run dev
```

访问 http://localhost:5173/price-book，验证:
- [ ] 表格能显示现有价格本条目
- [ ] 点击"新建品类"能打开弹窗
- [ ] 能成功创建新条目
- [ ] 收购区间自动计算正确

### Step 7: 提交

```bash
git add web-ui/src/pages/PriceBookPage.tsx web-ui/src/api/priceBook.ts web-ui/src/hooks/priceBook/usePriceBook.ts web-ui/src/types/priceBook.d.ts
git commit -m "feat(frontend): add price book management page"
```

---

## Task 5: 前端 - 捡漏雷达页面

**Files:**
- Create: `web-ui/src/pages/BargainRadarPage.tsx`
- Create: `web-ui/src/api/bargainRadar.ts`
- Create: `web-ui/src/hooks/bargainRadar/useBargainRadar.ts`

**依赖:** Task 3 完成（捡漏雷达 API）

### Step 1: 创建 API 客户端

创建 `web-ui/src/api/bargainRadar.ts`:

```typescript
import { http } from './http'
import type { ResultItem } from '@/types/result'

export interface BargainRadarFilters {
  keyword?: string
  platform?: string
  status?: 'great_deal' | 'good_deal' | 'overpriced'
  min_profit_rate?: number
  sort_by?: 'profit' | 'profit_rate' | 'crawl_time'
  sort_order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface ItemEvaluation {
  status: 'great_deal' | 'good_deal' | 'overpriced' | 'no_config'
  purchase_range: [number | null, number | null]
  profit: number
  profit_rate: number
  total_cost: number
  total_fees: number
  market_diff_pct?: number
  price_book_id?: string
  category_name?: string
}

export interface EvaluatedItem extends ResultItem {
  evaluation: ItemEvaluation
}

export interface BargainRadarResponse {
  summary: {
    total: number
    good_deals_count: number
    estimated_total_profit: number
    avg_profit_rate: number
  }
  items: EvaluatedItem[]
  page: number
  limit: number
  total_pages: number
}

export async function getBargainRadar(filters: BargainRadarFilters = {}): Promise<BargainRadarResponse> {
  return await http('/api/results/bargain-radar', { params: filters as Record<string, any> })
}
```

### Step 2: 创建 Hook

创建 `web-ui/src/hooks/bargainRadar/useBargainRadar.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import * as api from '@/api/bargainRadar'
import type { BargainRadarFilters, BargainRadarResponse, EvaluatedItem } from '@/api/bargainRadar'

export function useBargainRadar() {
  const [data, setData] = useState<BargainRadarResponse | null>(null)
  const [filters, setFilters] = useState<BargainRadarFilters>({
    sort_by: 'profit_rate',
    sort_order: 'desc',
    page: 1,
    limit: 50,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await api.getBargainRadar(filters)
      setData(result)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    filters,
    setFilters,
    isLoading,
    error,
    refresh: fetchData,
  }
}
```

### Step 3: 创建页面组件

创建 `web-ui/src/pages/BargainRadarPage.tsx`:

```typescript
import { useBargainRadar } from '@/hooks/bargainRadar/useBargainRadar'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  great_deal: { label: '超值捡漏', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  good_deal: { label: '可收', color: 'text-blue-600', bg: 'bg-blue-50' },
  overpriced: { label: '超出区间', color: 'text-red-600', bg: 'bg-red-50' },
  no_config: { label: '未配置', color: 'text-gray-600', bg: 'bg-gray-50' },
}

export default function BargainRadarPage() {
  const { data, filters, setFilters, isLoading, refresh } = useBargainRadar()

  const summary = data?.summary || {
    total: 0,
    good_deals_count: 0,
    estimated_total_profit: 0,
    avg_profit_rate: 0,
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">捡漏雷达</h1>
        <Button onClick={refresh} disabled={isLoading}>
          刷新
        </Button>
      </div>

      {/* 汇总条 */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">商品总数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">可收商品</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{summary.good_deals_count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">预估总利润</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">¥{summary.estimated_total_profit.toFixed(0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">平均利润率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.avg_profit_rate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选条 */}
      <div className="mb-6 flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) =>
            setFilters({ ...filters, status: value === 'all' ? undefined : (value as any), page: 1 })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="great_deal">超值捡漏</SelectItem>
            <SelectItem value="good_deal">可收</SelectItem>
            <SelectItem value="overpriced">超出区间</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.sort_by || 'profit_rate'}
          onValueChange={(value) => setFilters({ ...filters, sort_by: value as any, page: 1 })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="profit_rate">按利润率</SelectItem>
            <SelectItem value="profit">按利润金额</SelectItem>
            <SelectItem value="crawl_time">按爬取时间</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 商品表格 */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">加载中...</div>
      ) : data && data.items.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品标题</TableHead>
                <TableHead>平台</TableHead>
                <TableHead>售价</TableHead>
                <TableHead>收购区间</TableHead>
                <TableHead>预估利润</TableHead>
                <TableHead>利润率</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item, idx) => {
                const eval_data = item.evaluation
                const config = STATUS_CONFIG[eval_data.status]
                return (
                  <TableRow key={`${item.商品信息.商品ID}-${idx}`}>
                    <TableCell className="max-w-md">
                      <a
                        href={item.商品信息.商品链接}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-2 hover:text-blue-600"
                      >
                        {item.商品信息.商品标题}
                      </a>
                    </TableCell>
                    <TableCell>{item.platform || 'xianyu'}</TableCell>
                    <TableCell className="font-semibold">¥{item.商品信息.当前售价}</TableCell>
                    <TableCell>
                      {eval_data.purchase_range[0] && eval_data.purchase_range[1]
                        ? `¥${eval_data.purchase_range[0].toFixed(0)} ~ ¥${eval_data.purchase_range[1].toFixed(0)}`
                        : '-'}
                    </TableCell>
                    <TableCell className="font-semibold text-orange-600">¥{eval_data.profit.toFixed(0)}</TableCell>
                    <TableCell className="font-semibold">{eval_data.profit_rate.toFixed(1)}%</TableCell>
                    <TableCell>
                      <span className={cn('inline-flex rounded-full px-2 py-1 text-xs font-medium', config.bg, config.color)}>
                        {config.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="default" size="sm">
                        加入采购
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">暂无商品数据</div>
      )}
    </div>
  )
}
```

### Step 4: 注册路由

修改路由配置:

```typescript
import BargainRadarPage from '@/pages/BargainRadarPage'

{
  path: '/bargain-radar',
  element: <BargainRadarPage />,
}
```

### Step 5: 手动测试

访问 http://localhost:5173/bargain-radar，验证:
- [ ] 汇总数据正确显示
- [ ] 商品列表按利润率降序排列
- [ ] 筛选功能正常
- [ ] "加入采购"按钮可点击（功能在 Task 6 实现）

### Step 6: 提交

```bash
git add web-ui/src/pages/BargainRadarPage.tsx web-ui/src/api/bargainRadar.ts web-ui/src/hooks/bargainRadar/useBargainRadar.ts
git commit -m "feat(frontend): add bargain radar page with filtering"
```

---

## Task 6: 前端 - 采购清单页面

**Files:**
- Create: `web-ui/src/pages/PurchasesPage.tsx`
- Create: `web-ui/src/api/purchases.ts`
- Create: `web-ui/src/hooks/purchases/usePurchases.ts`
- Create: `web-ui/src/types/purchase.d.ts`
- Modify: `web-ui/src/pages/BargainRadarPage.tsx` (添加"加入采购"功能)

**依赖:** Task 2 完成（采购清单 API）

### Step 1: 定义类型

创建 `web-ui/src/types/purchase.d.ts`:

```typescript
export interface PurchaseItem {
  id: string
  item_id: string
  title: string
  price: number
  image_url: string
  item_link: string
  platform: string
  keyword: string
  price_book_id?: string
  estimated_profit?: number
  estimated_profit_rate?: number
  purchase_range_low?: number
  purchase_range_high?: number
  status: 'new' | 'contacting' | 'negotiating' | 'purchased' | 'abandoned'
  assignee?: string
  actual_price?: number
  note: string
  created_at: string
  updated_at: string
}

export interface PurchaseItemCreate {
  item_id?: string
  title: string
  price: number
  image_url?: string
  item_link?: string
  platform?: string
  keyword?: string
  price_book_id?: string
  estimated_profit?: number
  estimated_profit_rate?: number
  purchase_range_low?: number
  purchase_range_high?: number
  assignee?: string
  note?: string
}
```

### Step 2: 创建 API 客户端

创建 `web-ui/src/api/purchases.ts`:

```typescript
import { http } from './http'
import type { PurchaseItem, PurchaseItemCreate } from '@/types/purchase'

export interface PurchaseListFilters {
  status?: string
  assignee?: string
  keyword?: string
  page?: number
  limit?: number
}

export interface PurchaseListResponse {
  items: PurchaseItem[]
  total: number
}

export async function getPurchaseList(filters: PurchaseListFilters = {}): Promise<PurchaseListResponse> {
  return await http('/api/purchases/', { params: filters as Record<string, any> })
}

export async function createPurchaseItem(data: PurchaseItemCreate): Promise<PurchaseItem> {
  return await http('/api/purchases/', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updatePurchaseItem(id: string, data: Partial<PurchaseItem>): Promise<PurchaseItem> {
  return await http(`/api/purchases/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deletePurchaseItem(id: string): Promise<void> {
  await http(`/api/purchases/${id}`, { method: 'DELETE' })
}

export async function markAsPurchased(id: string, actualPrice: number): Promise<{ message: string; inventory_id: string }> {
  return await http(`/api/purchases/${id}/mark-purchased`, {
    method: 'POST',
    body: JSON.stringify({ actual_price: actualPrice }),
  })
}
```

### Step 3: 创建 Hook

创建 `web-ui/src/hooks/purchases/usePurchases.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react'
import * as api from '@/api/purchases'
import type { PurchaseListFilters, PurchaseListResponse } from '@/api/purchases'
import type { PurchaseItem, PurchaseItemCreate } from '@/types/purchase'

export function usePurchases() {
  const [data, setData] = useState<PurchaseListResponse>({ items: [], total: 0 })
  const [filters, setFilters] = useState<PurchaseListFilters>({
    page: 1,
    limit: 50,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await api.getPurchaseList(filters)
      setData(result)
    } catch (e) {
      setError(e as Error)
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  const createItem = useCallback(
    async (itemData: PurchaseItemCreate) => {
      const item = await api.createPurchaseItem(itemData)
      await fetchData()
      return item
    },
    [fetchData]
  )

  const updateItem = useCallback(
    async (id: string, data: Partial<PurchaseItem>) => {
      const item = await api.updatePurchaseItem(id, data)
      await fetchData()
      return item
    },
    [fetchData]
  )

  const deleteItem = useCallback(
    async (id: string) => {
      await api.deletePurchaseItem(id)
      await fetchData()
    },
    [fetchData]
  )

  const markPurchased = useCallback(
    async (id: string, actualPrice: number) => {
      const result = await api.markAsPurchased(id, actualPrice)
      await fetchData()
      return result
    },
    [fetchData]
  )

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    filters,
    setFilters,
    isLoading,
    error,
    refresh: fetchData,
    createItem,
    updateItem,
    deleteItem,
    markPurchased,
  }
}
```

### Step 4: 创建采购清单页面

创建 `web-ui/src/pages/PurchasesPage.tsx`:

```typescript
import { useState } from 'react'
import { usePurchases } from '@/hooks/purchases/usePurchases'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  new: { label: '新加入', color: 'text-blue-600', bg: 'bg-blue-50' },
  contacting: { label: '待联系', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  negotiating: { label: '议价中', color: 'text-orange-600', bg: 'bg-orange-50' },
  purchased: { label: '已收货', color: 'text-green-600', bg: 'bg-green-50' },
  abandoned: { label: '放弃', color: 'text-gray-600', bg: 'bg-gray-50' },
}

export default function PurchasesPage() {
  const { data, filters, setFilters, isLoading, updateItem, markPurchased, deleteItem } = usePurchases()
  const { toast } = useToast()
  const [purchasingItem, setPurchasingItem] = useState<string | null>(null)
  const [actualPrice, setActualPrice] = useState('')

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateItem(id, { status: status as any })
      toast({ title: '状态已更新' })
    } catch (e) {
      toast({ title: '更新失败', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const handleMarkPurchased = async () => {
    if (!purchasingItem) return
    const price = parseFloat(actualPrice)
    if (isNaN(price) || price <= 0) {
      toast({ title: '请输入有效价格', variant: 'destructive' })
      return
    }
    try {
      await markPurchased(purchasingItem, price)
      toast({ title: '已标记为已收货，商品已进入库存' })
      setPurchasingItem(null)
      setActualPrice('')
    } catch (e) {
      toast({ title: '操作失败', description: (e as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">采购清单</h1>
      </div>

      {/* 筛选条 */}
      <div className="mb-6 flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => setFilters({ ...filters, status: value === 'all' ? undefined : value, page: 1 })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="new">新加入</SelectItem>
            <SelectItem value="contacting">待联系</SelectItem>
            <SelectItem value="negotiating">议价中</SelectItem>
            <SelectItem value="purchased">已收货</SelectItem>
            <SelectItem value="abandoned">放弃</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 采购表格 */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">加载中...</div>
      ) : data.items.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>商品标题</TableHead>
                <TableHead>售价</TableHead>
                <TableHead>预估利润</TableHead>
                <TableHead>平台</TableHead>
                <TableHead>负责人</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>加入时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => {
                const config = STATUS_CONFIG[item.status]
                return (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-md">
                      <a href={item.item_link} target="_blank" rel="noopener noreferrer" className="line-clamp-2 hover:text-blue-600">
                        {item.title}
                      </a>
                    </TableCell>
                    <TableCell className="font-semibold">¥{item.price.toFixed(0)}</TableCell>
                    <TableCell className="font-semibold text-orange-600">
                      {item.estimated_profit !== undefined ? `¥${item.estimated_profit.toFixed(0)}` : '-'}
                    </TableCell>
                    <TableCell>{item.platform}</TableCell>
                    <TableCell>{item.assignee || '-'}</TableCell>
                    <TableCell>
                      <span className={cn('inline-flex rounded-full px-2 py-1 text-xs font-medium', config.bg, config.color)}>
                        {config.label}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Select value={item.status} onValueChange={(value) => handleStatusChange(item.id, value)}>
                          <SelectTrigger className="h-8 w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">新加入</SelectItem>
                            <SelectItem value="contacting">待联系</SelectItem>
                            <SelectItem value="negotiating">议价中</SelectItem>
                            <SelectItem value="abandoned">放弃</SelectItem>
                          </SelectContent>
                        </Select>
                        {item.status !== 'purchased' && (
                          <Button variant="default" size="sm" onClick={() => setPurchasingItem(item.id)}>
                            已收货
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="py-12 text-center text-muted-foreground">暂无采购项</div>
      )}

      {/* 标记已收货弹窗 */}
      <Dialog open={!!purchasingItem} onOpenChange={() => setPurchasingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>标记已收货</DialogTitle>
            <DialogDescription>请输入实际收购价，商品将自动进入库存管理</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">实际收购价</Label>
              <Input
                type="number"
                className="col-span-3"
                placeholder="实际成交价格"
                value={actualPrice}
                onChange={(e) => setActualPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurchasingItem(null)}>
              取消
            </Button>
            <Button onClick={handleMarkPurchased}>确认收货</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

### Step 5: 在捡漏雷达添加"加入采购"功能

修改 `web-ui/src/pages/BargainRadarPage.tsx`，添加导入:

```typescript
import { usePurchases } from '@/hooks/purchases/usePurchases'
import { useToast } from '@/hooks/use-toast'
```

在组件内添加:

```typescript
const { createItem } = usePurchases()
const { toast } = useToast()

const handleAddToPurchase = async (item: EvaluatedItem) => {
  try {
    await createItem({
      item_id: item.商品信息.商品ID,
      title: item.商品信息.商品标题,
      price: parseFloat(item.商品信息.当前售价.replace('¥', '').replace(',', '')) || 0,
      image_url: item.商品信息.商品主图链接 || '',
      item_link: item.商品信息.商品链接 || '',
      platform: item.platform || 'xianyu',
      keyword: item.搜索关键字 || '',
      estimated_profit: item.evaluation.profit,
      estimated_profit_rate: item.evaluation.profit_rate,
      purchase_range_low: item.evaluation.purchase_range[0] || undefined,
      purchase_range_high: item.evaluation.purchase_range[1] || undefined,
    })
    toast({ title: '已加入采购清单' })
  } catch (e) {
    toast({ title: '加入失败', description: (e as Error).message, variant: 'destructive' })
  }
}
```

修改表格中的"加入采购"按钮:

```typescript
<Button variant="default" size="sm" onClick={() => handleAddToPurchase(item)}>
  加入采购
</Button>
```

### Step 6: 注册路由

```typescript
import PurchasesPage from '@/pages/PurchasesPage'

{
  path: '/purchases',
  element: <PurchasesPage />,
}
```

### Step 7: 手动测试

测试完整流程:
1. 在捡漏雷达点击"加入采购" → 检查采购清单是否出现该商品
2. 在采购清单更改状态 → 验证状态更新
3. 点击"已收货"并填写实际价格 → 验证商品进入库存（Task 8 会检查）

### Step 8: 提交

```bash
git add web-ui/src/pages/PurchasesPage.tsx web-ui/src/api/purchases.ts web-ui/src/hooks/purchases/usePurchases.ts web-ui/src/types/purchase.d.ts web-ui/src/pages/BargainRadarPage.tsx
git commit -m "feat(frontend): add purchases page with status workflow"
```

---

## Task 7: 端到端集成测试

**Files:**
- Create: `tests/e2e/test_mvp_workflow.py`

**依赖:** Task 1-6 全部完成

### Step 1: 编写端到端测试

创建 `tests/e2e/test_mvp_workflow.py`:

```python
"""
Phase 1 MVP 完整流程测试
测试：价格本 → 爬虫 → 捡漏雷达 → 采购清单 的完整闭环
"""
import pytest
from httpx import AsyncClient
from src.app import app


@pytest.mark.asyncio
async def test_mvp_complete_workflow():
    """测试完整 MVP 工作流"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Step 1: 创建价格本条目
        price_book_resp = await client.post("/api/price-book/", json={
            "category_name": "测试笔记本",
            "keywords": ["测试笔记本"],
            "new_price": 10000,
            "market_price": 6000,
            "target_sell_price": 7000,
            "fees": {
                "shipping_fee": 30,
                "refurbish_fee": 100,
                "platform_fee_rate": 0.05,
                "other_fee": 0
            },
            "min_profit_rate": 0.15,
            "ideal_profit_rate": 0.25
        })
        assert price_book_resp.status_code == 200
        price_book_data = price_book_resp.json()
        assert "purchase_range" in price_book_data
        purchase_range = price_book_data["purchase_range"]
        
        # Step 2: 模拟商品数据（实际应该是爬虫抓取）
        # 这里直接插入 items 表
        from src.infrastructure.persistence.item_repository import ItemRepository
        repo = ItemRepository()
        
        test_item = {
            "搜索关键字": "测试笔记本",
            "爬取时间": "2026-02-13T10:00:00",
            "商品信息": {
                "商品ID": "test_item_mvp",
                "商品标题": "测试笔记本 95新",
                "当前售价": "¥4500",
                "商品链接": "https://example.com/test",
                "商品主图链接": "https://example.com/image.jpg"
            },
            "platform": "xianyu"
        }
        await repo.insert(test_item)
        
        # Step 3: 调用捡漏雷达，验证商品被正确评估
        radar_resp = await client.get("/api/results/bargain-radar", params={
            "keyword": "测试笔记本"
        })
        assert radar_resp.status_code == 200
        radar_data = radar_resp.json()
        assert radar_data["summary"]["total"] >= 1
        
        items = radar_data["items"]
        test_item_eval = next((x for x in items if x["商品信息"]["商品ID"] == "test_item_mvp"), None)
        assert test_item_eval is not None
        
        evaluation = test_item_eval["evaluation"]
        # 4500 应该在收购区间内（理想收购价 ~ 收购上限）
        assert evaluation["status"] in ["great_deal", "good_deal"]
        assert evaluation["profit"] > 0
        assert evaluation["profit_rate"] > 0
        
        # Step 4: 加入采购清单
        purchase_resp = await client.post("/api/purchases/", json={
            "item_id": "test_item_mvp",
            "title": "测试笔记本 95新",
            "price": 4500,
            "keyword": "测试笔记本",
            "estimated_profit": evaluation["profit"],
            "estimated_profit_rate": evaluation["profit_rate"]
        })
        assert purchase_resp.status_code == 200
        purchase_item = purchase_resp.json()
        assert purchase_item["status"] == "new"
        
        # Step 5: 更新采购状态
        update_resp = await client.put(f"/api/purchases/{purchase_item['id']}", json={
            "status": "negotiating",
            "assignee": "测试员"
        })
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated["status"] == "negotiating"
        assert updated["assignee"] == "测试员"
        
        # Step 6: 标记已收货
        mark_resp = await client.post(f"/api/purchases/{purchase_item['id']}/mark-purchased", json={
            "actual_price": 4400  # 实际议价到 4400
        })
        assert mark_resp.status_code == 200
        mark_data = mark_resp.json()
        assert "inventory_id" in mark_data
        
        # Step 7: 验证进入库存（需要 InventoryService，暂时验证采购项状态）
        get_purchase_resp = await client.get(f"/api/purchases/{purchase_item['id']}")
        assert get_purchase_resp.status_code == 200
        final_purchase = get_purchase_resp.json()
        assert final_purchase["status"] == "purchased"
        assert final_purchase["actual_price"] == 4400


@pytest.mark.asyncio
async def test_price_book_auto_market_price():
    """测试自动更新行情价"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # 创建一个行情来源为自动的条目
        create_resp = await client.post("/api/price-book/", json={
            "category_name": "自动行情测试",
            "keywords": ["自动测试"],
            "new_price": 8000,
            "market_price": 5000,
            "market_price_source": "auto_7d_median",
            "target_sell_price": 6000
        })
        assert create_resp.status_code == 200
        
        # 插入一些测试数据
        from src.infrastructure.persistence.item_repository import ItemRepository
        repo = ItemRepository()
        from datetime import datetime, timedelta
        
        for i, price in enumerate([4800, 5000, 5200, 5100]):
            await repo.insert({
                "搜索关键字": "自动测试",
                "爬取时间": (datetime.now() - timedelta(days=i)).isoformat(),
                "商品信息": {
                    "商品ID": f"auto_test_{i}",
                    "商品标题": f"自动测试商品 {i}",
                    "当前售价": f"¥{price}"
                }
            })
        
        # 触发自动更新
        update_resp = await client.post("/api/price-book/auto-update-market-prices")
        assert update_resp.status_code == 200
        
        # 验证行情价更新为中位数
        entries_resp = await client.get("/api/price-book/")
        entries = entries_resp.json()
        auto_entry = next((x for x in entries if x["category_name"] == "自动行情测试"), None)
        assert auto_entry is not None
        # 中位数应该是 5050 (4800, 5000, 5100, 5200 的中位数)
        assert 5000 <= auto_entry["market_price"] <= 5100
```

### Step 2: 运行测试

```bash
uv run pytest tests/e2e/test_mvp_workflow.py -v -s
```

**Expected:** PASS (2/2 tests)

### Step 3: 修复任何失败

如果测试失败，根据错误信息修复相关代码，重新运行直到全部通过。

### Step 4: 提交

```bash
git add tests/e2e/test_mvp_workflow.py
git commit -m "test: add e2e tests for Phase 1 MVP workflow"
```

---

## Task 8: 前端手动测试与修复

**目标:** 在浏览器中完整走通业务流程，修复发现的任何问题

### Step 1: 启动服务

```bash
# Terminal 1: 启动后端
uv run uvicorn src.app:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: 启动前端
cd web-ui
pnpm run dev
```

### Step 2: 测试价格本管理

访问 http://localhost:5173/price-book

测试清单:
- [ ] 点击"新建品类"，填写所有字段，创建成功
- [ ] 验证收购区间自动计算正确
- [ ] 编辑一个条目，修改费用，验证收购区间实时更新
- [ ] 删除一个条目
- [ ] 点击"自动更新行情价"，验证行情价更新

**记录所有发现的问题到 `docs/plans/phase1-issues.md`**

### Step 3: 测试捡漏雷达

访问 http://localhost:5173/bargain-radar

测试清单:
- [ ] 页面正常加载，汇总数据正确
- [ ] 商品列表按利润率降序排列
- [ ] 筛选"仅看可收商品"，只显示 great_deal 和 good_deal
- [ ] 排序切换生效
- [ ] 点击"加入采购"，提示成功

### Step 4: 测试采购清单

访问 http://localhost:5173/purchases

测试清单:
- [ ] 之前加入的商品出现在列表中
- [ ] 更改状态，验证更新成功
- [ ] 点击"已收货"，输入实际价格，验证提示"已进入库存"
- [ ] 筛选不同状态，验证筛选生效

### Step 5: 修复发现的问题

针对测试中发现的每个问题:
1. 在 `docs/plans/phase1-issues.md` 记录问题
2. 修复代码
3. 重新测试验证修复
4. 单独提交

示例:

```bash
# 修复问题 1
git add <修改的文件>
git commit -m "fix: resolve price book dialog validation issue"

# 修复问题 2
git add <修改的文件>
git commit -m "fix: bargain radar sorting incorrect for profit"
```

### Step 6: 完整流程验证

完整走通一遍:
1. 创建价格本条目（MacBook Pro M2，目标售价 10000）
2. 确保数据库中有测试商品（或运行一次爬虫）
3. 在捡漏雷达看到符合条件的商品
4. 加入采购清单
5. 更改状态到"议价中"
6. 标记"已收货"，输入实际价格

**Expected:** 流程顺畅，无报错，数据正确流转

### Step 7: 截图记录

对每个页面截图，保存到 `docs/screenshots/phase1-mvp/`:
- `price-book.png`
- `bargain-radar.png`
- `purchases.png`

### Step 8: 最终提交

```bash
git add docs/plans/phase1-issues.md docs/screenshots/phase1-mvp/
git commit -m "docs: add Phase 1 MVP testing results and screenshots"
```

---

## 验收标准

Phase 1 MVP 完成标准:

**后端:**
- [ ] 3 个 API 路由模块全部通过单元测试
- [ ] 端到端测试通过（test_mvp_workflow.py）
- [ ] 所有接口响应时间 < 1s

**前端:**
- [ ] 3 个页面能正常访问和操作
- [ ] 无控制台错误
- [ ] 所有按钮和交互正常
- [ ] 数据展示正确（收购区间、利润计算）

**业务流程:**
- [ ] 能创建价格本并自动计算收购区间
- [ ] 捡漏雷达能正确评估商品并筛选
- [ ] 能从捡漏雷达加入采购清单
- [ ] 能在采购清单管理状态流转
- [ ] 标记已收货能触发进入库存（后续 Phase 实现）

**代码质量:**
- [ ] 所有测试通过
- [ ] 无 linter 错误
- [ ] 提交信息规范（feat/fix/test/docs）
- [ ] 关键逻辑有注释

---

## 后续 Phase 规划

**Phase 2: 库存与利润核算**
- 库存台账页面
- 利润核算页面
- 库龄预警
- 数据报表导出

**Phase 3: 团队协作**
- 团队工作台
- 成员管理
- 任务分配
- 业绩统计

**Phase 4: 高级分析**
- 溢价地图
- 行情走势图
- 竞品观察
- 多维度对比分析

---

## 并发执行建议

推荐并发组:
- **Group A (后端)**: Task 1, 2, 3 可以 3 个并发执行（不同文件，无冲突）
- **Group B (前端)**: Task 4, 5, 6 可以 3 个并发执行（依赖 Group A 完成）
- **Group C (测试)**: Task 7, 8 必须串行，依赖 A+B

总耗时估算：
- Group A: 30-40 分钟
- Group B: 40-50 分钟
- Group C: 30 分钟
- **总计: 约 1.5-2 小时**（并发执行）

如果串行执行：约 4-5 小时
