# 价格本联动 + 溢价地图商品列表功能设计

> 日期：2026-02-13
> 状态：实施中

## 一、功能概述

### 1.1 价格本联动
商品爬取后自动匹配价格本配置，计算收购区间、预估利润、溢价率等信息，并在各页面（捡漏雷达、溢价地图、结果页）自动展示。

### 1.2 溢价地图商品列表
点击溢价地图品类卡片，弹出该品类的商品列表对话框，支持筛选、排序、批量加入采购清单。

---

## 二、价格本联动实现

### 2.1 后端数据流

**新增服务：PriceMatchingService**

```python
# src/services/price_matching_service.py

class PriceMatchingService:
    def __init__(self):
        from src.services.price_book_service import PriceBookService
        self.price_book_service = PriceBookService()
    
    def match_and_evaluate(self, item_data: dict) -> dict:
        """商品自动匹配价格本并计算评估信息"""
        
        # 1. 通过关键词匹配价格本品类
        price_book_entry = self._find_matching_category(
            item_data.get('搜索关键字', ''),
            item_data.get('商品信息', {}).get('商品标题', '')
        )
        
        if not price_book_entry:
            return {
                'category_id': None,
                'evaluation_status': 'no_config',
                'purchase_range_low': None,
                'purchase_range_high': None,
                'estimated_profit': None,
                'estimated_profit_rate': None,
                'premium_rate': None
            }
        
        # 2. 计算收购区间
        purchase_range = self._calculate_purchase_range(price_book_entry)
        
        # 3. 提取商品价格
        current_price = self._extract_price(
            item_data.get('商品信息', {}).get('当前售价', '')
        )
        
        # 4. 评估商品价格
        evaluation = self._evaluate_price(
            current_price,
            purchase_range,
            price_book_entry
        )
        
        return evaluation
    
    def _find_matching_category(self, task_keyword: str, title: str):
        """关键词匹配逻辑"""
        entries = self.price_book_service.list_entries()
        
        for entry in entries:
            for keyword in entry.get('keywords', []):
                if keyword.lower() in title.lower() or \
                   keyword.lower() in task_keyword.lower():
                    return entry
        return None
    
    def _calculate_purchase_range(self, entry: dict):
        """计算收购区间"""
        target_sell = entry.get('target_sell_price', 0)
        fees = entry.get('fees', {})
        
        # 总费用 = 固定费用 + 平台手续费
        total_fees = (
            fees.get('shipping_fee', 0) +
            fees.get('refurbish_fee', 0) +
            fees.get('other_fee', 0) +
            target_sell * fees.get('platform_fee_rate', 0)
        )
        
        # 收购上限 = 目标出货价 - 总费用 - 最低利润
        min_profit = target_sell * entry.get('min_profit_rate', 0.15)
        upper = target_sell - total_fees - min_profit
        
        # 理想收购价 = 目标出货价 - 总费用 - 理想利润
        ideal_profit = target_sell * entry.get('ideal_profit_rate', 0.25)
        ideal = target_sell - total_fees - ideal_profit
        
        return (ideal, upper)
    
    def _extract_price(self, price_str: str) -> float:
        """从价格字符串提取数值"""
        import re
        if not price_str:
            return 0.0
        
        # 移除 ¥ 符号和逗号
        price_str = str(price_str).replace('¥', '').replace(',', '').strip()
        
        # 提取数字
        match = re.search(r'[\d.]+', price_str)
        if match:
            return float(match.group())
        return 0.0
    
    def _evaluate_price(self, current_price: float, purchase_range: tuple, entry: dict):
        """评估商品价格状态"""
        ideal, upper = purchase_range
        
        if current_price <= 0:
            status = 'no_config'
        elif current_price <= ideal:
            status = 'great_deal'  # 超值捡漏
        elif current_price <= upper:
            status = 'good_deal'   # 可收
        else:
            status = 'overpriced'  # 超出区间
        
        # 计算预估利润
        target_sell = entry.get('target_sell_price', 0)
        fees = entry.get('fees', {})
        total_fees = (
            fees.get('shipping_fee', 0) +
            fees.get('refurbish_fee', 0) +
            fees.get('other_fee', 0) +
            target_sell * fees.get('platform_fee_rate', 0)
        )
        
        estimated_profit = target_sell - current_price - total_fees
        estimated_profit_rate = estimated_profit / target_sell if target_sell > 0 else 0
        
        # 计算溢价率（相对行情价）
        premium_rate = None
        market_price = entry.get('market_price')
        if market_price and market_price > 0:
            premium_rate = (current_price - market_price) / market_price
        
        return {
            'category_id': entry.get('id'),
            'category_name': entry.get('category_name'),
            'evaluation_status': status,
            'purchase_range_low': ideal,
            'purchase_range_high': upper,
            'estimated_profit': estimated_profit,
            'estimated_profit_rate': estimated_profit_rate,
            'premium_rate': premium_rate
        }
```

### 2.2 数据模型扩展

**扩展 Result 模型：**

```python
# src/domain/models/result.py 或相应的数据模型文件

# 在 Result 类中增加字段：
category_id: Optional[str] = None
evaluation_status: Optional[str] = None  # great_deal/good_deal/overpriced/no_config
purchase_range_low: Optional[float] = None
purchase_range_high: Optional[float] = None
estimated_profit: Optional[float] = None
estimated_profit_rate: Optional[float] = None
premium_rate: Optional[float] = None
```

### 2.3 爬虫集成

**在保存结果时调用匹配服务：**

```python
# spider_v2.py 或 src/scraper.py 中

from src.services.price_matching_service import PriceMatchingService

# 在保存商品数据的函数中增加
def save_item_with_evaluation(item_data):
    # 1. 保存基础数据到 JSONL
    save_to_jsonl(item_data)
    
    # 2. 自动匹配价格本并计算评估
    matching_service = PriceMatchingService()
    evaluation = matching_service.match_and_evaluate(item_data)
    
    # 3. 合并评估数据
    item_data.update(evaluation)
    
    # 4. 保存到数据库（如果使用数据库）
    save_to_database(item_data)
    
    return item_data
```

---

## 三、溢价地图商品列表实现

### 3.1 后端 API

**新增路由：**

```python
# src/api/routes/premium_map.py

from fastapi import APIRouter, Query
from typing import Optional, List
import json
import os
from pathlib import Path

router = APIRouter(prefix="/api/premium-map", tags=["premium-map"])

@router.get("/categories/{category_id}/items")
async def get_category_items(
    category_id: str,
    status: Optional[str] = Query(None),  # great_deal/good_deal/all
    sort_by: str = Query('profit_rate'),  # profit_rate/profit/price/crawl_time
    limit: int = Query(50, le=200)
):
    """获取指定品类的商品列表"""
    
    # 读取 JSONL 文件
    jsonl_dir = Path("jsonl")
    items = []
    
    for jsonl_file in jsonl_dir.glob("*.jsonl"):
        with open(jsonl_file, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    item = json.loads(line)
                    # 筛选匹配的品类
                    if item.get('category_id') == category_id:
                        # 状态筛选
                        if status and status != 'all':
                            if item.get('evaluation_status') != status:
                                continue
                        items.append(item)
                except:
                    continue
    
    # 排序
    if sort_by == 'profit_rate':
        items.sort(key=lambda x: x.get('estimated_profit_rate', 0), reverse=True)
    elif sort_by == 'profit':
        items.sort(key=lambda x: x.get('estimated_profit', 0), reverse=True)
    elif sort_by == 'price':
        items.sort(key=lambda x: float(str(x.get('商品信息', {}).get('当前售价', '0')).replace('¥', '').replace(',', '')))
    else:  # crawl_time
        items.sort(key=lambda x: x.get('爬取时间', ''), reverse=True)
    
    # 限制数量
    items = items[:limit]
    
    return {
        'items': items,
        'total': len(items)
    }

@router.post("/categories/{category_id}/items/batch-purchase")
async def batch_add_to_purchase(
    category_id: str,
    item_ids: List[str]
):
    """批量加入采购清单"""
    from src.services.purchase_service import PurchaseService
    
    purchase_service = PurchaseService()
    added_count = 0
    
    # 读取商品数据
    jsonl_dir = Path("jsonl")
    for jsonl_file in jsonl_dir.glob("*.jsonl"):
        with open(jsonl_file, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    item = json.loads(line)
                    item_id = item.get('商品信息', {}).get('商品ID')
                    
                    if item_id in item_ids:
                        # 加入采购清单
                        purchase_service.add_to_purchase_list(
                            item_id=item_id,
                            title=item.get('商品信息', {}).get('商品标题', ''),
                            price=float(str(item.get('商品信息', {}).get('当前售价', '0')).replace('¥', '').replace(',', '')),
                            image_url=item.get('商品信息', {}).get('商品主图链接', ''),
                            item_link=item.get('商品信息', {}).get('商品链接', ''),
                            platform=item.get('platform', 'xianyu'),
                            keyword=item.get('搜索关键字', ''),
                            estimated_profit=item.get('estimated_profit'),
                            estimated_profit_rate=item.get('estimated_profit_rate'),
                            purchase_range_low=item.get('purchase_range_low'),
                            purchase_range_high=item.get('purchase_range_high')
                        )
                        added_count += 1
                except:
                    continue
    
    return {'success': True, 'added_count': added_count}
```

### 3.2 前端组件

**创建商品列表对话框组件：**

```tsx
// web-ui/src/components/premiumMap/ItemListDialog.tsx

import { useState, useEffect } from 'react'
import { ExternalLink, ShoppingCart } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import type { CategoryOverview } from '@/api/premiumMap'

interface Item {
  id: string
  商品信息: {
    商品ID: string
    商品标题: string
    当前售价: string
    商品主图链接: string
    商品链接: string
  }
  evaluation_status: string
  estimated_profit: number
  estimated_profit_rate: number
  platform: string
}

interface ItemListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: CategoryOverview | null
}

export function ItemListDialog({ open, onOpenChange, category }: ItemListDialogProps) {
  const [items, setItems] = useState<Item[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState('good_deal')
  const [sortBy, setSortBy] = useState('profit_rate')
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const { toast } = useToast()
  
  useEffect(() => {
    if (open && category) {
      loadItems()
    } else {
      setItems([])
      setSelectedIds(new Set())
    }
  }, [open, category, statusFilter, sortBy])
  
  const loadItems = async () => {
    if (!category) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      params.set('sort_by', sortBy)
      
      const res = await fetch(
        `/api/premium-map/categories/${category.category_id}/items?${params}`
      )
      const data = await res.json()
      setItems(data.items || [])
    } catch (err) {
      console.error(err)
      toast({
        title: '加载失败',
        description: (err as Error).message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const toggleSelection = (itemId: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(itemId)) {
      newSet.delete(itemId)
    } else {
      newSet.add(itemId)
    }
    setSelectedIds(newSet)
  }
  
  const toggleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i.商品信息.商品ID)))
    }
  }
  
  const handleBatchAdd = async () => {
    if (selectedIds.size === 0 || !category) return
    setIsAdding(true)
    try {
      const res = await fetch(
        `/api/premium-map/categories/${category.category_id}/items/batch-purchase`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_ids: Array.from(selectedIds) }),
        }
      )
      const data = await res.json()
      toast({ title: `已加入 ${data.added_count} 件商品到采购清单` })
      setSelectedIds(new Set())
    } catch (err) {
      toast({
        title: '操作失败',
        description: (err as Error).message,
        variant: 'destructive',
      })
    } finally {
      setIsAdding(false)
    }
  }
  
  const extractPrice = (priceStr: string): number => {
    const cleaned = priceStr.replace(/¥|,/g, '').trim()
    return parseFloat(cleaned) || 0
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {category?.category_name}
            <Badge variant="default">{items.length} 件商品</Badge>
          </DialogTitle>
          {category && (
            <DialogDescription>
              收购区间：¥{category.purchase_range[0]?.toFixed(0) || '--'} ~ ¥
              {category.purchase_range[1]?.toFixed(0) || '--'}
            </DialogDescription>
          )}
        </DialogHeader>
        
        {/* 筛选工具栏 */}
        <div className="flex items-center gap-3 border-b pb-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="great_deal">超值捡漏</SelectItem>
              <SelectItem value="good_deal">可收</SelectItem>
              <SelectItem value="all">全部</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profit_rate">按利润率</SelectItem>
              <SelectItem value="profit">按利润金额</SelectItem>
              <SelectItem value="price">按价格</SelectItem>
              <SelectItem value="crawl_time">按爬取时间</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex-1" />
          
          <Button
            size="sm"
            onClick={handleBatchAdd}
            disabled={selectedIds.size === 0 || isAdding}
          >
            <ShoppingCart className="mr-1.5 h-4 w-4" />
            批量加入采购 ({selectedIds.size})
          </Button>
        </div>
        
        {/* 商品列表 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              加载中...
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              暂无商品
            </div>
          ) : (
            <div className="space-y-2">
              {/* 全选行 */}
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-md sticky top-0 z-10">
                <Checkbox
                  checked={selectedIds.size === items.length && items.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  全选 {selectedIds.size > 0 && `(已选 ${selectedIds.size} 件)`}
                </span>
              </div>
              
              {items.map((item) => {
                const itemId = item.商品信息?.商品ID
                const price = extractPrice(item.商品信息?.当前售价 || '0')
                
                return (
                  <div
                    key={itemId}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      checked={selectedIds.has(itemId)}
                      onCheckedChange={() => toggleSelection(itemId)}
                    />
                    
                    {/* 商品图片 */}
                    <img
                      src={item.商品信息?.商品主图链接 || '/placeholder.png'}
                      alt={item.商品信息?.商品标题}
                      className="h-16 w-16 rounded object-cover flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.png'
                      }}
                    />
                    
                    {/* 商品信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <h4 className="text-sm font-medium line-clamp-1 flex-1">
                          {item.商品信息?.商品标题}
                        </h4>
                        {item.evaluation_status === 'great_deal' && (
                          <Badge className="bg-emerald-600 flex-shrink-0">超值</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          售价:{' '}
                          <span className="font-mono font-semibold text-foreground">
                            ¥{price.toFixed(0)}
                          </span>
                        </span>
                        {item.estimated_profit != null && (
                          <span>
                            预估利润:{' '}
                            <span className="font-mono font-semibold text-emerald-600">
                              ¥{item.estimated_profit.toFixed(0)}
                            </span>
                          </span>
                        )}
                        {item.estimated_profit_rate != null && (
                          <span>
                            利润率:{' '}
                            <span className="font-mono font-semibold text-emerald-600">
                              {(item.estimated_profit_rate * 100).toFixed(1)}%
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(item.商品信息?.商品链接, '_blank', 'noopener,noreferrer')
                      }
                      className="flex-shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### 3.3 集成到溢价地图页面

```tsx
// web-ui/src/pages/PremiumMapPage.tsx 修改

import { ItemListDialog } from '@/components/premiumMap/ItemListDialog'

// 在组件中增加状态和处理函数
const [selectedCategory, setSelectedCategory] = useState<CategoryOverview | null>(null)
const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)

const handleCategoryClick = (category: CategoryOverview) => {
  setSelectedCategory(category)
  setIsItemDialogOpen(true)
}

// 修改品类卡片的点击事件
<CategoryCard
  category={category}
  isSelected={false}
  onSelect={() => handleCategoryClick(category)}
/>

// 在页面末尾添加对话框
<ItemListDialog
  open={isItemDialogOpen}
  onOpenChange={setIsItemDialogOpen}
  category={selectedCategory}
/>
```

---

## 四、实施步骤

1. ✅ 创建 `PriceMatchingService` 服务
2. ✅ 扩展数据模型增加评估字段
3. ✅ 在爬虫中集成匹配服务
4. ✅ 创建溢价地图商品列表 API
5. ✅ 创建 `ItemListDialog` 组件
6. ✅ 在溢价地图页面集成对话框
7. 🔄 测试端到端流程
8. 🔄 优化性能和用户体验

---

## 五、测试要点

- 商品自动匹配价格本是否准确
- 收购区间计算是否正确
- 商品列表弹窗数据是否完整
- 筛选和排序功能是否正常
- 批量加入采购清单是否成功
- 前端展示是否与后端数据一致
