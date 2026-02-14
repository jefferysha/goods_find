import { useEffect, useState, useCallback } from 'react'
import { useProfit } from '@/hooks/profit/useProfit'
import { getROIOverview, type ROIOverview } from '@/api/profit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'

export default function ProfitPage() {
  const {
    records,
    summary,
    byKeyword,
    byAssignee,
    dailyTrend,
    isLoading,
    dateRange,
    setDateRange,
    refresh,
  } = useProfit()

  // ROI Overview
  const [roiOverview, setRoiOverview] = useState<ROIOverview | null>(null)

  const fetchROI = useCallback(async (filters?: Record<string, any>) => {
    try {
      const data = await getROIOverview(filters)
      setRoiOverview(data)
    } catch (e) {
      console.error('获取ROI概览失败:', e)
    }
  }, [])

  useEffect(() => {
    refresh()
    fetchROI()
  }, [refresh, fetchROI])

  const handleDateChange = (field: 'start_date' | 'end_date', value: string) => {
    const newRange = { ...dateRange, [field]: value || undefined }
    setDateRange(newRange)
    refresh(newRange)
  }

  const formatCurrency = (val: number | undefined | null) => {
    if (val == null) return '¥0'
    return `¥${val.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  const formatPercent = (val: number | undefined | null) => {
    if (val == null) return '0%'
    return `${(val * 100).toFixed(1)}%`
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">利润核算</h1>
        <Button variant="outline" onClick={() => refresh()}>
          刷新
        </Button>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">起始日期</Label>
          <Input
            type="date"
            className="w-[160px]"
            value={dateRange.start_date ?? ''}
            onChange={(e) => handleDateChange('start_date', e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">截止日期</Label>
          <Input
            type="date"
            className="w-[160px]"
            value={dateRange.end_date ?? ''}
            onChange={(e) => handleDateChange('end_date', e.target.value)}
          />
        </div>
        {(dateRange.start_date || dateRange.end_date) && (
          <Button variant="ghost" size="sm" onClick={() => { setDateRange({}); refresh({}) }}>
            清除筛选
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">本期已出</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_sold ?? 0}</div>
              <p className="text-xs text-muted-foreground">件商品</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总营收</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.total_revenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总成本</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.total_cost)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">净利润</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(summary.net_profit ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatCurrency(summary.net_profit)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">平均利润率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(summary.avg_profit_rate ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {formatPercent(summary.avg_profit_rate)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ROI Overview */}
      {roiOverview && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">ROI 投入产出分析</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800">
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">总体 ROI</p>
                <p className={`text-2xl font-bold ${roiOverview.overall_roi >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-red-500'}`}>
                  {roiOverview.overall_roi.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground font-medium">平均库龄</p>
                <p className="text-2xl font-bold">{roiOverview.avg_holding_days.toFixed(1)}天</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground font-medium">已出件数</p>
                <p className="text-2xl font-bold">{roiOverview.count}</p>
              </CardContent>
            </Card>
          </div>

          {/* Keyword ROI Ranking */}
          {roiOverview.keyword_ranking.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">品类 ROI 排名</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {roiOverview.keyword_ranking.slice(0, 8).map((kw, idx) => (
                    <div key={kw.keyword} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx < 3 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' : 'bg-muted text-muted-foreground'}`}>
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium flex-1 truncate">{kw.keyword}</span>
                      <span className={`text-sm font-bold ${kw.roi >= 0 ? 'text-green-600' : 'text-red-500'}`}>{kw.roi.toFixed(1)}%</span>
                      <span className="text-xs text-muted-foreground">利润 ¥{kw.total_profit.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily Profit Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">每日利润趋势</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    className="text-xs"
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis className="text-xs" tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      const labelMap: Record<string, string> = { profit: '利润', revenue: '营收', cost: '成本' }
                      return [`¥${Number(value).toLocaleString()}`, labelMap[String(name)] || String(name)]
                    }}
                    labelFormatter={(label: any) => `日期：${label}`}
                  />
                  <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} name="profit" dot={false} />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={1.5} name="revenue" dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={1.5} name="cost" dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {isLoading ? '加载中...' : '暂无趋势数据'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Keyword Profit Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">品类利润排行</CardTitle>
          </CardHeader>
          <CardContent>
            {byKeyword.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={byKeyword.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="keyword"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      const labelMap: Record<string, string> = { net_profit: '净利润', total_revenue: '营收' }
                      return [`¥${Number(value).toLocaleString()}`, labelMap[String(name)] || String(name)]
                    }}
                  />
                  <Bar dataKey="net_profit" fill="#22c55e" name="net_profit" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {isLoading ? '加载中...' : '暂无品类数据'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assignee Performance Table */}
      {byAssignee.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">成员业绩</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>成员</TableHead>
                  <TableHead className="text-right">已出件数</TableHead>
                  <TableHead className="text-right">总营收</TableHead>
                  <TableHead className="text-right">总成本</TableHead>
                  <TableHead className="text-right">净利润</TableHead>
                  <TableHead className="text-right">平均利润率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byAssignee.map((row) => (
                  <TableRow key={row.assignee}>
                    <TableCell className="font-medium">{row.assignee || '未分配'}</TableCell>
                    <TableCell className="text-right">{row.sold_count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_revenue)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_cost)}</TableCell>
                    <TableCell className="text-right">
                      <span className={row.net_profit >= 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                        {formatCurrency(row.net_profit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={row.avg_profit_rate >= 0.2 ? 'default' : row.avg_profit_rate >= 0 ? 'secondary' : 'destructive'}>
                        {formatPercent(row.avg_profit_rate)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Sales Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">销售明细</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>商品名称</TableHead>
                  <TableHead className="w-[80px] text-right">收购价</TableHead>
                  <TableHead className="w-[80px] text-right">费用</TableHead>
                  <TableHead className="w-[80px] text-right">总成本</TableHead>
                  <TableHead className="w-[80px] text-right">售价</TableHead>
                  <TableHead className="w-[90px] text-right">净利润</TableHead>
                  <TableHead className="w-[70px] text-right">利润率</TableHead>
                  <TableHead className="w-[90px]">售出日期</TableHead>
                  <TableHead className="w-[70px]">渠道</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      暂无销售记录
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground line-clamp-1">{record.title}</p>
                          <p className="text-xs text-muted-foreground">{record.keyword}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">¥{record.purchase_price}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        ¥{(record.shipping_fee + record.refurbish_fee + record.platform_fee + record.other_fee).toFixed(0)}
                      </TableCell>
                      <TableCell className="text-right font-medium">¥{record.total_cost}</TableCell>
                      <TableCell className="text-right font-medium text-blue-600">¥{record.sold_price}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${record.net_profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {record.net_profit >= 0 ? '+' : ''}{formatCurrency(record.net_profit)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={record.profit_rate >= 0.2 ? 'default' : record.profit_rate >= 0 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {formatPercent(record.profit_rate)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(record.sold_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{record.sold_channel}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
