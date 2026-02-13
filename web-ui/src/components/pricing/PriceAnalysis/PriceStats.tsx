import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'
import type { BatchStats } from '@/types/pricing'

interface PriceStatsProps {
  stats: BatchStats
  className?: string
}

const STAT_ITEMS: {
  key: keyof Pick<BatchStats, 'avg_price' | 'median_price' | 'min_price' | 'max_price' | 'total_count'>
  label: string
  isCurrency: boolean
}[] = [
  { key: 'avg_price', label: '均价', isCurrency: true },
  { key: 'median_price', label: '中位价', isCurrency: true },
  { key: 'min_price', label: '最低价', isCurrency: true },
  { key: 'max_price', label: '最高价', isCurrency: true },
  { key: 'total_count', label: '商品数量', isCurrency: false },
]

export function PriceStats({ stats, className }: PriceStatsProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">同批次价格统计</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {STAT_ITEMS.map(({ key, label, isCurrency }) => (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-lg font-semibold tabular-nums">
                {isCurrency ? formatPrice(stats[key]) : stats[key]}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
