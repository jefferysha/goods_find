import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts'
import type { PriceHistory } from '@/types/history'

interface PriceHistoryChartProps {
  history: PriceHistory
}

export function PriceHistoryChart({ history }: PriceHistoryChartProps) {
  const { entries } = history

  if (entries.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-xs text-muted-foreground">
        暂无历史价格数据
      </div>
    )
  }

  // Find the lowest-price entry to mark a drop
  const sortedByPrice = [...entries].sort((a, b) => a.price - b.price)
  const minEntry = sortedByPrice[0]

  // Format data for chart
  const data = entries.map((e) => ({
    time: new Date(e.crawl_time).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    }),
    price: e.price,
    crawl_time: e.crawl_time,
  }))

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
        <YAxis
          tick={{ fontSize: 10 }}
          domain={['auto', 'auto']}
          tickFormatter={(v: number) => `¥${v}`}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            color: 'hsl(var(--popover-foreground))',
            fontSize: '12px',
          }}
          formatter={(value: number | undefined) => [`¥${value ?? 0}`, '价格']}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="hsl(217, 91%, 60%)"
          strokeWidth={2}
          dot={{ r: 2 }}
          activeDot={{ r: 4 }}
        />
        {minEntry && entries.length > 1 && (
          <ReferenceDot
            x={new Date(minEntry.crawl_time).toLocaleDateString('zh-CN', {
              month: 'short',
              day: 'numeric',
            })}
            y={minEntry.price}
            r={5}
            fill="hsl(0, 84%, 60%)"
            stroke="none"
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
