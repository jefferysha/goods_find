import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AlertRule, AlertCondition } from '@/types/alert'

interface AlertRuleListProps {
  rules: AlertRule[]
  loading: boolean
  onEdit: (rule: AlertRule) => void
  onDelete: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
}

const FIELD_LABELS: Record<AlertCondition['field'], string> = {
  price: '价格',
  premium_rate: '溢价率',
  ai_score: 'AI评分',
}

const OP_LABELS: Record<AlertCondition['operator'], string> = {
  lt: '<',
  lte: '≤',
  gt: '>',
  gte: '≥',
  eq: '=',
}

function formatConditions(conditions: AlertCondition[]): string {
  if (conditions.length === 0) return '无条件'
  return conditions
    .map((c) => `${FIELD_LABELS[c.field]} ${OP_LABELS[c.operator]} ${c.value}`)
    .join('，')
}

export function AlertRuleList({
  rules,
  loading,
  onEdit,
  onDelete,
  onToggle,
}: AlertRuleListProps) {
  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (rules.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        暂无提醒规则，点击上方按钮创建
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>规则名</TableHead>
          <TableHead>关联任务</TableHead>
          <TableHead>条件摘要</TableHead>
          <TableHead>通知渠道</TableHead>
          <TableHead>启用</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rules.map((rule) => (
          <TableRow key={rule.id}>
            <TableCell className="font-medium">{rule.name}</TableCell>
            <TableCell>
              {rule.task_id === null ? (
                <Badge variant="secondary">全局</Badge>
              ) : (
                <Badge variant="outline">任务 #{rule.task_id}</Badge>
              )}
            </TableCell>
            <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
              {formatConditions(rule.conditions)}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {rule.channels.map((ch) => (
                  <Badge key={ch} variant="secondary" className="text-xs">
                    {ch}
                  </Badge>
                ))}
                {rule.channels.length === 0 && (
                  <span className="text-xs text-muted-foreground">无</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Switch
                checked={rule.enabled}
                onCheckedChange={(checked) => onToggle(rule.id, checked)}
              />
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(rule)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(rule.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
