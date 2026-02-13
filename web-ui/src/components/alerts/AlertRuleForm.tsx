import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertConditionBuilder } from './AlertConditionBuilder'
import type { AlertRule, AlertCondition } from '@/types/alert'
import type { Task } from '@/types/task'

interface AlertRuleFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: AlertRule | null
  tasks: Task[]
  onSave: (data: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onUpdate?: (id: string, data: Partial<AlertRule>) => Promise<void>
}

const CHANNELS = [
  { id: 'ntfy', label: 'Ntfy' },
  { id: 'bark', label: 'Bark' },
  { id: 'wechat', label: '企业微信' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'webhook', label: 'Webhook' },
]

export function AlertRuleForm({
  open,
  onOpenChange,
  rule,
  tasks,
  onSave,
  onUpdate,
}: AlertRuleFormProps) {
  const [name, setName] = useState('')
  const [taskId, setTaskId] = useState<string>('global')
  const [conditions, setConditions] = useState<AlertCondition[]>([])
  const [channels, setChannels] = useState<string[]>([])
  const [enabled, setEnabled] = useState(true)
  const [saving, setSaving] = useState(false)

  const isEdit = !!rule

  // Populate form when editing
  useEffect(() => {
    if (rule) {
      setName(rule.name)
      setTaskId(rule.task_id !== null ? String(rule.task_id) : 'global')
      setConditions(rule.conditions)
      setChannels(rule.channels)
      setEnabled(rule.enabled)
    } else {
      setName('')
      setTaskId('global')
      setConditions([{ field: 'price', operator: 'lt', value: 0 }])
      setChannels([])
      setEnabled(true)
    }
  }, [rule, open])

  const toggleChannel = (channelId: string) => {
    setChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((c) => c !== channelId)
        : [...prev, channelId],
    )
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        task_id: taskId === 'global' ? null : Number(taskId),
        conditions,
        channels,
        enabled,
      }
      if (isEdit && onUpdate && rule) {
        await onUpdate(rule.id, payload)
      } else {
        await onSave(payload)
      }
      onOpenChange(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑规则' : '创建提醒规则'}</DialogTitle>
          <DialogDescription>
            设置触发条件和通知渠道，当商品满足条件时自动推送提醒。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Rule Name */}
          <div className="space-y-2">
            <Label htmlFor="rule-name">规则名称</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：MacBook 低价提醒"
            />
          </div>

          {/* Task Selector */}
          <div className="space-y-2">
            <Label>关联任务</Label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">全局（所有任务）</SelectItem>
                {tasks.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.task_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Conditions */}
          <AlertConditionBuilder conditions={conditions} onChange={setConditions} />

          {/* Channels */}
          <div className="space-y-2">
            <Label>通知渠道</Label>
            <div className="flex flex-wrap gap-4">
              {CHANNELS.map((ch) => (
                <label
                  key={ch.id}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={channels.includes(ch.id)}
                    onCheckedChange={() => toggleChannel(ch.id)}
                  />
                  {ch.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? '保存中...' : isEdit ? '更新' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
