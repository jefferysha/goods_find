import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { fetchThresholds, updateThresholds } from '@/api/pricing'
import type { PremiumThresholds } from '@/types/pricing'

interface PremiumAlertConfigProps {
  taskId?: number
  className?: string
  onSaved?: () => void
}

const FIELDS: {
  key: keyof Pick<PremiumThresholds, 'low_price_max' | 'fair_max' | 'slight_premium_max'>
  label: string
  description: string
}[] = [
  {
    key: 'low_price_max',
    label: '低价上限 (%)',
    description: '低于此溢价率视为"低价捡漏"',
  },
  {
    key: 'fair_max',
    label: '合理上限 (%)',
    description: '低于此溢价率视为"价格合理"',
  },
  {
    key: 'slight_premium_max',
    label: '轻微溢价上限 (%)',
    description: '低于此溢价率视为"轻微溢价"，超过则为"高溢价"',
  },
]

export function PremiumAlertConfig({ taskId, className, onSaved }: PremiumAlertConfigProps) {
  const [thresholds, setThresholds] = useState<PremiumThresholds>({
    task_id: taskId ?? null,
    low_price_max: -15,
    fair_max: 5,
    slight_premium_max: 20,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadThresholds = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchThresholds(taskId)
      setThresholds(data)
    } catch (e) {
      console.error('Failed to load thresholds', e)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    loadThresholds()
  }, [loadThresholds])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateThresholds({ ...thresholds, task_id: taskId ?? null })
      onSaved?.()
    } catch (e) {
      console.error('Failed to save thresholds', e)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (
    key: keyof Pick<PremiumThresholds, 'low_price_max' | 'fair_max' | 'slight_premium_max'>,
    value: string,
  ) => {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      setThresholds((prev) => ({ ...prev, [key]: num }))
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">溢价阈值配置</CardTitle>
        <CardDescription>
          调整溢价率分界点，用于判定商品价格水平
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="py-4 text-center text-sm text-muted-foreground">
            加载中...
          </div>
        ) : (
          <>
            {FIELDS.map(({ key, label, description }) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-sm font-medium">{label}</Label>
                <Input
                  type="number"
                  value={thresholds[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            ))}

            {/* Visual preview */}
            <div className="rounded-md border bg-muted/50 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                当前分档预览：
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded bg-green-100 px-2 py-1 text-green-800">
                  低价捡漏: &lt; {thresholds.low_price_max}%
                </span>
                <span className="rounded bg-blue-100 px-2 py-1 text-blue-800">
                  价格合理: {thresholds.low_price_max}% ~ {thresholds.fair_max}%
                </span>
                <span className="rounded bg-orange-100 px-2 py-1 text-orange-800">
                  轻微溢价: {thresholds.fair_max}% ~ {thresholds.slight_premium_max}%
                </span>
                <span className="rounded bg-red-100 px-2 py-1 text-red-800">
                  高溢价: &gt; {thresholds.slight_premium_max}%
                </span>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? '保存中...' : '保存配置'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
