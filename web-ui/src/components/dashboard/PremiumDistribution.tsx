import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DistributionItem {
  label: string
  count: number
  percentage: number
}

interface PremiumDistData {
  task_id?: number | null
  total?: number
  avg_price?: number
  distribution?: DistributionItem[]
}

interface PremiumDistributionProps {
  data: PremiumDistData | Record<string, number>
  loading?: boolean
}

// 分布区间对应的颜色
const BRACKET_COLORS = [
  'hsl(0, 84%, 60%)',     // 极低价 - 红色（可能有风险）
  'hsl(142, 76%, 36%)',   // 低价 - 绿色（捡漏）
  'hsl(217, 91%, 60%)',   // 合理价 - 蓝色
  'hsl(38, 92%, 50%)',    // 偏高 - 橙色
  'hsl(0, 72%, 50%)',     // 高价 - 深红
]

interface ChartDataItem {
  name: string
  value: number
  color: string
}

export function PremiumDistribution({ data, loading }: PremiumDistributionProps) {
  // 适配新格式 { distribution: [...] } 和旧格式 { low_price: 0, fair: 0, ... }
  let chartData: ChartDataItem[] = []

  const safeData = data && typeof data === 'object' ? data : {}

  if ('distribution' in safeData && Array.isArray((safeData as PremiumDistData).distribution)) {
    // 新格式
    chartData = ((safeData as PremiumDistData).distribution || [])
      .filter((d) => d.count > 0)
      .map((d, i) => ({
        name: d.label,
        value: d.count,
        color: BRACKET_COLORS[i % BRACKET_COLORS.length],
      }))
  } else {
    // 兼容旧格式 { low_price: 0, fair: 0, ... }
    const SEGMENT_CONFIG: Record<string, { label: string; color: string }> = {
      low_price: { label: '低价捡漏', color: 'hsl(142, 76%, 36%)' },
      fair: { label: '价格合理', color: 'hsl(217, 91%, 60%)' },
      slight_premium: { label: '轻微溢价', color: 'hsl(38, 92%, 50%)' },
      high_premium: { label: '高溢价', color: 'hsl(0, 84%, 60%)' },
    }
    chartData = Object.entries(safeData)
      .filter(([k, v]) => typeof v === 'number' && v > 0 && k !== 'task_id' && k !== 'total')
      .map(([key, value]) => ({
        name: SEGMENT_CONFIG[key]?.label || key,
        value: value as number,
        color: SEGMENT_CONFIG[key]?.color || 'hsl(var(--muted))',
      }))
  }

  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="text-base">溢价率分布</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : total === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            暂无分布数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }: { name?: string; percent?: number }) =>
                  `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))',
                }}
                formatter={(value: number | undefined) => [`${value ?? 0} 个`, '数量']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
