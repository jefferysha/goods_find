import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PriceAnalysis } from '@/types/pricing'

const LEVEL_CONFIG: Record<
  PriceAnalysis['price_level'],
  { label: string; className: string; emoji: string }
> = {
  low_price: {
    label: '低价捡漏',
    className: 'border-green-200 bg-green-100 text-green-800 hover:bg-green-100',
    emoji: '🟢',
  },
  fair: {
    label: '价格合理',
    className: 'border-blue-200 bg-blue-100 text-blue-800 hover:bg-blue-100',
    emoji: '🔵',
  },
  slight_premium: {
    label: '轻微溢价',
    className: 'border-orange-200 bg-orange-100 text-orange-800 hover:bg-orange-100',
    emoji: '🟡',
  },
  high_premium: {
    label: '高溢价',
    className: 'border-red-200 bg-red-100 text-red-800 hover:bg-red-100',
    emoji: '🔴',
  },
  unknown: {
    label: '未分析',
    className: 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-100',
    emoji: '⚪',
  },
}

interface PriceTagProps {
  priceLevel: PriceAnalysis['price_level']
  premiumRate?: number | null
  /** Optional fair used price for reference display */
  fairUsedPrice?: number | null
  referencePrice?: number | null
  className?: string
}

export function PriceTag({ priceLevel, premiumRate, fairUsedPrice, referencePrice, className }: PriceTagProps) {
  const config = LEVEL_CONFIG[priceLevel] ?? LEVEL_CONFIG.unknown

  const rateText =
    premiumRate !== null && premiumRate !== undefined
      ? `${premiumRate > 0 ? '+' : ''}${premiumRate.toFixed(1)}%`
      : null

  return (
    <span className={cn('inline-flex items-center gap-1.5 flex-wrap', className)}>
      <Badge variant="outline" className={cn('text-xs', config.className)}>
        {config.label}
      </Badge>
      {rateText && (
        <span
          className={cn(
            'text-xs font-medium tabular-nums',
            premiumRate! > 0 ? 'text-red-600' : 'text-green-600',
          )}
        >
          {rateText}
        </span>
      )}
      {referencePrice != null && referencePrice > 0 && (
        <span className="text-[10px] text-muted-foreground">
          参考¥{referencePrice.toFixed(0)}
        </span>
      )}
      {fairUsedPrice != null && fairUsedPrice > 0 && (
        <span className="text-[10px] text-muted-foreground">
          合理二手¥{fairUsedPrice.toFixed(0)}
        </span>
      )}
    </span>
  )
}
