import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PriceTrendPoint } from '@/api/dashboard'

interface PriceTrendChartProps {
  data: PriceTrendPoint[]
  loading?: boolean
}

export function PriceTrendChart({ data, loading }: PriceTrendChartProps) {
  // 确保 data 始终是数组，防止 recharts 内部调用 .slice 报错
  const safeData = Array.isArray(data) ? data : []

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="text-base">价格趋势</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : safeData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            请选择任务以查看价格趋势
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={safeData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(v: number) => `¥${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))',
                }}
                formatter={(value: number | undefined, name: string | undefined) => {
                  const labels: Record<string, string> = {
                    avg_price: '平均价格',
                    min_price: '最低价格',
                    max_price: '最高价格',
                  }
                  return [`¥${(value ?? 0).toFixed(0)}`, labels[name ?? ''] ?? name ?? '']
                }}
              />
              <Legend
                formatter={(value: string) => {
                  const labels: Record<string, string> = {
                    avg_price: '平均价格',
                    min_price: '最低价格',
                    max_price: '最高价格',
                  }
                  return labels[value] || value
                }}
              />
              <Line
                type="monotone"
                dataKey="avg_price"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="min_price"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="max_price"
                stroke="hsl(0, 84%, 60%)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
