import { useEffect, useState } from 'react'
import { useTeam } from '@/hooks/team/useTeam'
import { useWorkspace } from '@/hooks/team/useWorkspace'
import type { TeamMember, TeamPerformance } from '@/types/team'
import type { PurchaseItem, PurchaseStatus } from '@/types/purchase'
import { cn } from '@/lib/utils'
import { getStoredUser } from '@/api/http'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// ─── 工具 ────────────────────────────────────────────────────
function fmtMoney(val: number | undefined | null): string {
  if (val === undefined || val === null) return '-'
  return `¥${val.toFixed(0)}`
}

function fmtRate(val: number | undefined | null): string {
  if (val === undefined || val === null) return '-'
  return `${(val * 100).toFixed(1)}%`
}

const ROLE_MAP: Record<string, { label: string; className: string }> = {
  admin: { label: '管理员', className: 'bg-purple-100 text-purple-700 border-purple-300' },
  member: { label: '成员', className: 'bg-sky-100 text-sky-700 border-sky-300' },
}

const PURCHASE_STATUS_CONFIG: Record<PurchaseStatus, { label: string; className: string }> = {
  new: { label: '待联系', className: 'bg-yellow-100 text-yellow-700' },
  contacting: { label: '联系中', className: 'bg-blue-100 text-blue-700' },
  negotiating: { label: '议价中', className: 'bg-amber-100 text-amber-700' },
  purchased: { label: '已采购', className: 'bg-emerald-100 text-emerald-700' },
  abandoned: { label: '已放弃', className: 'bg-gray-100 text-gray-500' },
}

// ─── 成员卡片 ────────────────────────────────────────────────
function MemberCard({
  member,
  onSelect,
}: {
  member: TeamMember
  onSelect: (m: TeamMember) => void
}) {
  const role = ROLE_MAP[member.role] || ROLE_MAP.member
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onSelect(member)}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-lg font-bold text-white">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt={member.display_name}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            member.display_name?.charAt(0) || member.username?.charAt(0) || '?'
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold">{member.display_name}</p>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                role.className,
              )}
            >
              {role.label}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">@{member.username}</p>
          {member.focus_keywords && member.focus_keywords.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {member.focus_keywords.slice(0, 3).map((kw) => (
                <Badge key={kw} variant="secondary" className="text-[10px]">
                  {kw}
                </Badge>
              ))}
              {member.focus_keywords.length > 3 && (
                <Badge variant="outline" className="text-[10px]">
                  +{member.focus_keywords.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0 text-muted-foreground">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── 业绩排行表格 ───────────────────────────────────────────
function PerformanceTable({ data }: { data: TeamPerformance[] }) {
  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        暂无业绩数据
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>排名</TableHead>
            <TableHead>成员</TableHead>
            <TableHead className="text-right">采购数</TableHead>
            <TableHead className="text-right">出货数</TableHead>
            <TableHead className="text-right">营收</TableHead>
            <TableHead className="text-right">成本</TableHead>
            <TableHead className="text-right">利润</TableHead>
            <TableHead className="text-right">利润率</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow key={row.user_id}>
              <TableCell>
                <span
                  className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                    idx === 0
                      ? 'bg-yellow-100 text-yellow-700'
                      : idx === 1
                        ? 'bg-gray-100 text-gray-600'
                        : idx === 2
                          ? 'bg-amber-100 text-amber-700'
                          : 'text-muted-foreground',
                  )}
                >
                  {idx + 1}
                </span>
              </TableCell>
              <TableCell className="font-medium">{row.display_name}</TableCell>
              <TableCell className="text-right">{row.purchased_count}</TableCell>
              <TableCell className="text-right">{row.sold_count}</TableCell>
              <TableCell className="text-right">{fmtMoney(row.revenue)}</TableCell>
              <TableCell className="text-right">{fmtMoney(row.cost)}</TableCell>
              <TableCell
                className={cn(
                  'text-right font-semibold',
                  row.profit > 0 ? 'text-emerald-600' : row.profit < 0 ? 'text-red-600' : '',
                )}
              >
                {fmtMoney(row.profit)}
              </TableCell>
              <TableCell className="text-right">{fmtRate(row.profit_rate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// ─── 个人工作台指标卡片 ─────────────────────────────────────
interface MetricCardProps {
  title: string
  value: string
  color?: string
}

function MetricCard({ title, value, color = 'text-foreground' }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', color)}>{value}</div>
      </CardContent>
    </Card>
  )
}

// ─── 待办分组 ───────────────────────────────────────────────
function TodoGroup({
  title,
  items,
  statusKey,
}: {
  title: string
  items: PurchaseItem[]
  statusKey: PurchaseStatus
}) {
  const config = PURCHASE_STATUS_CONFIG[statusKey]
  const filtered = items.filter((item) => item.status === statusKey)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Badge variant="secondary" className="text-xs">
          {filtered.length}
        </Badge>
      </div>
      {filtered.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">暂无</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>¥{item.price?.toFixed(0) || '-'}</span>
                  <span>·</span>
                  <span>{item.keyword}</span>
                </div>
              </div>
              <span
                className={cn(
                  'ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                  config.className,
                )}
              >
                {config.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 个人工作台视图 ─────────────────────────────────────────
function PersonalWorkspace({
  userId,
  onBack,
}: {
  userId: number
  onBack: () => void
}) {
  const { workspaceData, isLoading, refresh } = useWorkspace()

  useEffect(() => {
    refresh(userId)
  }, [userId, refresh])

  if (isLoading) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/30 border-t-primary" />
        加载工作台数据...
      </div>
    )
  }

  if (!workspaceData) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        无法加载工作台数据
      </div>
    )
  }

  const { member, todos = [], inventory_summary, performance } = workspaceData

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← 返回
          </Button>
          <div>
            <h2 className="text-xl font-bold">
              {member.display_name} 的工作台
            </h2>
            <p className="text-sm text-muted-foreground">
              @{member.username} · {ROLE_MAP[member.role]?.label || '成员'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refresh(userId)}
        >
          刷新
        </Button>
      </div>

      {/* 本月业绩 */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">本月业绩</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="已出件数"
            value={String(performance?.sold_count ?? 0)}
          />
          <MetricCard
            title="营收"
            value={fmtMoney(performance?.revenue)}
            color="text-blue-600"
          />
          <MetricCard
            title="利润"
            value={fmtMoney(performance?.profit)}
            color={performance?.profit > 0 ? 'text-emerald-600' : 'text-red-600'}
          />
          <MetricCard
            title="利润率"
            value={fmtRate(performance?.profit_rate)}
            color="text-amber-600"
          />
        </div>
      </div>

      {/* 下方两栏 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 左侧：待办 */}
        <Card>
          <CardHeader>
            <CardTitle>我的待办</CardTitle>
            <CardDescription>
              按状态分组的采购项
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TodoGroup title="待联系" items={todos} statusKey="new" />
            <TodoGroup title="议价中" items={todos} statusKey="negotiating" />
            <TodoGroup title="联系中" items={todos} statusKey="contacting" />
          </CardContent>
        </Card>

        {/* 右侧：库存摘要 */}
        <Card>
          <CardHeader>
            <CardTitle>我的库存摘要</CardTitle>
            <CardDescription>当前库存状态概览</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {inventory_summary?.on_sale ?? 0}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">在售件数</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {inventory_summary?.refurbishing ?? 0}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">整备中</p>
              </div>
              <div className="rounded-lg bg-red-50 p-4 text-center">
                <p className="text-2xl font-bold text-red-600">
                  {inventory_summary?.age_warning ?? 0}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">库龄预警</p>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              * 库龄预警：在库超过 30 天的商品
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── 管理员视图（团队总览） ─────────────────────────────────
function AdminView({
  members,
  performance,
  isLoading,
  onSelectMember,
  onRefresh,
}: {
  members: TeamMember[]
  performance: TeamPerformance[]
  isLoading: boolean
  onSelectMember: (m: TeamMember) => void
  onRefresh: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">团队工作台</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理团队成员，查看业绩排行
          </p>
        </div>
        <Button onClick={onRefresh} disabled={isLoading}>
          {isLoading ? '加载中...' : '刷新'}
        </Button>
      </div>

      {/* 成员列表 */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">团队成员</h3>
        {members.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            暂无成员数据
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <MemberCard
                key={member.user_id}
                member={member}
                onSelect={onSelectMember}
              />
            ))}
          </div>
        )}
      </div>

      {/* 业绩排行 */}
      <div>
        <h3 className="mb-3 text-lg font-semibold">团队业绩排行</h3>
        <PerformanceTable data={performance} />
      </div>
    </div>
  )
}

// ─── TeamPage 主组件 ────────────────────────────────────────
export default function TeamPage() {
  const { members, performance, isLoading, refresh } = useTeam()
  const [view, setView] = useState<'admin' | 'personal'>('admin')
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)

  useEffect(() => {
    refresh()
  }, [refresh])

  // 当前登录用户
  const currentUser = getStoredUser()

  const handleSelectMember = (member: TeamMember) => {
    setSelectedMemberId(member.user_id)
    setView('personal')
  }

  const handleBackToAdmin = () => {
    setView('admin')
    setSelectedMemberId(null)
  }

  const handleViewMyWorkspace = () => {
    if (currentUser) {
      setSelectedMemberId(currentUser.id)
      setView('personal')
    }
  }

  return (
    <div>
      {/* 视图切换 Tabs */}
      {view === 'admin' && (
        <div className="mb-6">
          <Tabs value="admin" className="w-full">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="admin">团队管理</TabsTrigger>
                <TabsTrigger
                  value="personal"
                  onClick={handleViewMyWorkspace}
                >
                  我的工作台
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </div>
      )}

      {view === 'admin' ? (
        <AdminView
          members={members}
          performance={performance}
          isLoading={isLoading}
          onSelectMember={handleSelectMember}
          onRefresh={refresh}
        />
      ) : (
        selectedMemberId !== null && (
          <PersonalWorkspace
            userId={selectedMemberId}
            onBack={handleBackToAdmin}
          />
        )
      )}
    </div>
  )
}
