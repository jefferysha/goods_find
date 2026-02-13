import { cn } from '@/lib/utils'
import type { PriceAnalysis } from '@/types/pricing'

interface PremiumAlertBannerProps {
  analyses: PriceAnalysis[]
  className?: string
}

export function PremiumAlertBanner({ analyses, className }: PremiumAlertBannerProps) {
  const highPremiumItems = analyses.filter(
    (a) => a.price_level === 'high_premium',
  )
  const slightPremiumItems = analyses.filter(
    (a) => a.price_level === 'slight_premium',
  )

  if (highPremiumItems.length === 0 && slightPremiumItems.length === 0) {
    return null
  }

  const hasHighPremium = highPremiumItems.length > 0

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm',
        hasHighPremium
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-orange-200 bg-orange-50 text-orange-800',
        className,
      )}
      role="alert"
    >
      <span className="text-lg" aria-hidden>
        {hasHighPremium ? '⚠️' : '💡'}
      </span>
      <div className="flex-1">
        {highPremiumItems.length > 0 && (
          <span className="font-semibold">
            {highPremiumItems.length} 件商品高溢价
          </span>
        )}
        {highPremiumItems.length > 0 && slightPremiumItems.length > 0 && (
          <span className="mx-1.5">·</span>
        )}
        {slightPremiumItems.length > 0 && (
          <span>
            {slightPremiumItems.length} 件商品轻微溢价
          </span>
        )}
        <span className="ml-2 text-xs opacity-75">
          建议关注低价和合理价位的商品
        </span>
      </div>
    </div>
  )
}
