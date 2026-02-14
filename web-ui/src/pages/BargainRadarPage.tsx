import { useEffect } from 'react'
import {
  useBargainRadar,
  type BargainFilters,
  type BargainStatus,
  type BargainSortBy,
} from '@/hooks/bargainRadar/useBargainRadar'
import type { BargainItem } from '@/api/bargainRadar'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

// ─── 状态配置 ───────────────────────────────────────────────
const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  great_deal: {
    label: '超值捡漏',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  },
  good_deal: {
    label: '可收',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  overpriced: {
    label: '超出区间',
    className: 'bg-red-100 text-red-700 border-red-300',
  },
  no_config: {
    label: '未配置',
    className: 'bg-gray-100 text-gray-500 border-gray-300',
  },
}

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status]
  if (!config) return <Badge variant="outline">未知</Badge>
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        config.className,
      )}
    >
      {config.label}
    </span>
  )
}

// ─── 价格格式化 ─────────────────────────────────────────────
function fmtPrice(val: number | null | undefined): string {
  if (val === null || val === undefined) return '-'
  return `¥${val.toFixed(0)}`
}

function fmtRate(val: number | null | undefined): string {
  if (val === null || val === undefined) return '-'
  return `${(val * 100).toFixed(1)}%`
}

function fmtPurchaseRange(range: [number | null, number | null] | undefined): string {
  if (!range) return '-'
  const [low, high] = range
  if (low === null && high === null) return '-'
  return `${low !== null ? `¥${low.toFixed(0)}` : '?'} ~ ${high !== null ? `¥${high.toFixed(0)}` : '?'}`
}

function parseItemPrice(priceStr: string): number {
  return parseFloat(String(priceStr).replace('¥', '').replace(',', '').trim()) || 0
}

// ─── 统计卡片 ───────────────────────────────────────────────
interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  color?: string
}

function StatCard({ title, value, subtitle, color = 'text-foreground' }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', color)}>{value}</div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── 主体表格行 ─────────────────────────────────────────────
function BargainRow({
  bargain,
  onAddToPurchase,
  isAdding,
}: {
  bargain: BargainItem
  onAddToPurchase: (b: BargainItem) => void
  isAdding: boolean
}) {
  const info = bargain.item.商品信息
  const evaluation = bargain.evaluation
  const ai = bargain.item.ai_analysis
  const platform = bargain.item.platform || '闲鱼'
  const price = parseItemPrice(info.当前售价)

  const aiScore = ai?.is_recommended === true
    ? '推荐'
    : ai?.is_recommended === false
      ? '不推荐'
      : '-'

  return (
    <TableRow
      className={cn(
        evaluation.status === 'great_deal' && 'bg-emerald-50/50',
        evaluation.status === 'good_deal' && 'bg-blue-50/30',
      )}
    >
      <TableCell className="max-w-[280px]">
        <a
          href={info.商品链接}
          target="_blank"
          rel="noopener noreferrer"
          className="line-clamp-2 text-sm font-medium text-blue-600 hover:underline"
        >
          {info.商品标题}
        </a>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {bargain.item.搜索关键字}
        </p>
      </TableCell>
      <TableCell className="text-sm">{platform}</TableCell>
      <TableCell className="text-sm font-semibold text-red-600">
        ¥{price.toFixed(0)}
      </TableCell>
      <TableCell className="text-sm">
        {fmtPurchaseRange(evaluation.purchase_range)}
      </TableCell>
      <TableCell
        className={cn(
          'text-sm font-semibold',
          evaluation.profit !== null && evaluation.profit > 0
            ? 'text-emerald-600'
            : evaluation.profit !== null && evaluation.profit < 0
              ? 'text-red-600'
              : '',
        )}
      >
        {fmtPrice(evaluation.profit)}
      </TableCell>
      <TableCell
        className={cn(
          'text-sm font-semibold',
          evaluation.profit_rate !== null && evaluation.profit_rate > 0
            ? 'text-emerald-600'
            : evaluation.profit_rate !== null && evaluation.profit_rate < 0
              ? 'text-red-600'
              : '',
        )}
      >
        {fmtRate(evaluation.profit_rate)}
      </TableCell>
      <TableCell>
        <span
          className={cn(
            'text-xs font-medium',
            aiScore === '推荐' ? 'text-emerald-600' : aiScore === '不推荐' ? 'text-red-500' : 'text-muted-foreground',
          )}
        >
          {aiScore}
        </span>
      </TableCell>
      <TableCell>
        <StatusBadge status={evaluation.status} />
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant={
            evaluation.status === 'great_deal'
              ? 'default'
              : 'outline'
          }
          disabled={isAdding}
          onClick={() => onAddToPurchase(bargain)}
          className="whitespace-nowrap text-xs"
        >
          {isAdding ? '添加中...' : '加入采购'}
        </Button>
      </TableCell>
    </TableRow>
  )
}

// ─── 捡漏雷达页面 ───────────────────────────────────────────
export default function BargainRadarPage() {
  const {
    items,
    keywords,
    summary,
    filters,
    setFilters,
    isLoading,
    addingIds,
    refresh,
    addToPurchase,
  } = useBargainRadar()

  useEffect(() => {
    refresh()
  }, [refresh])

  const updateFilter = <K extends keyof BargainFilters>(
    key: K,
    value: BargainFilters[K],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">捡漏雷达</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            自动扫描全部监控商品，智能评估利润空间
          </p>
        </div>
        <Button onClick={refresh} disabled={isLoading}>
          {isLoading ? '扫描中...' : '刷新扫描'}
        </Button>
      </div>

      {/* 顶部汇总卡片 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="今日商品总数"
          value={String(summary.totalCount)}
          subtitle="全部监控关键词"
        />
        <StatCard
          title="可收商品数量"
          value={String(summary.profitableCount)}
          subtitle="超值捡漏 + 可收"
          color="text-emerald-600"
        />
        <StatCard
          title="预估总利润"
          value={`¥${summary.estimatedTotalProfit.toFixed(0)}`}
          subtitle="可盈利商品合计"
          color="text-blue-600"
        />
        <StatCard
          title="平均利润率"
          value={
            summary.averageProfitRate
              ? `${(summary.averageProfitRate * 100).toFixed(1)}%`
              : '-'
          }
          subtitle="有评估数据的商品"
          color="text-amber-600"
        />
      </div>

      {/* 筛选条 */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/50 p-4">
        {/* 品类/关键词选择器 */}
        <Select
          value={filters.keyword || '__all__'}
          onValueChange={(v) => updateFilter('keyword', v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="全部关键词" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">全部关键词</SelectItem>
            {keywords.map((kw) => (
              <SelectItem key={kw} value={kw}>
                {kw}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 状态筛选 */}
        <Select
          value={filters.status}
          onValueChange={(v) => updateFilter('status', v as BargainStatus)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="great_deal">超值捡漏</SelectItem>
            <SelectItem value="good_deal">可收</SelectItem>
            <SelectItem value="overpriced">超出区间</SelectItem>
            <SelectItem value="no_config">未配置</SelectItem>
          </SelectContent>
        </Select>

        {/* 排序 */}
        <Select
          value={filters.sortBy}
          onValueChange={(v) => updateFilter('sortBy', v as BargainSortBy)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="profit_rate">按利润率</SelectItem>
            <SelectItem value="profit">按利润金额</SelectItem>
            <SelectItem value="crawl_time">按爬取时间</SelectItem>
          </SelectContent>
        </Select>

        {/* 仅看AI推荐 */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="ai-recommended-only"
            checked={filters.aiRecommendedOnly}
            onCheckedChange={(checked) =>
              updateFilter('aiRecommendedOnly', checked === true)
            }
          />
          <Label htmlFor="ai-recommended-only" className="cursor-pointer text-sm">
            仅看AI推荐
          </Label>
        </div>

        <div className="ml-auto text-sm text-muted-foreground">
          共 {items.length} 件商品
        </div>
      </div>

      {/* 主体表格 */}
      {isLoading ? (
        <div className="py-20 text-center text-muted-foreground">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/30 border-t-primary" />
          正在扫描全部商品并评估利润...
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <p className="text-lg">暂无商品数据</p>
          <p className="mt-2 text-sm">
            请先在任务管理中创建并运行监控任务，同时在价格本中配置收购区间
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">商品标题</TableHead>
                <TableHead className="w-[80px]">平台</TableHead>
                <TableHead className="w-[80px]">售价</TableHead>
                <TableHead className="w-[120px]">收购区间</TableHead>
                <TableHead className="w-[90px]">预估利润</TableHead>
                <TableHead className="w-[80px]">利润率</TableHead>
                <TableHead className="w-[70px]">AI评分</TableHead>
                <TableHead className="w-[100px]">状态</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((bargain) => (
                <BargainRow
                  key={bargain.item.商品信息.商品ID}
                  bargain={bargain}
                  onAddToPurchase={addToPurchase}
                  isAdding={addingIds.has(bargain.item.商品信息.商品ID)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
