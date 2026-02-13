import { useEffect, useState } from 'react'
import { Bell, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAlerts } from '@/hooks/alerts/useAlerts'
import { useTasks } from '@/hooks/tasks/useTasks'
import { AlertRuleList } from '@/components/alerts/AlertRuleList'
import { AlertRuleForm } from '@/components/alerts/AlertRuleForm'
import type { AlertRule } from '@/types/alert'

export default function AlertsPage() {
  const { rules, loading, load, add, update, remove } = useAlerts()
  const { tasks } = useTasks()

  const [formOpen, setFormOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)

  useEffect(() => {
    load()
  }, [load])

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule)
    setFormOpen(true)
  }

  const handleCreate = () => {
    setEditingRule(null)
    setFormOpen(true)
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    await update(id, { enabled })
  }

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除该提醒规则吗？')) {
      await remove(id)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">智能提醒</h1>
        <Button onClick={handleCreate}>
          <Plus className="mr-1 h-4 w-4" />
          创建规则
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            提醒规则列表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AlertRuleList
            rules={rules}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggle={handleToggle}
          />
        </CardContent>
      </Card>

      <AlertRuleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        rule={editingRule}
        tasks={tasks}
        onSave={add}
        onUpdate={update}
      />
    </div>
  )
}
