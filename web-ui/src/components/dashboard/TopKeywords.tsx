import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TopKeywordsProps {
  data: { keyword: string; count: number }[]
  loading?: boolean
}

export function TopKeywords({ data, loading }: TopKeywordsProps) {
  // 确保 data 是数组
  const safeData = Array.isArray(data) ? data : []
  // Sort descending and take top 10
  const sorted = [...safeData].sort((a, b) => b.count - a.count).slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">热门关键词</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            暂无关键词数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={sorted}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="keyword"
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--popover-foreground))',
                }}
                formatter={(value: number | undefined) => [`${value ?? 0} 个`, '商品数']}
              />
              <Bar
                dataKey="count"
                fill="hsl(217, 91%, 60%)"
                radius={[0, 4, 4, 0]}
                barSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
