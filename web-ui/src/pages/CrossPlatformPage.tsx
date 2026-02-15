import { useEffect, useState, useCallback } from 'react'
import {
  GitCompare,
  RefreshCw,
  Settings2,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
  Minus,
  ExternalLink,
  Star,
  BadgeJapaneseYen,
  BadgeCent,
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { CategoryComparison, CrossPlatformItem, ExchangeRates } from '@/api/crossPlatform'
import {
  getComparableCategories,
  getCrossPlatformItems,
  getExchangeRates,
  updateExchangeRates,
} from '@/api/crossPlatform'

// ── 工具 ────────────────────────────────────────────

const ARBITRAGE_COLOR: Record<string, string> = {
  high: 'bg-red-500/15 text-red-600 border-red-300',
  medium: 'bg-orange-500/15 text-orange-600 border-orange-300',
  low: 'bg-yellow-500/15 text-yellow-600 border-yellow-300',
  none: 'bg-gray-500/10 text-gray-500 border-gray-300',
}

const ARBITRAGE_LABEL: Record<string, string> = {
  high: '强烈套利',
  medium: '中等套利',
  low: '轻微套利',
  none: '无套利',
}

const PLATFORM_LABEL: Record<string, string> = {
  xianyu: '闲鱼',
  mercari: 'Mercari',
}

const PLATFORM_ICON: Record<string, typeof BadgeCent> = {
  xianyu: BadgeCent,
  mercari: BadgeJapaneseYen,
}

function fmtPrice(val: number | null | undefined, currency = 'CNY'): string {
  if (val === null || val === undefined) return '-'
  const symbol = currency === 'JPY' ? '¥' : '¥'
  return `${symbol}${val.toFixed(currency === 'JPY' ? 0 : 2)}`
}

// ── 品类卡片 ─────────────────────────────────────────

function CategoryCard({
  category,
  isSelected,
  onSelect,
}: {
  category: CategoryComparison
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary',
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{category.category_name}</CardTitle>
          <Badge
            variant="outline"
            className={cn('text-[11px] font-semibold', ARBITRAGE_COLOR[category.arbitrage_opportunity])}
          >
            {ARBITRAGE_LABEL[category.arbitrage_opportunity]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {/* 各平台统计行 */}
        {category.platforms.map((ps) => {
          const Icon = PLATFORM_ICON[ps.platform] ?? BadgeCent
          return (
            <div key={ps.platform} className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                <span>{PLATFORM_LABEL[ps.platform] ?? ps.platform}</span>
                <span className="text-xs">({ps.item_count}件)</span>
              </div>
              <div className="font-mono text-foreground">
                {fmtPrice(ps.converted_avg)}
                <span className="ml-1 text-[11px] text-muted-foreground">
                  {ps.currency !== 'CNY' && `(${fmtPrice(ps.avg_price, ps.currency)})`}
                </span>
              </div>
            </div>
          )
        })}

        {/* 差价高亮 */}
        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-muted-foreground">差价</span>
          <span
            className={cn(
              'font-semibold',
              category.price_gap_pct >= 15 ? 'text-red-500' : category.price_gap_pct >= 5 ? 'text-orange-500' : 'text-muted-foreground',
            )}
          >
            {category.price_gap_pct.toFixed(1)}%
          </span>
        </div>

        {/* 最便宜平台 */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>最便宜</span>
          <Badge variant="secondary" className="text-[10px]">
            {PLATFORM_LABEL[category.cheapest_platform] ?? category.cheapest_platform}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

// ── 商品行 ────────────────────────────────────────────

function ItemRow({ item }: { item: CrossPlatformItem }) {
  const pctVsAvg = item.vs_category_avg ?? 0
  const PctIcon = pctVsAvg < -5 ? TrendingDown : pctVsAvg > 5 ? TrendingUp : Minus

  return (
    <div className="group flex items-center gap-4 rounded-lg border bg-card p-3 transition-all hover:shadow-sm">
      {/* 图片 */}
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            暂无图
          </div>
        )}
      </div>

      {/* 信息 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{item.title}</span>
          {item.ai_recommended && (
            <Star className="h-3.5 w-3.5 flex-shrink-0 fill-yellow-400 text-yellow-400" />
          )}
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            {PLATFORM_LABEL[item.platform] ?? item.platform}
          </Badge>
          <span>关键词: {item.keyword}</span>
          {item.seller_credit && <span>信誉: {item.seller_credit}</span>}
        </div>
      </div>

      {/* 价格区 */}
      <div className="flex flex-shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-sm font-semibold">
          {fmtPrice(item.converted_price)}
        </span>
        {item.currency !== 'CNY' && (
          <span className="text-[11px] text-muted-foreground">
            原价 {fmtPrice(item.price, item.currency)}
          </span>
        )}
      </div>

      {/* 对比指标 */}
      <div className="flex flex-shrink-0 flex-col items-end gap-0.5 text-xs">
        <div
          className={cn(
            'flex items-center gap-0.5',
            pctVsAvg < -5 ? 'text-green-600' : pctVsAvg > 5 ? 'text-red-500' : 'text-muted-foreground',
          )}
        >
          <PctIcon className="h-3 w-3" />
          <span>{pctVsAvg > 0 ? '+' : ''}{pctVsAvg.toFixed(1)}%</span>
        </div>
        <span className="text-muted-foreground">vs 均价</span>
      </div>

      {/* 链接 */}
      {item.item_link && (
        <a
          href={item.item_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  )
}

// ── 汇率设置弹窗 ──────────────────────────────────────

function ExchangeRateDialog({
  open,
  onClose,
  initialRates,
  onSave,
}: {
  open: boolean
  onClose: () => void
  initialRates: ExchangeRates
  onSave: (jpyToCny: number) => void
}) {
  const [jpyRate, setJpyRate] = useState(String(initialRates['JPY_to_CNY'] || 0.048))

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>汇率设置</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <span className="w-32 text-sm font-medium">日元 → 人民币</span>
            <Input
              type="number"
              step="0.001"
              value={jpyRate}
              onChange={(e) => setJpyRate(e.target.value)}
              className="max-w-[140px]"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            例：0.048 表示 1 日元 = 0.048 人民币 (即 1000 日元 ≈ 48 元)
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button
            onClick={() => {
              const val = parseFloat(jpyRate)
              if (val > 0) onSave(val)
            }}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── 主页面 ────────────────────────────────────────────

export default function CrossPlatformPage() {
  const [categories, setCategories] = useState<CategoryComparison[]>([])
  const [items, setItems] = useState<CrossPlatformItem[]>([])
  const [rates, setRates] = useState<ExchangeRates>({})
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState('converted_price')
  const [loading, setLoading] = useState(true)
  const [showRateDialog, setShowRateDialog] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [cats, rts] = await Promise.all([
        getComparableCategories(),
        getExchangeRates(),
      ])
      setCategories(cats)
      setRates(rts)

      // 自动选中差价最大的品类
      if (cats.length > 0 && !selectedCat) {
        setSelectedCat(cats[0].category_id)
      }
    } catch (err) {
      console.error('加载跨平台数据失败', err)
    } finally {
      setLoading(false)
    }
  }, [selectedCat])

  const fetchItems = useCallback(async () => {
    try {
      const its = await getCrossPlatformItems({
        category_id: selectedCat ?? undefined,
        sort_by: sortBy,
      })
      setItems(its)
    } catch (err) {
      console.error('加载混排商品失败', err)
    }
  }, [selectedCat, sortBy])

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    fetchItems()
  }, [selectedCat, sortBy])

  const handleSaveRate = async (jpyToCny: number) => {
    await updateExchangeRates([{ from: 'JPY', to: 'CNY', rate: jpyToCny }])
    setShowRateDialog(false)
    fetchAll()
    fetchItems()
  }

  // ── 统计数字 ──
  const totalCategories = categories.length
  const arbitrageCount = categories.filter((c) => c.arbitrage_opportunity !== 'none').length
  const highCount = categories.filter((c) => c.arbitrage_opportunity === 'high').length
  const jpyRate = rates['JPY_to_CNY'] || 0

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <GitCompare className="h-6 w-6" />
            跨平台比价
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            比较闲鱼和 Mercari 商品价格差异，识别套利机会
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowRateDialog(true)}>
            <Settings2 className="mr-1.5 h-4 w-4" />
            汇率设置
            {jpyRate > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                1¥={jpyRate} ¥
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchAll()
              fetchItems()
            }}
            disabled={loading}
          >
            <RefreshCw className={cn('mr-1.5 h-4 w-4', loading && 'animate-spin')} />
            刷新
          </Button>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-4">
            <span className="text-2xl font-bold">{totalCategories}</span>
            <span className="text-xs text-muted-foreground">可比品类</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-4">
            <span className="text-2xl font-bold text-orange-500">{arbitrageCount}</span>
            <span className="text-xs text-muted-foreground">存在套利</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-4">
            <span className="text-2xl font-bold text-red-500">{highCount}</span>
            <span className="text-xs text-muted-foreground">强烈套利</span>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-4">
            <span className="text-2xl font-bold">{items.length}</span>
            <span className="text-xs text-muted-foreground">当前商品数</span>
          </CardContent>
        </Card>
      </div>

      {/* 品类对比卡片网格 */}
      {categories.length > 0 ? (
        <div>
          <h2 className="mb-3 text-lg font-semibold">品类对比</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.category_id}
                category={cat}
                isSelected={selectedCat === cat.category_id}
                onSelect={() => setSelectedCat(cat.category_id)}
              />
            ))}
          </div>
        </div>
      ) : !loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <GitCompare className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-medium">暂无可比品类</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              需要在多个平台（闲鱼 + Mercari）都有监控任务，并通过价格本或关键词映射建立品类关联后才能进行跨平台对比。
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* 混排商品列表 */}
      {selectedCat && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              商品明细
              {categories.find((c) => c.category_id === selectedCat) && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {categories.find((c) => c.category_id === selectedCat)?.category_name}
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="converted_price">换算价 (低→高)</SelectItem>
                  <SelectItem value="vs_category_avg">vs 均价 (低→高)</SelectItem>
                  <SelectItem value="price">原始价格 (低→高)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map((item) => (
                <ItemRow key={`${item.platform}-${item.item_id}`} item={item} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                该品类暂无商品数据
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
          加载中...
        </div>
      )}

      {/* 汇率弹窗 */}
      <ExchangeRateDialog
        open={showRateDialog}
        onClose={() => setShowRateDialog(false)}
        initialRates={rates}
        onSave={handleSaveRate}
      />
    </div>
  )
}
