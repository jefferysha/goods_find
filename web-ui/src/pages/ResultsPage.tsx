import { useState, useMemo, useCallback } from 'react'
import { useResults, type ResultFilters } from '@/hooks/results/useResults'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { getAllPlatforms } from '@/lib/platforms'
import { parsePriceNumber } from '@/lib/pricing-utils'
import type { ResultItem } from '@/types/result'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
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
import { LayoutGrid, List, ShoppingCart, ExternalLink, Tag, GitCompareArrows, X, Check } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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

// ─── Evaluation Status Config ────────────────────────────────
const EVAL_STATUS_CONFIG: Record<string, { label: string; className: string; icon: string }> = {
  great_deal: { label: '超值捡漏', className: 'bg-emerald-500 text-white', icon: '🔥' },
  good_deal: { label: '可收', className: 'bg-green-500 text-white', icon: '✓' },
  overpriced: { label: '偏高', className: 'bg-orange-100 text-orange-700', icon: '↑' },
  no_config: { label: '未评估', className: 'bg-gray-100 text-gray-500', icon: '–' },
}

// ─── Result Card ─────────────────────────────────────────────
interface ResultCardProps {
  item: ResultItem
  onSetPrice: (item: ResultItem) => void
  onAddToPurchase: (item: ResultItem) => void
  selected?: boolean
  onToggleSelect?: (item: ResultItem) => void
}

function ResultCard({ item, onSetPrice, onAddToPurchase, selected, onToggleSelect }: ResultCardProps) {
  const [expanded, setExpanded] = useState(false)

  const info = item.商品信息
  const seller = item.卖家信息
  const ai = item.ai_analysis
  const platform = item.platform || 'xianyu'

  const isRecommended = ai?.is_recommended === true
  const imageUrl = info.商品图片列表?.[0] || info.商品主图链接 || ''
  const publishTime = info.发布时间 || '未知'

  // 价格本评估数据
  const evalStatus = item.evaluation_status || 'no_config'
  const evalConfig = EVAL_STATUS_CONFIG[evalStatus] || EVAL_STATUS_CONFIG.no_config
  const hasEvaluation = item.evaluation_status && item.evaluation_status !== 'no_config'
  const profitRate = item.estimated_profit_rate != null ? (item.estimated_profit_rate * 100).toFixed(1) : null

  return (
    <Card className={cn(
      'group flex h-full flex-col overflow-hidden transition-all hover:shadow-lg',
      selected && 'ring-2 ring-blue-500 shadow-blue-100'
    )}>
      {/* ── 第1层：图片 ── */}
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <a href={info.商品链接} target="_blank" rel="noopener noreferrer">
            <img
              src={imageUrl}
              alt={info.商品标题}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
          </a>
        </div>

        {/* 左上：选中框 + 平台 */}
        <div className="absolute left-2 top-2 flex items-center gap-1.5">
          {onToggleSelect && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSelect(item) }}
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                selected
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-white/80 bg-black/30 text-transparent hover:border-blue-400 hover:bg-blue-400/30 hover:text-white'
              )}
            >
              <Check className="h-3 w-3" />
            </button>
          )}
          <PlatformBadge platformId={platform} size="sm" />
        </div>

        {/* 右上：AI推荐标记 */}
        <div className="absolute right-2 top-2">
          {isRecommended ? (
            <span className="rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              AI推荐
            </span>
          ) : ai?.is_recommended === false ? (
            <span className="rounded-full bg-red-500/80 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              不推荐
            </span>
          ) : null}
        </div>

        {/* 左下：评估状态 */}
        {hasEvaluation && (
          <div className="absolute bottom-2 left-2">
            <span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold shadow-sm', evalConfig.className)}>
              {evalConfig.icon} {evalConfig.label}
            </span>
          </div>
        )}
      </div>

      {/* ── 第2层：标题 + 价格 + 利润 ── */}
      <div className="space-y-2 px-4 pt-3">
        <a
          href={info.商品链接}
          target="_blank"
          rel="noopener noreferrer"
          className="line-clamp-2 text-sm font-medium leading-snug text-foreground hover:text-blue-600"
        >
          {info.商品标题}
        </a>

        <div className="flex items-end justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-red-600">{info.当前售价}</span>
            {info.商品原价 && info.商品原价 !== '暂无' && (
              <span className="text-xs text-muted-foreground line-through">{info.商品原价}</span>
            )}
          </div>
          {item.estimated_profit != null ? (
            <div className="text-right">
              <span className={cn(
                'text-sm font-bold',
                item.estimated_profit > 0 ? 'text-emerald-600' : 'text-red-500'
              )}>
                {item.estimated_profit > 0 ? '+' : ''}¥{item.estimated_profit.toFixed(0)}
              </span>
              {profitRate && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({item.estimated_profit_rate! > 0 ? '+' : ''}{profitRate}%)
                </span>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground">未配置价格本</span>
          )}
        </div>
      </div>

      {/* ── 第3层：风险标签 + 商品标签 ── */}
      <div className="flex flex-wrap gap-1 px-4 pt-2">
        {ai?.risk_tags && ai.risk_tags.length > 0 && ai.risk_tags.map((tag, idx) => (
          <span key={`risk-${idx}`} className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600 border border-red-100">
            {tag}
          </span>
        ))}
        {info.商品标签 && info.商品标签.slice(0, 3).map((tag, idx) => (
          <span key={`tag-${idx}`} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>

      {/* ── 第4层：AI 理由（可展开） ── */}
      {ai?.reason && (
        <div className="px-4 pt-2">
          <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
            <p className={cn('text-xs text-muted-foreground leading-relaxed', !expanded && 'line-clamp-2')}>
              {ai.reason}
            </p>
            <span className="text-[10px] text-blue-500 hover:underline">
              {expanded ? '收起' : '展开详情'}
            </span>
          </button>
        </div>
      )}

      {/* ── 第5层：底部信息 + 图标按钮 ── */}
      <div className="mt-auto border-t px-4 py-2">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="truncate max-w-[120px]">{seller.卖家昵称 || info.卖家昵称 || '未知'}</span>
          <span className="shrink-0">{publishTime}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => onAddToPurchase(item)}
          >
            <ShoppingCart className="mr-1 h-3 w-3" />
            采购
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={() => onSetPrice(item)}
          >
            <Tag className="mr-1 h-3 w-3" />
            基准价
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0 shrink-0"
            asChild
          >
            <a href={info.商品链接} target="_blank" rel="noopener noreferrer" title="查看详情">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ─── Compare Panel ──────────────────────────────────────────
function ComparePanel({ items, onClose, onRemove }: {
  items: ResultItem[]
  onClose: () => void
  onRemove: (id: string) => void
}) {
  if (items.length === 0) return null

  // 找出最低价
  const prices = items.map(i => parsePriceNumber(i.商品信息.当前售价))
  const minPrice = Math.min(...prices)

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompareArrows className="h-5 w-5" />
            商品对比分析
            <Badge variant="secondary">{items.length} 件</Badge>
          </DialogTitle>
          <DialogDescription>跨平台商品对比，找出最优选择</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="sticky left-0 bg-muted/50 px-3 py-2 text-left font-medium w-[140px]">对比项</th>
                  {items.map((item) => (
                    <th key={item.商品信息.商品ID} className="min-w-[200px] px-3 py-2">
                      <div className="relative">
                        <button
                          onClick={() => onRemove(item.商品信息.商品ID)}
                          className="absolute -right-1 -top-1 rounded-full bg-muted p-0.5 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <img
                          src={item.商品信息.商品图片列表?.[0] || item.商品信息.商品主图链接 || ''}
                          alt=""
                          className="mx-auto h-20 w-20 rounded-md object-cover"
                        />
                        <p className="mt-1 line-clamp-2 text-xs font-normal text-left">{item.商品信息.商品标题}</p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {/* 平台 */}
                <tr>
                  <td className="sticky left-0 bg-background px-3 py-2 font-medium text-muted-foreground">平台</td>
                  {items.map((item) => (
                    <td key={item.商品信息.商品ID} className="px-3 py-2">
                      <PlatformBadge platformId={item.platform || 'xianyu'} size="sm" />
                    </td>
                  ))}
                </tr>
                {/* 价格 */}
                <tr>
                  <td className="sticky left-0 bg-background px-3 py-2 font-medium text-muted-foreground">价格</td>
                  {items.map((item) => {
                    const price = parsePriceNumber(item.商品信息.当前售价)
                    const isMin = price === minPrice && items.length > 1
                    return (
                      <td key={item.商品信息.商品ID} className="px-3 py-2">
                        <span className={cn('text-base font-bold', isMin ? 'text-emerald-600' : 'text-red-600')}>
                          {item.商品信息.当前售价}
                        </span>
                        {isMin && <Badge className="ml-1 bg-emerald-500 text-[10px]">最低</Badge>}
                      </td>
                    )
                  })}
                </tr>
                {/* 预估利润 */}
                <tr>
                  <td className="sticky left-0 bg-background px-3 py-2 font-medium text-muted-foreground">预估利润</td>
                  {items.map((item) => (
                    <td key={item.商品信息.商品ID} className="px-3 py-2">
                      {item.estimated_profit != null ? (
                        <span className={cn('font-semibold', item.estimated_profit > 0 ? 'text-emerald-600' : 'text-red-500')}>
                          {item.estimated_profit > 0 ? '+' : ''}¥{item.estimated_profit.toFixed(0)}
                          {item.estimated_profit_rate != null && (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              ({(item.estimated_profit_rate * 100).toFixed(1)}%)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* 评估状态 */}
                <tr>
                  <td className="sticky left-0 bg-background px-3 py-2 font-medium text-muted-foreground">评估</td>
                  {items.map((item) => {
                    const cfg = EVAL_STATUS_CONFIG[item.evaluation_status || 'no_config'] || EVAL_STATUS_CONFIG.no_config
                    return (
                      <td key={item.商品信息.商品ID} className="px-3 py-2">
                        <span className={cn('inline-block rounded-full px-2 py-0.5 text-[10px] font-bold', cfg.className)}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                    )
                  })}
                </tr>
                {/* AI建议 */}
                <tr>
                  <td className="sticky left-0 bg-background px-3 py-2 font-medium text-muted-foreground">AI建议</td>
                  {items.map((item) => {
                    const isRec = item.ai_analysis?.is_recommended
                    return (
                      <td key={item.商品信息.商品ID} className="px-3 py-2">
                        <span className={cn('font-semibold', isRec ? 'text-green-600' : isRec === false ? 'text-red-600' : 'text-muted-foreground')}>
                          {isRec ? '推荐' : isRec === false ? '不推荐' : '未分析'}
                        </span>
                      </td>
                    )
                  })}
                </tr>
                {/* AI 理由 */}
                <tr>
                  <td className="sticky left-0 bg-background px-3 py-2 font-medium text-muted-foreground">分析理由</td>
                  {items.map((item) => (
                    <td key={item.商品信息.商品ID} className="px-3 py-2 text-xs text-muted-foreground max-w-[240px]">
                      {item.ai_analysis?.reason || '—'}
                    </td>
                  ))}
                </tr>
                {/* 风险标签 */}
                <tr>
                  <td className="sticky left-0 bg-background px-3 py-2 font-medium text-muted-foreground">风险标签</td>
                  {items.map((item) => (
                    <td key={item.商品信息.商品ID} className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {item.ai_analysis?.risk_tags?.length ? item.ai_analysis.risk_tags.map((t, i) => (
                          <span key={i} className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600 border border-red-100">{t}</span>
                        )) : <span className="text-muted-foreground text-xs">无</span>}
                      </div>
                    </td>
                  ))}
                </tr>
                {/* 卖家 */}
                <tr>
                  <td className="sticky left-0 bg-background px-3 py-2 font-medium text-muted-foreground">卖家</td>
                  {items.map((item) => (
                    <td key={item.商品信息.商品ID} className="px-3 py-2 text-xs">
                      {item.卖家信息.卖家昵称 || item.商品信息.卖家昵称 || '未知'}
                    </td>
                  ))}
                </tr>
                {/* 卖家好评率 */}
                <tr>
                  <td className="sticky left-0 bg-background px-3 py-2 font-medium text-muted-foreground">卖家好评率</td>
                  {items.map((item) => (
                    <td key={item.商品信息.商品ID} className="px-3 py-2 text-xs">
                      {item.卖家信息['作为卖家的好评率'] || '—'}
                    </td>
                  ))}
                </tr>
                {/* 发布时间 */}
                <tr>
                  <td className="sticky left-0 bg-background px-3 py-2 font-medium text-muted-foreground">发布时间</td>
                  {items.map((item) => (
                    <td key={item.商品信息.商品ID} className="px-3 py-2 text-xs text-muted-foreground">
                      {item.商品信息.发布时间 || '未知'}
                    </td>
                  ))}
                </tr>
                {/* 链接 */}
                <tr>
                  <td className="sticky left-0 bg-background px-3 py-2 font-medium text-muted-foreground">操作</td>
                  {items.map((item) => (
                    <td key={item.商品信息.商品ID} className="px-3 py-2">
                      <a
                        href={item.商品信息.商品链接}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        查看详情 →
                      </a>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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

  // 多选对比
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())
  const [showCompare, setShowCompare] = useState(false)

  const compareItems = useMemo(
    () => results.filter((item) => compareIds.has(item.商品信息.商品ID)),
    [results, compareIds],
  )

  const toggleCompareItem = useCallback((item: ResultItem) => {
    setCompareIds((prev) => {
      const next = new Set(prev)
      const id = item.商品信息.商品ID
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= 6) {
          return prev // 最多对比6个
        }
        next.add(id)
      }
      return next
    })
  }, [])

  const clearCompare = useCallback(() => {
    setCompareIds(new Set())
    setShowCompare(false)
  }, [])

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
      <h1 className="mb-6 text-xl md:text-2xl font-bold text-foreground">结果查看</h1>

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

      {/* Compare Action Bar */}
      {compareIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <GitCompareArrows className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="text-sm font-medium text-blue-800">
            已选择 {compareIds.size} 件商品
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {compareItems.slice(0, 4).map((item) => (
              <Badge key={item.商品信息.商品ID} variant="secondary" className="shrink-0 gap-1 pr-1">
                <span className="max-w-[80px] truncate text-[10px]">{item.商品信息.商品标题}</span>
                <button onClick={() => toggleCompareItem(item)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {compareIds.size > 4 && (
              <span className="text-xs text-blue-600">+{compareIds.size - 4}</span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={clearCompare}>
              清空
            </Button>
            <Button size="sm" onClick={() => setShowCompare(true)} disabled={compareIds.size < 2}>
              <GitCompareArrows className="mr-1.5 h-3.5 w-3.5" />
              开始对比
            </Button>
          </div>
        </div>
      )}

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
            <ResultCard
              key={item.商品信息.商品ID}
              item={item}
              onSetPrice={handleSetPrice}
              onAddToPurchase={handleAddToPurchase}
              selected={compareIds.has(item.商品信息.商品ID)}
              onToggleSelect={toggleCompareItem}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">对比</TableHead>
                <TableHead className="w-[280px]">商品标题</TableHead>
                <TableHead>售价</TableHead>
                <TableHead>利润</TableHead>
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
                const isSelected = compareIds.has(info.商品ID)
                return (
                  <TableRow key={info.商品ID} className={cn(isSelected && 'bg-blue-50')}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleCompareItem(item)}
                      />
                    </TableCell>
                    <TableCell>
                      <a href={info.商品链接} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm hover:text-blue-600">
                        {info.商品标题}
                      </a>
                    </TableCell>
                    <TableCell className="font-semibold text-red-600">{info.当前售价}</TableCell>
                    <TableCell>
                      {item.estimated_profit != null ? (
                        <span className={cn('text-xs font-semibold', item.estimated_profit > 0 ? 'text-emerald-600' : 'text-red-500')}>
                          {item.estimated_profit > 0 ? '+' : ''}¥{item.estimated_profit.toFixed(0)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell><PlatformBadge platformId={item.platform || 'xianyu'} size="sm" /></TableCell>
                    <TableCell>
                      <span className={cn('text-xs font-medium', isRec ? 'text-green-600' : 'text-red-600')}>
                        {isRec ? '推荐' : '不推荐'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{info.发布时间 || '未知'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleAddToPurchase(item)} className="text-xs text-blue-600 hover:underline whitespace-nowrap">采购</button>
                        <button onClick={() => handleSetPrice(item)} className="text-xs text-orange-600 hover:underline whitespace-nowrap">基准价</button>
                        <a href={info.商品链接} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline whitespace-nowrap">详情</a>
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

      {/* Compare Panel */}
      {showCompare && (
        <ComparePanel
          items={compareItems}
          onClose={() => setShowCompare(false)}
          onRemove={(id) => {
            setCompareIds((prev) => {
              const next = new Set(prev)
              next.delete(id)
              if (next.size < 2) setShowCompare(false)
              return next
            })
          }}
        />
      )}
    </div>
  )
}
