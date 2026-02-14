import { useMarketTrend } from '@/hooks/marketTrend/useMarketTrend'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'

const TIME_RANGES = [
  { label: '30天', value: 30 },
  { label: '60天', value: 60 },
  { label: '90天', value: 90 },
] as const

export default function MarketTrendPage() {
  const {
    keywords,
    selectedKeyword,
    setSelectedKeyword,
    days,
    setDays,
    data,
    isLoading,
  } = useMarketTrend()

  const hasKeywords = keywords.length > 0
  const trendData = data?.trend ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-foreground">行情走势</h1>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Keyword Selector */}
        <Select
          value={selectedKeyword ?? ''}
          onValueChange={setSelectedKeyword}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="选择品类" />
          </SelectTrigger>
          <SelectContent>
            {keywords.map((kw) => (
              <SelectItem key={kw} value={kw}>
                {kw}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Time Range Buttons */}
        <div className="flex items-center gap-2">
          {TIME_RANGES.map((range) => (
            <Button
              key={range.value}
              variant={days === range.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDays(range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {!hasKeywords && !isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-muted-foreground">暂无数据，请先运行爬虫任务</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-muted-foreground">加载中...</p>
          </CardContent>
        </Card>
      )}

      {/* Price Trend Chart */}
      {!isLoading && hasKeywords && trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>价格走势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="avg_price"
                  name="均价"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="median_price"
                  name="中位价"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="min_price"
                  name="最低价"
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="max_price"
                  name="最高价"
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Volume Chart */}
      {!isLoading && hasKeywords && trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>每日商品数量</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="商品数" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
