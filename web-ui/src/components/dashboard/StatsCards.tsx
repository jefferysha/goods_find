import { ListTodo, Play, Database, TrendingDown, Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardStats } from '@/api/dashboard'

interface StatsCardsProps {
  stats: DashboardStats | null
  loading?: boolean
}

interface StatCardItem {
  title: string
  value: string | number
  icon: React.ReactNode
  description?: string
}

function StatCard({ title, value, icon, description }: StatCardItem) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-24 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const items: StatCardItem[] = [
    {
      title: '总任务数',
      value: stats.total_tasks,
      icon: <ListTodo className="h-4 w-4 text-primary" />,
      description: `${stats.active_tasks} 个运行中`,
    },
    {
      title: '已接入平台',
      value: `${stats.enabled_platforms ?? 1}/${stats.total_platforms ?? 5}`,
      icon: <Globe className="h-4 w-4 text-orange-500" />,
      description: '已接入 / 总平台数',
    },
    {
      title: '结果总数',
      value: stats.total_items,
      icon: <Database className="h-4 w-4 text-blue-500" />,
      description: '所有任务累计采集',
    },
    {
      title: '低价捡漏',
      value: stats.low_price_items,
      icon: <TrendingDown className="h-4 w-4 text-emerald-500" />,
      description: `${stats.high_premium_items} 个高溢价`,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <StatCard key={item.title} {...item} />
      ))}
    </div>
  )
}
