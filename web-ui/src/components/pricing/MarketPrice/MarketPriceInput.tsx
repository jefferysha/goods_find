import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MarketPrice } from '@/types/pricing'

const CONDITION_OPTIONS: { value: MarketPrice['condition']; label: string }[] = [
  { value: 'new', label: '全新' },
  { value: 'like_new', label: '充新' },
  { value: 'good', label: '良好' },
  { value: 'fair', label: '一般' },
]

const CATEGORY_PRESETS = [
  '笔记本', '手机', '平板', '相机', '游戏主机',
  '耳机', '显卡', '手表', '其他',
]

interface MarketPriceInputProps {
  data?: MarketPrice
  taskId: number
  keyword: string
  onSave: (data: Omit<MarketPrice, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onUpdate?: (id: string, data: Partial<MarketPrice>) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export function MarketPriceInput({
  data,
  taskId,
  keyword,
  onSave,
  onUpdate,
  onDelete,
}: MarketPriceInputProps) {
  const [condition, setCondition] = useState<MarketPrice['condition']>(data?.condition ?? 'good')
  const [price, setPrice] = useState(data?.reference_price?.toString() ?? '')
  const [fairUsedPrice, setFairUsedPrice] = useState(data?.fair_used_price?.toString() ?? '')
  const [category, setCategory] = useState(data?.category ?? '')
  const [source, setSource] = useState(data?.source ?? '')
  const [note, setNote] = useState(data?.note ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isExpanded, setIsExpanded] = useState(!!data)

  useEffect(() => {
    if (data) {
      setCondition(data.condition)
      setPrice(data.reference_price.toString())
      setFairUsedPrice(data.fair_used_price?.toString() ?? '')
      setCategory(data.category ?? '')
      setSource(data.source ?? '')
      setNote(data.note)
    }
  }, [data])

  const handleSave = async () => {
    const refPrice = parseFloat(price)
    if (isNaN(refPrice) || refPrice <= 0) return

    const fairPrice = parseFloat(fairUsedPrice)

    setIsSaving(true)
    try {
      if (data && onUpdate) {
        await onUpdate(data.id, {
          condition,
          reference_price: refPrice,
          fair_used_price: isNaN(fairPrice) ? undefined : fairPrice,
          category,
          source,
          note,
        })
      } else {
        await onSave({
          task_id: taskId,
          keyword,
          condition,
          reference_price: refPrice,
          fair_used_price: isNaN(fairPrice) ? undefined : fairPrice,
          category,
          platform: 'xianyu',
          source,
          note,
        })
        setCondition('good')
        setPrice('')
        setFairUsedPrice('')
        setCategory('')
        setSource('')
        setNote('')
        setIsExpanded(false)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!data || !onDelete) return
    setIsSaving(true)
    try {
      await onDelete(data.id)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      {/* Primary row */}
      <div className="flex items-center gap-2">
        <Select value={condition} onValueChange={(v) => setCondition(v as MarketPrice['condition'])}>
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONDITION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          className="w-[120px]"
          placeholder="新品参考价"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          min={0}
          step={0.01}
        />

        <Input
          type="number"
          className="w-[120px]"
          placeholder="合理二手价"
          value={fairUsedPrice}
          onChange={(e) => setFairUsedPrice(e.target.value)}
          min={0}
          step={0.01}
        />

        {!data && !isExpanded && (
          <Button size="sm" variant="ghost" onClick={() => setIsExpanded(true)}>
            更多
          </Button>
        )}

        <Button size="sm" disabled={isSaving || !price} onClick={handleSave}>
          {isSaving ? '保存中...' : data ? '保存' : '添加'}
        </Button>

        {data && onDelete && (
          <Button size="sm" variant="destructive" disabled={isSaving} onClick={handleDelete}>
            删除
          </Button>
        )}
      </div>

      {/* Extended fields */}
      {(isExpanded || data) && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Select value={category || '__none__'} onValueChange={(v) => setCategory(v === '__none__' ? '' : v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="品类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">无品类</SelectItem>
              {CATEGORY_PRESETS.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            className="w-[160px]"
            placeholder="价格来源"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />

          <Input
            className="flex-1 min-w-[120px]"
            placeholder="备注（可选）"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
