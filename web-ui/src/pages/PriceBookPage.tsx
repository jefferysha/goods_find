import { useState, useEffect, type FormEvent } from 'react'
import { Plus, Pencil, Trash2, RefreshCw, BookOpen } from 'lucide-react'
import { usePriceBook } from '@/hooks/priceBook/usePriceBook'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { getPlatformName } from '@/lib/platforms'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { PriceBookEntry, FeeTemplate } from '@/types/priceBook'

// ─── 默认费用模板 ─────────────────────────────────────────────
const DEFAULT_FEES: FeeTemplate = {
  shipping_fee: 0,
  refurbish_fee: 0,
  platform_fee_rate: 0.05,
  other_fee: 0,
}

// ─── 计算工具 ─────────────────────────────────────────────────
function calcTotalFees(targetSellPrice: number | undefined, fees: FeeTemplate): number {
  if (!targetSellPrice) return 0
  const fixed = fees.shipping_fee + fees.refurbish_fee + fees.other_fee
  const platformFee = targetSellPrice * fees.platform_fee_rate
  return Math.round((fixed + platformFee) * 100) / 100
}

function calcPurchaseRange(
  targetSellPrice: number | undefined,
  fees: FeeTemplate,
  minProfitRate: number,
  idealProfitRate: number,
): [number | null, number | null] {
  if (!targetSellPrice) return [null, null]
  const totalFees = calcTotalFees(targetSellPrice, fees)
  const upper = targetSellPrice - totalFees - targetSellPrice * minProfitRate
  const ideal = targetSellPrice - totalFees - targetSellPrice * idealProfitRate
  return [Math.round(ideal * 100) / 100, Math.round(upper * 100) / 100]
}

// ─── 价格显示 ─────────────────────────────────────────────────
function PriceCell({ value, suffix }: { value?: number | null; suffix?: string }) {
  if (value === undefined || value === null) {
    return <span className="text-muted-foreground">--</span>
  }
  return (
    <span className="font-mono text-sm">
      ¥{value.toFixed(0)}
      {suffix}
    </span>
  )
}

// ─── 收购区间高亮 ─────────────────────────────────────────────
function PurchaseRangeCell({ entry }: { entry: PriceBookEntry }) {
  const [ideal, upper] = entry.purchase_range ?? calcPurchaseRange(
    entry.target_sell_price,
    entry.fees,
    entry.min_profit_rate,
    entry.ideal_profit_rate,
  )

  if (ideal === null || upper === null) {
    return <span className="text-muted-foreground text-xs">未配置</span>
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1">
        <span className="inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
          ¥{ideal.toFixed(0)}
        </span>
        <span className="text-muted-foreground text-xs">~</span>
        <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
          ¥{upper.toFixed(0)}
        </span>
      </div>
      <span className="text-[10px] text-muted-foreground">理想 ~ 上限</span>
    </div>
  )
}

// ─── 品类表单 ─────────────────────────────────────────────────
interface EntryFormProps {
  mode: 'create' | 'edit'
  initialData?: PriceBookEntry | null
  onSubmit: (data: Partial<PriceBookEntry>) => void
}

function EntryForm({ mode, initialData, onSubmit }: EntryFormProps) {
  const [categoryName, setCategoryName] = useState('')
  const [keywords, setKeywords] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [marketPrice, setMarketPrice] = useState('')
  const [marketPriceSource, setMarketPriceSource] = useState<'manual' | 'auto_7d_median'>('manual')
  const [targetSellPrice, setTargetSellPrice] = useState('')
  const [shippingFee, setShippingFee] = useState('0')
  const [refurbishFee, setRefurbishFee] = useState('0')
  const [platformFeeRate, setPlatformFeeRate] = useState('5')
  const [otherFee, setOtherFee] = useState('0')
  const [minProfitRate, setMinProfitRate] = useState('15')
  const [idealProfitRate, setIdealProfitRate] = useState('25')
  const [platform, setPlatform] = useState('xianyu')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (mode === 'edit' && initialData) {
      setCategoryName(initialData.category_name || '')
      setKeywords((initialData.keywords || []).join(', '))
      setNewPrice(initialData.new_price?.toString() || '')
      setMarketPrice(initialData.market_price?.toString() || '')
      setMarketPriceSource(initialData.market_price_source || 'manual')
      setTargetSellPrice(initialData.target_sell_price?.toString() || '')
      setShippingFee(initialData.fees?.shipping_fee?.toString() || '0')
      setRefurbishFee(initialData.fees?.refurbish_fee?.toString() || '0')
      setPlatformFeeRate(((initialData.fees?.platform_fee_rate || 0.05) * 100).toString())
      setOtherFee(initialData.fees?.other_fee?.toString() || '0')
      setMinProfitRate(((initialData.min_profit_rate || 0.15) * 100).toString())
      setIdealProfitRate(((initialData.ideal_profit_rate || 0.25) * 100).toString())
      setPlatform(initialData.platform || 'xianyu')
      setNote(initialData.note || '')
    } else if (mode === 'create') {
      setCategoryName('')
      setKeywords('')
      setNewPrice('')
      setMarketPrice('')
      setMarketPriceSource('manual')
      setTargetSellPrice('')
      setShippingFee('0')
      setRefurbishFee('0')
      setPlatformFeeRate('5')
      setOtherFee('0')
      setMinProfitRate('15')
      setIdealProfitRate('25')
      setPlatform('xianyu')
      setNote('')
    }
  }, [mode, initialData])

  // 实时计算收购区间预览
  const fees: FeeTemplate = {
    shipping_fee: parseFloat(shippingFee) || 0,
    refurbish_fee: parseFloat(refurbishFee) || 0,
    platform_fee_rate: (parseFloat(platformFeeRate) || 0) / 100,
    other_fee: parseFloat(otherFee) || 0,
  }
  const tsp = parseFloat(targetSellPrice) || 0
  const totalFees = calcTotalFees(tsp || undefined, fees)
  const [previewIdeal, previewUpper] = calcPurchaseRange(
    tsp || undefined,
    fees,
    (parseFloat(minProfitRate) || 0) / 100,
    (parseFloat(idealProfitRate) || 0) / 100,
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const keywordList = keywords
      .split(/[,，\n]/)
      .map((k) => k.trim())
      .filter(Boolean)

    const data: Partial<PriceBookEntry> = {
      category_name: categoryName,
      keywords: keywordList,
      new_price: newPrice ? parseFloat(newPrice) : undefined,
      market_price: marketPrice ? parseFloat(marketPrice) : undefined,
      market_price_source: marketPriceSource,
      target_sell_price: targetSellPrice ? parseFloat(targetSellPrice) : undefined,
      fees,
      min_profit_rate: (parseFloat(minProfitRate) || 15) / 100,
      ideal_profit_rate: (parseFloat(idealProfitRate) || 25) / 100,
      platform,
      note,
    }
    onSubmit(data)
  }

  return (
    <form id="price-book-form" onSubmit={handleSubmit}>
      <div className="space-y-5 py-4">
        {/* 基本信息 */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="category-name" className="text-sm font-medium">
              品类名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="category-name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="例如：MacBook Air M2"
              required
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords" className="text-sm font-medium">
              关联关键词
            </Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="多个关键词用逗号分隔"
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform" className="text-sm font-medium">
              平台
            </Label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger id="platform" className="h-10">
                <SelectValue placeholder="选择平台" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="xianyu">闲鱼</SelectItem>
                <SelectItem value="zhuanzhuan">转转</SelectItem>
                <SelectItem value="jd_used">京东二手</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 三栏配置区域 */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* 价格配置 */}
          <div className="rounded-lg border bg-blue-50/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-blue-900">价格配置</h3>
            
            <div className="space-y-2">
              <Label htmlFor="new-price" className="text-xs">新品参考价</Label>
              <Input
                id="new-price"
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="¥"
                className="h-9 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="market-price" className="text-xs">二手行情价</Label>
              <Input
                id="market-price"
                type="number"
                value={marketPrice}
                onChange={(e) => setMarketPrice(e.target.value)}
                placeholder="¥"
                className="h-9 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="market-price-source" className="text-xs">价格来源</Label>
              <Select value={marketPriceSource} onValueChange={(v) => setMarketPriceSource(v as 'manual' | 'auto_7d_median')}>
                <SelectTrigger id="market-price-source" className="h-9 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">手动</SelectItem>
                  <SelectItem value="auto_7d_median">自动(7天)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target-sell-price" className="text-xs">目标出货价</Label>
              <Input
                id="target-sell-price"
                type="number"
                value={targetSellPrice}
                onChange={(e) => setTargetSellPrice(e.target.value)}
                placeholder="¥"
                className="h-9 bg-white"
              />
            </div>
          </div>

          {/* 费用配置 */}
          <div className="rounded-lg border bg-purple-50/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-purple-900">费用配置</h3>
            
            <div className="space-y-2">
              <Label htmlFor="shipping-fee" className="text-xs">运费</Label>
              <Input
                id="shipping-fee"
                type="number"
                value={shippingFee}
                onChange={(e) => setShippingFee(e.target.value)}
                placeholder="0"
                className="h-9 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="refurbish-fee" className="text-xs">整备费</Label>
              <Input
                id="refurbish-fee"
                type="number"
                value={refurbishFee}
                onChange={(e) => setRefurbishFee(e.target.value)}
                placeholder="0"
                className="h-9 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform-fee-rate" className="text-xs">平台手续费率</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="platform-fee-rate"
                  type="number"
                  step="0.1"
                  value={platformFeeRate}
                  onChange={(e) => setPlatformFeeRate(e.target.value)}
                  className="h-9 flex-1 bg-white"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="other-fee" className="text-xs">其他费用</Label>
              <Input
                id="other-fee"
                type="number"
                value={otherFee}
                onChange={(e) => setOtherFee(e.target.value)}
                placeholder="0"
                className="h-9 bg-white"
              />
            </div>
          </div>

          {/* 利润要求 */}
          <div className="rounded-lg border bg-emerald-50/50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-emerald-900">利润要求</h3>
            
            <div className="space-y-2">
              <Label htmlFor="min-profit-rate" className="text-xs">最低利润率</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="min-profit-rate"
                  type="number"
                  step="1"
                  value={minProfitRate}
                  onChange={(e) => setMinProfitRate(e.target.value)}
                  className="h-9 flex-1 bg-white"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ideal-profit-rate" className="text-xs">理想利润率</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="ideal-profit-rate"
                  type="number"
                  step="1"
                  value={idealProfitRate}
                  onChange={(e) => setIdealProfitRate(e.target.value)}
                  className="h-9 flex-1 bg-white"
                />
                <span className="text-xs text-muted-foreground">%</span>
              </div>
            </div>

            {/* 收购区间预览 */}
            {tsp > 0 && (
              <div className="mt-2 rounded-md border border-emerald-200 bg-white p-3 space-y-2">
                <div className="text-xs font-medium text-emerald-700">收购区间预览</div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">总费用</span>
                    <span className="font-mono font-semibold">¥{totalFees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">理想收购</span>
                    <span className="font-mono font-semibold text-emerald-600">
                      {previewIdeal !== null ? `¥${previewIdeal.toFixed(0)}` : '--'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">收购上限</span>
                    <span className="font-mono font-semibold text-amber-600">
                      {previewUpper !== null ? `¥${previewUpper.toFixed(0)}` : '--'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 备注 */}
        <div className="space-y-2">
          <Label htmlFor="note" className="text-sm font-medium">备注</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="可选备注信息..."
            rows={2}
            className="resize-none"
          />
        </div>
      </div>
    </form>
  )
}

// ─── 主页面 ───────────────────────────────────────────────────
export default function PriceBookPage() {
  const {
    entries,
    isLoading,
    error,
    createEntry,
    updateEntry,
    deleteEntry,
    autoUpdatePrices,
  } = usePriceBook()

  const { toast } = useToast()

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<PriceBookEntry | null>(null)
  const [entryToDelete, setEntryToDelete] = useState<PriceBookEntry | null>(null)
  const [searchText, setSearchText] = useState('')

  // 搜索过滤
  const filteredEntries = entries.filter((entry) => {
    if (!searchText.trim()) return true
    const q = searchText.toLowerCase()
    return (
      entry.category_name.toLowerCase().includes(q) ||
      entry.keywords.some((k) => k.toLowerCase().includes(q)) ||
      entry.platform.toLowerCase().includes(q)
    )
  })

  // 创建
  const handleCreate = async (data: Partial<PriceBookEntry>) => {
    setIsSubmitting(true)
    try {
      await createEntry(data)
      setIsCreateDialogOpen(false)
      toast({ title: '品类创建成功' })
    } catch (e) {
      toast({ title: '创建失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 编辑
  const handleEdit = (entry: PriceBookEntry) => {
    setSelectedEntry(entry)
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async (data: Partial<PriceBookEntry>) => {
    if (!selectedEntry) return
    setIsSubmitting(true)
    try {
      await updateEntry(selectedEntry.id, data)
      setIsEditDialogOpen(false)
      toast({ title: '品类更新成功' })
    } catch (e) {
      toast({ title: '更新失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 删除
  const handleDeleteClick = (entry: PriceBookEntry) => {
    setEntryToDelete(entry)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return
    try {
      await deleteEntry(entryToDelete.id)
      toast({ title: '品类已删除' })
    } catch (e) {
      toast({ title: '删除失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsDeleteDialogOpen(false)
      setEntryToDelete(null)
    }
  }

  // 自动更新行情价
  const handleAutoUpdate = async () => {
    setIsUpdatingPrices(true)
    try {
      await autoUpdatePrices()
      toast({ title: '行情价更新完成' })
    } catch (e) {
      toast({ title: '更新行情价失败', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setIsUpdatingPrices(false)
    }
  }

  return (
    <div>
      {/* 页头 */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">价格本</h1>
            <p className="text-sm text-muted-foreground">
              管理品类定价模板，自动计算收购区间与利润
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoUpdate}
            disabled={isUpdatingPrices}
          >
            <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isUpdatingPrices && 'animate-spin')} />
            {isUpdatingPrices ? '更新中...' : '自动更新行情价'}
          </Button>
          <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            新建品类
          </Button>
        </div>
      </div>

      {/* 搜索 */}
      <div className="mb-4">
        <Input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="搜索品类名称、关键词..."
          className="max-w-sm"
        />
      </div>

      {/* 错误提示 */}
      {error && (
        <div
          className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <strong className="font-bold">出错了! </strong>
          <span>{error.message}</span>
        </div>
      )}

      {/* 统计 */}
      <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span>共 {filteredEntries.length} 个品类</span>
        {searchText && <span>（搜索自 {entries.length} 个品类）</span>}
      </div>

      {/* 表格 */}
      <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">品类名称</TableHead>
              <TableHead className="min-w-[150px]">关联关键词</TableHead>
              <TableHead className="text-center min-w-[80px]">平台</TableHead>
              <TableHead className="text-right min-w-[90px]">新品参考价</TableHead>
              <TableHead className="text-right min-w-[90px]">二手行情价</TableHead>
              <TableHead className="text-right min-w-[90px]">目标出货价</TableHead>
              <TableHead className="text-right min-w-[60px]">运费</TableHead>
              <TableHead className="text-right min-w-[60px]">整备费</TableHead>
              <TableHead className="text-right min-w-[70px]">手续费率</TableHead>
              <TableHead className="text-center min-w-[130px]">收购区间</TableHead>
              <TableHead className="text-center min-w-[100px]">利润率</TableHead>
              <TableHead className="text-right min-w-[100px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                  正在加载中...
                </TableCell>
              </TableRow>
            ) : filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                  {searchText ? '未找到匹配的品类' : '暂无品类，点击「新建品类」开始'}
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-muted/50 transition-colors">
                  {/* 品类名称 */}
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-sm">{entry.category_name}</span>
                      {entry.note && (
                        <span className="text-[11px] text-muted-foreground line-clamp-1">{entry.note}</span>
                      )}
                    </div>
                  </TableCell>

                  {/* 关联关键词 */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {entry.keywords.length > 0 ? (
                        entry.keywords.map((kw) => (
                          <Badge key={kw} variant="secondary" className="text-[11px] font-normal">
                            {kw}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </div>
                  </TableCell>

                  {/* 平台 */}
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[11px]">
                      {getPlatformName(entry.platform)}
                    </Badge>
                  </TableCell>

                  {/* 新品参考价 */}
                  <TableCell className="text-right">
                    <PriceCell value={entry.new_price} />
                  </TableCell>

                  {/* 二手行情价 */}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <PriceCell value={entry.market_price} />
                      <span className={cn(
                        'text-[10px]',
                        entry.market_price_source === 'auto_7d_median' ? 'text-blue-500' : 'text-muted-foreground',
                      )}>
                        {entry.market_price_source === 'auto_7d_median' ? '自动' : '手动'}
                      </span>
                    </div>
                  </TableCell>

                  {/* 目标出货价 */}
                  <TableCell className="text-right">
                    <PriceCell value={entry.target_sell_price} />
                  </TableCell>

                  {/* 运费 */}
                  <TableCell className="text-right">
                    <PriceCell value={entry.fees?.shipping_fee} />
                  </TableCell>

                  {/* 整备费 */}
                  <TableCell className="text-right">
                    <PriceCell value={entry.fees?.refurbish_fee} />
                  </TableCell>

                  {/* 手续费率 */}
                  <TableCell className="text-right">
                    <span className="font-mono text-sm">
                      {((entry.fees?.platform_fee_rate || 0) * 100).toFixed(1)}%
                    </span>
                  </TableCell>

                  {/* 收购区间 */}
                  <TableCell className="text-center">
                    <PurchaseRangeCell entry={entry} />
                  </TableCell>

                  {/* 利润率 */}
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs text-muted-foreground">
                        {(entry.min_profit_rate * 100).toFixed(0)}% ~ {(entry.ideal_profit_rate * 100).toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-muted-foreground">最低 ~ 理想</span>
                    </div>
                  </TableCell>

                  {/* 操作 */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" title="编辑" onClick={() => handleEdit(entry)}>
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="删除"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(entry)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ─── 新建品类弹窗 ─── */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>新建品类</DialogTitle>
            <DialogDescription>
              添加一个品类定价模板，用于自动计算收购区间和利润评估。
            </DialogDescription>
          </DialogHeader>
          <EntryForm mode="create" onSubmit={handleCreate} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              取消
            </Button>
            <Button type="submit" form="price-book-form" disabled={isSubmitting}>
              {isSubmitting ? '创建中...' : '创建品类'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 编辑品类弹窗 ─── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑品类: {selectedEntry?.category_name}</DialogTitle>
            <DialogDescription>修改品类的定价模板和费用配置。</DialogDescription>
          </DialogHeader>
          {selectedEntry && (
            <EntryForm mode="edit" initialData={selectedEntry} onSubmit={handleUpdate} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button type="submit" form="price-book-form" disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存更改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── 删除确认弹窗 ─── */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>删除品类</DialogTitle>
            <DialogDescription>
              {entryToDelete
                ? `确定删除品类「${entryToDelete.category_name}」吗？此操作不可恢复。`
                : '确定删除该品类吗？此操作不可恢复。'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
