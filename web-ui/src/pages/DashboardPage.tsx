import { useEffect, useState } from 'react'
import { useDashboard } from '@/hooks/dashboard/useDashboard'
import { useTasks } from '@/hooks/tasks/useTasks'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { BargainLeaderboard } from '@/components/dashboard/BargainLeaderboard'
import { fetchPriceTrend } from '@/api/dashboard'
import type { PriceTrendPoint } from '@/api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'

export default function DashboardPage() {
  const {
    stats, bargainList, profitSummary, dailyProfit,
    inventorySummary, agingAlerts, teamPerformance, profitByKeyword,
    loading, loadAll
  } = useDashboard()

  useEffect(() => { loadAll() }, [loadAll])

  // Row 1: 核心经营指标 (6 cards)
  const kpiCards = [
    { label: '今日新发现', value: stats?.total_items ?? 0, suffix: '件' },
    { label: '可收商品', value: stats?.low_price_items ?? 0, suffix: '件', highlight: true },
    { label: '本月营收', value: profitSummary?.total_revenue ? `¥${(profitSummary.total_revenue / 1000).toFixed(1)}k` : '¥0' },
    { label: '本月利润', value: profitSummary?.net_profit ? `¥${(profitSummary.net_profit / 1000).toFixed(1)}k` : '¥0' },
    { label: '利润率', value: profitSummary?.avg_profit_rate ? `${profitSummary.avg_profit_rate.toFixed(1)}%` : '0%' },
    { label: '库存货值', value: inventorySummary?.total_value ? `¥${(inventorySummary.total_value / 1000).toFixed(1)}k` : '¥0' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">经营驾驶舱</h1>

      {/* Row 1: KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-2xl font-bold">
                {typeof kpi.value === 'number' ? kpi.value : kpi.value}
                {kpi.suffix && <span className="ml-1 text-sm font-normal text-muted-foreground">{kpi.suffix}</span>}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 2: Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 利润趋势 */}
        <Card>
          <CardHeader><CardTitle className="text-base">利润趋势（最近30天）</CardTitle></CardHeader>
          <CardContent>
            {dailyProfit.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dailyProfit}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={false} name="利润" />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} name="营收" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">暂无利润数据</div>
            )}
          </CardContent>
        </Card>

        {/* 品类利润排行 */}
        <Card>
          <CardHeader><CardTitle className="text-base">品类利润排行</CardTitle></CardHeader>
          <CardContent>
            {profitByKeyword.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={profitByKeyword.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="keyword" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="profit" fill="#10b981" name="利润" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">暂无品类利润数据</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Bargain + Aging */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BargainLeaderboard data={bargainList} loading={loading} />

        <Card>
          <CardHeader><CardTitle className="text-base">库龄预警</CardTitle></CardHeader>
          <CardContent>
            {agingAlerts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品</TableHead>
                    <TableHead>库龄</TableHead>
                    <TableHead>成本</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agingAlerts.slice(0, 8).map((item: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm line-clamp-1">{item.title || item.name || '-'}</TableCell>
                      <TableCell className="text-sm text-red-600">{item.aging_days || item.days || '-'}天</TableCell>
                      <TableCell className="text-sm">¥{item.cost || item.total_cost || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">无库龄预警</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Team + Keywords */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">团队业绩排行</CardTitle></CardHeader>
          <CardContent>
            {teamPerformance.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>成员</TableHead>
                    <TableHead>出货量</TableHead>
                    <TableHead>营收</TableHead>
                    <TableHead>利润</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamPerformance.slice(0, 8).map((member: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="text-sm font-medium">{member.name || member.display_name || '-'}</TableCell>
                      <TableCell className="text-sm">{member.sold_count || 0}件</TableCell>
                      <TableCell className="text-sm">¥{member.revenue || 0}</TableCell>
                      <TableCell className="text-sm text-green-600">¥{member.profit || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">暂无团队数据</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">品类行情速报</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              行情数据同步中...
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
