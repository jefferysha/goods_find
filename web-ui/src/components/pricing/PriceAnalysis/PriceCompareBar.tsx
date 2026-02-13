import { cn } from '@/lib/utils'

interface PriceCompareBarProps {
  currentPrice: number
  referencePrice: number
  /** Minimum price for the bar range (defaults to 80% of the lower value) */
  minRange?: number
  /** Maximum price for the bar range (defaults to 120% of the higher value) */
  maxRange?: number
  className?: string
}

export function PriceCompareBar({
  currentPrice,
  referencePrice,
  minRange,
  maxRange,
  className,
}: PriceCompareBarProps) {
  if (referencePrice <= 0 || currentPrice <= 0) {
    return (
      <div className={cn('text-xs text-muted-foreground', className)}>
        暂无价格数据
      </div>
    )
  }

  const lower = Math.min(currentPrice, referencePrice)
  const upper = Math.max(currentPrice, referencePrice)
  const rangeMin = minRange ?? lower * 0.8
  const rangeMax = maxRange ?? upper * 1.2
  const totalRange = rangeMax - rangeMin

  const clampPct = (price: number) =>
    Math.max(0, Math.min(100, ((price - rangeMin) / totalRange) * 100))

  const refPct = clampPct(referencePrice)
  const curPct = clampPct(currentPrice)
  const isAboveRef = currentPrice > referencePrice

  // Build the gradient: green below reference, red above reference
  const gradientStyle = isAboveRef
    ? {
        background: `linear-gradient(to right, 
          #dcfce7 0%, #dcfce7 ${refPct}%, 
          #fee2e2 ${refPct}%, #fee2e2 100%)`,
      }
    : {
        background: `linear-gradient(to right, 
          #dcfce7 0%, #dcfce7 ${curPct}%, 
          #f0fdf4 ${curPct}%, #f0fdf4 100%)`,
      }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Bar */}
      <div className="relative h-6 w-full rounded-full border" style={gradientStyle}>
        {/* Reference price marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-blue-600"
          style={{ left: `${refPct}%` }}
          title={`基准价: ¥${referencePrice.toFixed(2)}`}
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium text-blue-600">
            基准 ¥{referencePrice.toFixed(0)}
          </div>
        </div>

        {/* Current price marker */}
        <div
          className={cn(
            'absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm',
            isAboveRef
              ? 'border-red-500 bg-red-400'
              : 'border-green-500 bg-green-400',
          )}
          style={{ left: `${curPct}%` }}
          title={`当前价: ¥${currentPrice.toFixed(2)}`}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>¥{rangeMin.toFixed(0)}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
            低于基准
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
            高于基准
          </span>
        </span>
        <span>¥{rangeMax.toFixed(0)}</span>
      </div>
    </div>
  )
}
