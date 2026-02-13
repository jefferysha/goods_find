import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type PremiumFilterValue = 'all' | 'low_price' | 'fair' | 'premium'

interface ResultsFilterPremiumProps {
  value: PremiumFilterValue
  onChange: (value: PremiumFilterValue) => void
  disabled?: boolean
}

const OPTIONS: { value: PremiumFilterValue; label: string }[] = [
  { value: 'all', label: '全部价格' },
  { value: 'low_price', label: '仅低价捡漏' },
  { value: 'fair', label: '仅价格合理' },
  { value: 'premium', label: '仅溢价商品' },
]

export function ResultsFilterPremium({ value, onChange, disabled }: ResultsFilterPremiumProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PremiumFilterValue)} disabled={disabled}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="溢价筛选" />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
