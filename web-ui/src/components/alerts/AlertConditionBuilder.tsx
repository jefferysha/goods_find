import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AlertCondition } from '@/types/alert'

interface AlertConditionBuilderProps {
  conditions: AlertCondition[]
  onChange: (conditions: AlertCondition[]) => void
}

const FIELDS: { value: AlertCondition['field']; label: string }[] = [
  { value: 'price', label: '价格' },
  { value: 'premium_rate', label: '溢价率' },
  { value: 'ai_score', label: 'AI评分' },
]

const OPERATORS: { value: AlertCondition['operator']; label: string }[] = [
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'eq', label: '=' },
]

export function AlertConditionBuilder({ conditions, onChange }: AlertConditionBuilderProps) {
  const addCondition = () => {
    onChange([...conditions, { field: 'price', operator: 'lt', value: 0 }])
  }

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index))
  }

  const updateCondition = (index: number, patch: Partial<AlertCondition>) => {
    onChange(conditions.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">触发条件</span>
        <Button type="button" variant="outline" size="sm" onClick={addCondition}>
          <Plus className="mr-1 h-3 w-3" />
          添加条件
        </Button>
      </div>
      {conditions.length === 0 && (
        <p className="text-sm text-muted-foreground">暂无条件，请添加</p>
      )}
      {conditions.map((condition, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select
            value={condition.field}
            onValueChange={(v) =>
              updateCondition(index, { field: v as AlertCondition['field'] })
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELDS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={condition.operator}
            onValueChange={(v) =>
              updateCondition(index, { operator: v as AlertCondition['operator'] })
            }
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            className="w-[120px]"
            value={condition.value}
            onChange={(e) =>
              updateCondition(index, { value: Number(e.target.value) })
            }
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeCondition(index)}
            className="shrink-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
