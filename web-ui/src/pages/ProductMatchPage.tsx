import { useEffect, useState, useCallback } from 'react'
import {
  Layers,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Package,
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getEnabledPlatforms, getPlatformName, getPlatformColor } from '@/lib/platforms'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

import type { ProductGroup, ItemMatch } from '@/api/productMatch'
import { listProductGroups, getGroupItems } from '@/api/productMatch'
import type { CategoryNode } from '@/api/categories'
import { getCategoryTree } from '@/api/categories'

// ── 条件映射 ─────────────────────────────────────────

const CONDITION_TIERS: Record<string, { label: string; color: string }> = {
  all: { label: '全部', color: 'bg-gray-100 text-gray-700' },
  new: { label: '全新', color: 'bg-green-100 text-green-700' },
  like_new: { label: '几乎全新', color: 'bg-emerald-100 text-emerald-700' },
  good: { label: '良好', color: 'bg-blue-100 text-blue-700' },
  fair: { label: '一般', color: 'bg-yellow-100 text-yellow-700' },
  poor: { label: '较差', color: 'bg-red-100 text-red-700' },
}

const SORT_OPTIONS = [
  { value: 'arbitrage_rate', label: '套利率' },
  { value: 'price_gap', label: '价差' },
  { value: 'confidence', label: '匹配置信度' },
]

// ── 分类扁平化工具 ──────────────────────────────────

function flattenCategories(
  nodes: CategoryNode[],
  prefix = '',
): { id: string; path: string }[] {
  const result: { id: string; path: string }[] = []
  for (const node of nodes) {
    const path = prefix ? `${prefix} / ${node.name}` : node.name
    result.push({ id: node.id, path })
    if (node.children?.length) {
      result.push(...flattenCategories(node.children, path))
    }
  }
  return result
}

// ── 商品组卡片 ──────────────────────────────────────

function ProductGroupCard({
  group,
  targetPlatform,
  sourcePlatforms,
}: {
  group: ProductGroup
  targetPlatform: string
  sourcePlatforms: string[]
}) {
  const [expanded, setExpanded] = useState(false)
  const [items, setItems] = useState<ItemMatch[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  const handleExpand = useCallback(async () => {
    if (!expanded && items.length === 0) {
      setLoadingItems(true)
      try {
        const data = await getGroupItems(group.id)
        setItems(data)
      } catch {
        // silently fail
      } finally {
        setLoadingItems(false)
      }
    }
    setExpanded((prev) => !prev)
  }, [expanded, items.length, group.id])

  const allPlatforms = [targetPlatform, ...sourcePlatforms.filter((p) => p !== targetPlatform)]

  return (
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-5">
        {/* 头部信息 */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold">{group.name}</h3>
              {group.brand && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {group.brand}
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {group.model && <span>型号: {group.model}</span>}
              {group.category_path && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span>{group.category_path}</span>
                </>
              )}
              {group.spec_summary && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="truncate">{group.spec_summary}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {new Date(group.updated_at).toLocaleDateString('zh-CN')}
            </span>
            <Button variant="ghost" size="sm" onClick={handleExpand}>
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* 平台价格对比表 */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">成色</th>
                {allPlatforms.map((pid) => (
                  <th key={pid} className="pb-2 pr-4 font-medium">
                    <span
                      className="inline-block rounded px-1.5 py-0.5 text-white text-[10px]"
                      style={{ backgroundColor: getPlatformColor(pid) }}
                    >
                      {getPlatformName(pid)}
                    </span>
                  </th>
                ))}
                <th className="pb-2 font-medium">价差</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(CONDITION_TIERS)
                .filter(([k]) => k !== 'all')
                .map(([tier, { label, color }]) => (
                  <tr key={tier} className="border-b last:border-0">
                    <td className="py-2 pr-4">
                      <Badge className={cn('text-[10px]', color)}>{label}</Badge>
                    </td>
                    {allPlatforms.map((pid) => (
                      <td key={pid} className="py-2 pr-4 text-muted-foreground">
                        —
                      </td>
                    ))}
                    <td className="py-2 text-muted-foreground">—</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* 展开详情 */}
        {expanded && (
          <div className="mt-4 rounded-lg border bg-muted/30 p-4">
            <h4 className="mb-3 text-sm font-medium">匹配商品列表</h4>
            {loadingItems ? (
              <div className="py-4 text-center text-sm text-muted-foreground">加载中...</div>
            ) : items.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                暂无匹配商品
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.item_id.slice(0, 8)}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {CONDITION_TIERS[item.condition_tier]?.label || item.condition_tier}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {item.condition_detail}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        置信度: {(item.confidence * 100).toFixed(0)}%
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {item.matched_by}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── 主页面 ──────────────────────────────────────────

export default function ProductMatchPage() {
  const enabledPlatforms = getEnabledPlatforms()

  // 数据
  const [groups, setGroups] = useState<ProductGroup[]>([])
  const [categories, setCategories] = useState<{ id: string; path: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 过滤条件
  const [targetPlatform, setTargetPlatform] = useState(
    enabledPlatforms[0]?.id || '',
  )
  const [sourcePlatforms, setSourcePlatforms] = useState<string[]>(
    enabledPlatforms.slice(1).map((p) => p.id),
  )
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [conditionFilter, setConditionFilter] = useState('all')
  const [sortBy, setSortBy] = useState('arbitrage_rate')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [groupData, treeData] = await Promise.all([
        listProductGroups(),
        getCategoryTree(),
      ])
      setGroups(groupData)
      setCategories(flattenCategories(treeData))
    } catch (e: any) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleSourcePlatform = useCallback((pid: string) => {
    setSourcePlatforms((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid],
    )
  }, [])

  // 过滤
  const filteredGroups = groups.filter((g) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (
        !g.name.toLowerCase().includes(q) &&
        !(g.brand?.toLowerCase().includes(q)) &&
        !(g.model?.toLowerCase().includes(q))
      ) {
        return false
      }
    }
    if (categoryFilter !== 'all' && g.category_path) {
      const cat = categories.find((c) => c.id === categoryFilter)
      if (cat && !g.category_path.includes(cat.path)) {
        return false
      }
    }
    return true
  })

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Layers className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">商品比价</h1>
            <p className="text-sm text-muted-foreground">
              跨平台商品比价分析，发现套利机会
            </p>
          </div>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={cn('mr-1 h-4 w-4', loading && 'animate-spin')} />
          刷新
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* 过滤器 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
            <SlidersHorizontal className="h-4 w-4" />
            筛选条件
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 目标平台 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                目标平台（卖出）
              </label>
              <Select value={targetPlatform} onValueChange={setTargetPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="选择目标平台" />
                </SelectTrigger>
                <SelectContent>
                  {enabledPlatforms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 品类过滤 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                品类
              </label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="全部品类" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部品类</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 成色过滤 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                成色
              </label>
              <Select value={conditionFilter} onValueChange={setConditionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONDITION_TIERS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 排序 */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                排序
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="flex items-center gap-1">
                        <ArrowUpDown className="h-3 w-3" />
                        {opt.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 来源平台（多选） */}
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              来源平台（买入）
            </label>
            <div className="flex flex-wrap gap-4">
              {enabledPlatforms
                .filter((p) => p.id !== targetPlatform)
                .map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={sourcePlatforms.includes(p.id)}
                      onCheckedChange={() => toggleSourcePlatform(p.id)}
                    />
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.name}
                  </label>
                ))}
            </div>
          </div>

          {/* 搜索 */}
          <div className="mt-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索商品名/品牌/型号..."
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 商品组列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
          加载中...
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-lg font-medium">暂无商品比价数据</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              AI 商品匹配尚未运行，或当前筛选条件下没有匹配结果。
              请先确保已配置爬虫任务并运行过 AI 分析，系统将自动识别同一商品在不同平台的价格差异。
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground/60">
              <Package className="h-3.5 w-3.5" />
              <span>商品匹配由 AI 自动完成，无需手动操作</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              共 {filteredGroups.length} 个商品组
            </span>
          </div>
          {filteredGroups.map((group) => (
            <ProductGroupCard
              key={group.id}
              group={group}
              targetPlatform={targetPlatform}
              sourcePlatforms={sourcePlatforms}
            />
          ))}
        </div>
      )}
    </div>
  )
}
