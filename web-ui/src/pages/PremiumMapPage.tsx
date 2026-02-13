import { RefreshCw, MapPin } from 'lucide-react'
import { useState } from 'react'
import { usePremiumMap } from '@/hooks/premiumMap/usePremiumMap'
import { cn } from '@/lib/utils'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ItemListDialog } from '@/components/premiumMap/ItemListDialog'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'

import type { CategoryOverview } from '@/api/premiumMap'

// ─── 品类卡片 ─────────────────────────────────────────────────
function CategoryCard({
  category,
  isSelected,
  onSelect,
}: {
  category: CategoryOverview
  isSelected: boolean
  onSelect: () => void
}) {
  const medianVsMarket = category.median_price < category.market_price
  const premiumIsNeg = category.avg_premium_rate < 0

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary',
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span>{category.category_name}</span>
          {category.good_deal_count > 0 && (
            <Badge variant="default" className="text-[11px]">
              {category.good_deal_count} 件可收
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>在监控</span>
          <span className="font-medium text-foreground">{category.total_items} 件</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>行情均价</span>
          <span className="font-mono font-medium text-foreground">
            ¥{category.market_price.toFixed(0)}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>当前中位价</span>
          <span
            className={cn(
              'font-mono font-medium',
              medianVsMarket ? 'text-emerald-600' : 'text-red-500',
            )}
          >
            ¥{category.median_price.toFixed(0)}
            {medianVsMarket ? ' ↓' : ' ↑'}
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>平均溢价率</span>
          <span
            className={cn(
              'font-mono font-medium',
              premiumIsNeg ? 'text-emerald-600' : 'text-red-500',
            )}
          >
            {category.avg_premium_rate > 0 ? '+' : ''}
            {category.avg_premium_rate.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>可收商品</span>
          <span className="font-medium text-foreground">{category.good_deal_count} 件</span>
        </div>
        {(category.purchase_range[0] !== null || category.purchase_range[1] !== null) && (
          <div className="flex justify-between text-muted-foreground">
            <span>收购区间</span>
            <span className="font-mono text-xs font-medium text-foreground">
              ¥{category.purchase_range[0] ?? '--'} ~ ¥{category.purchase_range[1] ?? '--'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── 价格分布直方图 ─────────────────────────────────────────────
function DistributionChart({
  distribution,
  isLoading,
}: {
  distribution: NonNullable<ReturnType<typeof usePremiumMap>['distribution']>
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        加载分布数据中...
      </div>
    )
  }

  const { bins, reference_lines } = distribution

  if (!bins || bins.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        暂无分布数据
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={bins} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: any) => [`${Number(value)} 件`, '商品数']}
          labelFormatter={(label: any) => `价格区间: ${String(label)}`}
        />
        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />

        {/* 参考线 */}
        {reference_lines.market_price != null && (
          <ReferenceLine
            y={reference_lines.market_price}
            stroke="#3b82f6"
            strokeWidth={2}
            label={{
              value: `行情价 ¥${reference_lines.market_price}`,
              position: 'insideTopRight',
              fill: '#3b82f6',
              fontSize: 11,
            }}
          />
        )}
        {reference_lines.new_price != null && (
          <ReferenceLine
            y={reference_lines.new_price}
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            label={{
              value: `新品价 ¥${reference_lines.new_price}`,
              position: 'insideTopRight',
              fill: '#9ca3af',
              fontSize: 11,
            }}
          />
        )}
        {reference_lines.purchase_ideal != null && (
          <ReferenceLine
            y={reference_lines.purchase_ideal}
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            label={{
              value: `理想收购 ¥${reference_lines.purchase_ideal}`,
              position: 'insideTopLeft',
              fill: '#22c55e',
              fontSize: 11,
            }}
          />
        )}
        {reference_lines.purchase_upper != null && (
          <ReferenceLine
            y={reference_lines.purchase_upper}
            stroke="#22c55e"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            label={{
              value: `收购上限 ¥${reference_lines.purchase_upper}`,
              position: 'insideBottomLeft',
              fill: '#22c55e',
              fontSize: 11,
            }}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── 主页面 ───────────────────────────────────────────────────
export default function PremiumMapPage() {
  const {
    categories,
    selectedKeyword,
    setSelectedKeyword,
    distribution,
    isLoading,
    isDistLoading,
    refresh,
  } = usePremiumMap()
  
  const [selectedCategory, setSelectedCategory] = useState<CategoryOverview | null>(null)
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  
  const handleCategoryClick = (category: CategoryOverview) => {
    setSelectedCategory(category)
    setIsItemDialogOpen(true)
  }

  return (
    <div>
      {/* 页头 */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">溢价地图</h1>
            <p className="text-sm text-muted-foreground">
              按品类查看溢价概览与价格分布
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn('mr-1.5 h-3.5 w-3.5', isLoading && 'animate-spin')} />
          {isLoading ? '刷新中...' : '刷新'}
        </Button>
      </div>

      {/* Loading 状态 */}
      {isLoading && categories.length === 0 && (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          加载中...
        </div>
      )}

      {/* 空状态 */}
      {!isLoading && categories.length === 0 && (
        <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
          <MapPin className="h-10 w-10 opacity-30" />
          <p>暂无价格本数据，请先在价格本页面添加品类</p>
        </div>
      )}

      {/* 品类卡片网格 */}
      {categories.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              isSelected={selectedKeyword === cat.keywords[0]}
              onSelect={() => handleCategoryClick(cat)}
            />
          ))}
        </div>
      )}

      {/* 价格分布直方图 */}
      {selectedKeyword && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            价格分布 — {selectedKeyword}
          </h2>
          {distribution ? (
            <Card>
              <CardContent className="pt-6">
                <DistributionChart distribution={distribution} isLoading={isDistLoading} />

                {/* 图例 */}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-500" />
                    行情价
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-400" />
                    新品价
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm border border-dashed border-emerald-500 bg-emerald-100" />
                    收购区间
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : isDistLoading ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              加载分布数据中...
            </div>
          ) : null}
        </div>
      )}
      
      {/* 商品列表弹窗 */}
      <ItemListDialog
        open={isItemDialogOpen}
        onOpenChange={setIsItemDialogOpen}
        category={selectedCategory}
      />
    </div>
  )
}
