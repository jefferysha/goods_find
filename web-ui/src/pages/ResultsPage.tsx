import { useState, useMemo, useCallback } from 'react'
import { useResults, type ResultFilters } from '@/hooks/results/useResults'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { getAllPlatforms, getPlatformColor } from '@/lib/platforms'
import { parsePriceNumber, calculatePremiumRate, getPriceLevel } from '@/lib/pricing-utils'
import type { ResultItem } from '@/types/result'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PlatformBadge, PlatformTabs } from '@/components/common/PlatformBadge'
import { createMarketPrice } from '@/api/pricing'
import { LayoutGrid, List, ShoppingCart } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createPurchase } from '@/api/purchases'

// ─── Price Level Config ──────────────────────────────────────
const PRICE_LEVEL_CONFIG: Record<string, { label: string; className: string; barColor: string }> = {
  low_price: { label: '低价捡漏', className: 'bg-emerald-100 text-emerald-700 border-emerald-200', barColor: '#10b981' },
  fair: { label: '价格合理', className: 'bg-blue-100 text-blue-700 border-blue-200', barColor: '#3b82f6' },
  slight_premium: { label: '轻微溢价', className: 'bg-amber-100 text-amber-700 border-amber-200', barColor: '#f59e0b' },
  high_premium: { label: '高溢价', className: 'bg-red-100 text-red-700 border-red-200', barColor: '#ef4444' },
}

function PriceLevelBadge({ level }: { level?: string }) {
  if (!level || level === 'unknown') return null
  const config = PRICE_LEVEL_CONFIG[level]
  if (!config) return null
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', config.className)}>
      {config.label}
    </span>
  )
}

// ─── Premium Rate Bar ────────────────────────────────────────
function PremiumRateBar({ rate, level }: { rate: number; level: string }) {
  const config = PRICE_LEVEL_CONFIG[level]
  // Map rate to a 0-100 visual width. Rate ranges from about -50% to +50%
  // We clamp to -50..+50 for display
  const clampedRate = Math.max(-50, Math.min(50, rate))
  // Center at 50%, negative goes left, positive goes right
  const center = 50
  const width = Math.abs(clampedRate) // percentage width
  const left = rate < 0 ? center - width : center
  const barColor = config?.barColor ?? '#888'

  return (
    <div className="space-y-1">
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-border" />
        {/* Rate bar */}
        <div
          className="absolute top-0 h-full rounded-full transition-all"
          style={{
            left: `${left}%`,
            width: `${width}%`,
            backgroundColor: barColor,
            opacity: 0.7,
          }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>-50%</span>
        <span className={cn('font-semibold', rate > 0 ? 'text-red-600' : 'text-emerald-600')}>
          {rate > 0 ? '+' : ''}{rate.toFixed(1)}%
        </span>
        <span>+50%</span>
      </div>
    </div>
  )
}

// ─── Set As Market Price Dialog ──────────────────────────────
interface SetPriceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: ResultItem | null
  onSuccess: () => void
}

function SetPriceDialog({ open, onOpenChange, item, onSuccess }: SetPriceDialogProps) {
  const [referencePrice, setReferencePrice] = useState('')
  const [fairUsedPrice, setFairUsedPrice] = useState('')
  const [category, setCategory] = useState('')
  const [source, setSource] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    if (!item) return
    const refPrice = parseFloat(referencePrice)
    if (isNaN(refPrice) || refPrice <= 0) {
      toast({ title: '请输入有效的新品参考价', variant: 'destructive' })
      return
    }
    setIsSaving(true)
    try {
      const fairPrice = parseFloat(fairUsedPrice)
      await createMarketPrice({
        task_id: 0, // Will be associated later or globally
        keyword: item.搜索关键字 || '',
        reference_price: refPrice,
        fair_used_price: isNaN(fairPrice) ? undefined : fairPrice,
        condition: 'good',
        category,
        platform: item.platform || 'xianyu',
        source,
        note: `来源：${item.商品信息.商品标题?.slice(0, 30) || ''}`,
      })
      toast({ title: '基准价设置成功' })
      onOpenChange(false)
      onSuccess()
      // Reset
      setReferencePrice('')
      setFairUsedPrice('')
      setCategory('')
      setSource('')
    } catch (e) {
      toast({ title: '设置基准价失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const currentPrice = item ? parsePriceNumber(item.商品信息.当前售价) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>设为基准价</DialogTitle>
          <DialogDescription>
            将此商品价格设为品类的参考基准价，用于计算其他商品的溢价率
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {item && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="font-medium line-clamp-1">{item.商品信息.商品标题}</p>
              <p className="mt-1 text-muted-foreground">当前售价：¥{currentPrice.toFixed(0)}</p>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm">新品参考价</Label>
            <Input
              type="number"
              className="col-span-3"
              placeholder="该商品全新的市场价"
              value={referencePrice}
              onChange={(e) => setReferencePrice(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm">合理二手价</Label>
            <Input
              type="number"
              className="col-span-3"
              placeholder="合理的二手价格（可选）"
              value={fairUsedPrice}
              onChange={(e) => setFairUsedPrice(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm">品类</Label>
            <Input
              className="col-span-3"
              placeholder="例如：笔记本、手机、相机"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right text-sm">价格来源</Label>
            <Input
              className="col-span-3"
              placeholder="例如：京东自营 2024-01"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? '保存中...' : '设为基准价'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Result Card ─────────────────────────────────────────────
function ResultCard({ item, onSetPrice, onAddToPurchase }: { item: ResultItem; onSetPrice: (item: ResultItem) => void; onAddToPurchase: (item: ResultItem) => void }) {
  const [expanded, setExpanded] = useState(false)

  const info = item.商品信息
  const seller = item.卖家信息
  const ai = item.ai_analysis
  const platform = item.platform || 'xianyu'

  const isRecommended = ai?.is_recommended === true
  const recommendationText = isRecommended ? '推荐' : ai?.is_recommended === false ? '不推荐' : '待定'
  const imageUrl = info.商品图片列表?.[0] || info.商品主图链接 || ''
  const crawlTime = item.爬取时间 ? new Date(item.爬取时间).toLocaleString('sv-SE') : '未知'
  const publishTime = info.发布时间 || '未知'

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="relative">
        {/* Platform badge - top left */}
        <div className="absolute left-2 top-2 z-10">
          <PlatformBadge platformId={platform} size="sm" />
        </div>

        <div className="-mx-6 -mt-6 aspect-[4/3] overflow-hidden rounded-t-lg bg-muted">
          <a href={info.商品链接} target="_blank" rel="noopener noreferrer">
            <img
              src={imageUrl}
              alt={info.商品标题}
              className="h-full w-full object-cover transition-transform hover:scale-105"
              loading="lazy"
            />
          </a>
        </div>
        <CardTitle className="pt-4">
          <a href={info.商品链接} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm hover:text-blue-600">
            {info.商品标题}
          </a>
        </CardTitle>

        {/* Price */}
        <CardDescription className="!mt-2 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-red-600">{info.当前售价}</span>
            {info.商品原价 && (
              <span className="text-sm text-muted-foreground line-through">{info.商品原价}</span>
            )}
          </div>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow space-y-3">
        {/* AI Recommendation */}
        <div
          className={cn(
            'rounded-md border p-3 text-sm',
            isRecommended ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50',
          )}
        >
          <p className={cn('font-semibold', isRecommended ? 'text-green-800' : 'text-red-800')}>
            AI建议: {recommendationText}
          </p>
          <p className={cn('mt-1 text-gray-600', !expanded && 'line-clamp-3')}>
            原因: {ai?.reason || '无'}
          </p>
          {ai?.reason && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs text-blue-600 hover:underline"
            >
              {expanded ? '收起' : '展开'}
            </button>
          )}
        </div>

        {/* Risk tags */}
        {ai?.risk_tags && ai.risk_tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {ai.risk_tags.map((tag, idx) => (
              <span key={idx} className="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Tags */}
        {info.商品标签 && info.商品标签.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {info.商品标签.slice(0, 4).map((tag, idx) => (
              <span key={idx} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Estimated Profit - placeholder based on price diff */}
        <div className="rounded-md bg-blue-50 border border-blue-200 p-2 text-sm">
          <span className="text-blue-700 font-medium">预估利润区间需配置价格本</span>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 text-xs text-muted-foreground">
        <div className="flex w-full items-center justify-between">
          <div className="space-y-0.5">
            <span className="block">卖家: {seller.卖家昵称 || info.卖家昵称 || '未知'}</span>
            <span className="block">发布: {publishTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAddToPurchase(item)}
              className="text-[11px] text-blue-600 hover:underline flex items-center gap-0.5"
              title="加入采购清单"
            >
              <ShoppingCart className="h-3 w-3" />
              加入采购
            </button>
            <button
              onClick={() => onSetPrice(item)}
              className="text-[11px] text-orange-600 hover:underline"
              title="将此商品价格设为品类基准价"
            >
              设为基准价
            </button>
            <a href={info.商品链接} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
              详情
            </a>
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}

// ─── Results Page ────────────────────────────────────────────
export default function ResultsPage() {
  const {
    keywords,
    selectedKeyword,
    setSelectedKeyword,
    results,
    filters,
    setFilters,
    isLoading,
    error,
    refreshResults,
    deleteSelected,
    exportCsv,
    keywordOptions,
    isOptionsReady,
  } = useResults()

  const { toast } = useToast()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState('all')
  const [setPriceItem, setSetPriceItem] = useState<ResultItem | null>(null)
  const [isSetPriceOpen, setIsSetPriceOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Platform filtering
  const allPlatforms = useMemo(() => getAllPlatforms(), [])

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of results) {
      const p = item.platform || 'xianyu'
      counts[p] = (counts[p] || 0) + 1
    }
    return counts
  }, [results])

  const platformTabData = useMemo(
    () =>
      allPlatforms.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        enabled: p.enabled,
        count: platformCounts[p.id] || 0,
      })),
    [allPlatforms, platformCounts],
  )

  const filteredResults = useMemo(() => {
    if (selectedPlatform === 'all') return results
    return results.filter((item) => (item.platform || 'xianyu') === selectedPlatform)
  }, [results, selectedPlatform])

  const selectedLabel = useMemo(() => {
    if (!isOptionsReady) return '加载中...'
    if (keywordOptions.length === 0) return '暂无数据，请先运行任务'
    if (!selectedKeyword) return '请选择关键词'
    const match = keywordOptions.find((o) => o.value === selectedKeyword)
    return match ? match.label : selectedKeyword
  }, [isOptionsReady, keywordOptions, selectedKeyword])

  const deleteConfirmText = selectedKeyword
    ? `确定删除关键词「${selectedKeyword}」的所有数据吗？此操作不可恢复。`
    : '确定删除该关键词数据吗？此操作不可恢复。'

  function openDeleteDialog() {
    if (!selectedKeyword) {
      toast({ title: '暂无可删除的数据', variant: 'destructive' })
      return
    }
    setIsDeleteDialogOpen(true)
  }

  async function handleDeleteResults() {
    if (!selectedKeyword) return
    try {
      await deleteSelected(selectedKeyword)
      toast({ title: '数据已删除' })
    } catch (e) {
      toast({ title: '删除失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }

  function handleExport() {
    if (!selectedKeyword) {
      toast({ title: '请先选择关键词', variant: 'destructive' })
      return
    }
    exportCsv(selectedKeyword)
    toast({ title: 'CSV 导出已开始' })
  }

  const handleSetPrice = useCallback((item: ResultItem) => {
    setSetPriceItem(item)
    setIsSetPriceOpen(true)
  }, [])

  const handleAddToPurchase = useCallback(async (item: ResultItem) => {
    const info = item.商品信息
    try {
      await createPurchase({
        title: info.商品标题,
        price: parsePriceNumber(info.当前售价),
        image_url: info.商品主图链接 || '',
        item_link: info.商品链接 || '',
        platform: item.platform || 'xianyu',
        keyword: item.搜索关键字 || '',
      })
      toast({ title: '已加入采购清单' })
    } catch (e) {
      toast({ title: '加入采购失败', description: (e as Error).message, variant: 'destructive' })
    }
  }, [toast])

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">结果查看</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          <strong className="font-bold">出错了! </strong>
          <span>{error.message}</span>
        </div>
      )}

      {/* Platform Tabs */}
      <div className="mb-4">
        <PlatformTabs
          platforms={platformTabData}
          value={selectedPlatform}
          onChange={setSelectedPlatform}
          totalCount={results.length}
        />
      </div>

      {/* Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border bg-muted/50 p-4">
        <Select
          value={selectedKeyword || undefined}
          onValueChange={setSelectedKeyword}
          disabled={!isOptionsReady || keywordOptions.length === 0}
        >
          <SelectTrigger className="w-[280px]">
            <span className={cn('transition-opacity', !isOptionsReady && 'opacity-70')}>
              {selectedLabel}
            </span>
          </SelectTrigger>
          <SelectContent>
            {keywordOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sort_by}
          onValueChange={(value) => setFilters((prev: ResultFilters) => ({ ...prev, sort_by: value as ResultFilters['sort_by'] }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="crawl_time">按爬取时间</SelectItem>
            <SelectItem value="publish_time">按发布时间</SelectItem>
            <SelectItem value="price">按价格</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.sort_order}
          onValueChange={(value) => setFilters((prev: ResultFilters) => ({ ...prev, sort_order: value as ResultFilters['sort_order'] }))}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">降序</SelectItem>
            <SelectItem value="asc">升序</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="recommended-only"
            checked={filters.recommended_only}
            onCheckedChange={(value) =>
              setFilters((prev: ResultFilters) => ({ ...prev, recommended_only: value === true }))
            }
          />
          <Label htmlFor="recommended-only" className="cursor-pointer">仅看AI推荐</Label>
        </div>

        <Button onClick={refreshResults} disabled={isLoading}>刷新</Button>

        <div className="flex items-center rounded-md border">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-r-none"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" onClick={handleExport} disabled={isLoading || !selectedKeyword}>
          导出CSV
        </Button>

        <Button variant="destructive" onClick={openDeleteDialog} disabled={isLoading || !selectedKeyword}>
          删除数据
        </Button>
      </div>

      {/* Results Grid / Table */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">正在加载结果...</div>
      ) : filteredResults.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          {selectedPlatform !== 'all' && results.length > 0
            ? '当前平台暂无符合条件的商品。'
            : '没有找到符合条件的商品记录。'}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredResults.map((item) => (
            <ResultCard key={item.商品信息.商品ID} item={item} onSetPrice={handleSetPrice} onAddToPurchase={handleAddToPurchase} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">商品标题</TableHead>
                <TableHead>售价</TableHead>
                <TableHead>平台</TableHead>
                <TableHead>AI建议</TableHead>
                <TableHead>发布时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((item) => {
                const info = item.商品信息
                const ai = item.ai_analysis
                const isRec = ai?.is_recommended === true
                return (
                  <TableRow key={info.商品ID}>
                    <TableCell>
                      <a href={info.商品链接} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm hover:text-blue-600">
                        {info.商品标题}
                      </a>
                    </TableCell>
                    <TableCell className="font-semibold text-red-600">{info.当前售价}</TableCell>
                    <TableCell><PlatformBadge platformId={item.platform || 'xianyu'} size="sm" /></TableCell>
                    <TableCell>
                      <span className={cn('text-xs font-medium', isRec ? 'text-green-600' : 'text-red-600')}>
                        {isRec ? '推荐' : '不推荐'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{info.发布时间 || '未知'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleAddToPurchase(item)} className="text-xs text-blue-600 hover:underline">加入采购</button>
                        <button onClick={() => handleSetPrice(item)} className="text-xs text-orange-600 hover:underline">设基准价</button>
                        <a href={info.商品链接} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">详情</a>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>删除数据</DialogTitle>
            <DialogDescription>{deleteConfirmText}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>取消</Button>
            <Button variant="destructive" disabled={isLoading} onClick={handleDeleteResults}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set As Market Price Dialog */}
      <SetPriceDialog
        open={isSetPriceOpen}
        onOpenChange={setIsSetPriceOpen}
        item={setPriceItem}
        onSuccess={() => toast({ title: '基准价已设置，刷新结果可查看溢价分析' })}
      />
    </div>
  )
}
