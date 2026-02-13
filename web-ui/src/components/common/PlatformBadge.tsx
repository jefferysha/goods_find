import { getPlatform } from '@/lib/platforms'
import { cn } from '@/lib/utils'

interface PlatformBadgeProps {
  platformId: string
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  className?: string
}

/**
 * 平台角标组件
 * 显示平台名称和对应的品牌色
 */
export function PlatformBadge({
  platformId,
  size = 'sm',
  showName = true,
  className,
}: PlatformBadgeProps) {
  const platform = getPlatform(platformId)
  const name = platform?.name ?? platformId
  const color = platform?.color ?? '#888888'

  const sizeClasses = {
    sm: 'h-5 px-1.5 text-[10px] gap-1',
    md: 'h-6 px-2 text-xs gap-1.5',
    lg: 'h-7 px-2.5 text-sm gap-1.5',
  }

  const dotSizes = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2 w-2',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        sizeClasses[size],
        className,
      )}
      style={{
        backgroundColor: `${color}15`,
        color: color,
        border: `1px solid ${color}30`,
      }}
    >
      <span
        className={cn('rounded-full shrink-0', dotSizes[size])}
        style={{ backgroundColor: color }}
      />
      {showName && <span>{name}</span>}
    </span>
  )
}

interface PlatformTabsProps {
  platforms: Array<{
    id: string
    name: string
    color: string
    enabled: boolean
    count?: number
  }>
  value: string
  onChange: (id: string) => void
  totalCount?: number
}

/**
 * 平台 Tab 切换组件
 */
export function PlatformTabs({
  platforms,
  value,
  onChange,
  totalCount,
}: PlatformTabsProps) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-lg border bg-muted/30 p-1">
      {/* 全部 Tab */}
      <button
        onClick={() => onChange('all')}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
          value === 'all'
            ? 'bg-white text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-white/50',
        )}
      >
        全部
        {totalCount !== undefined && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
            {totalCount}
          </span>
        )}
      </button>

      {/* 各平台 Tab */}
      {platforms.map((platform) => (
        <button
          key={platform.id}
          onClick={() => platform.enabled && onChange(platform.id)}
          disabled={!platform.enabled}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
            !platform.enabled && 'cursor-not-allowed opacity-40',
            value === platform.id
              ? 'bg-white text-foreground shadow-sm'
              : platform.enabled
                ? 'text-muted-foreground hover:text-foreground hover:bg-white/50'
                : '',
          )}
          title={!platform.enabled ? '即将支持' : platform.name}
        >
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: platform.color }}
          />
          <span>{platform.name}</span>
          {platform.enabled && platform.count !== undefined && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
              {platform.count}
            </span>
          )}
          {!platform.enabled && (
            <span className="rounded-sm bg-muted px-1 py-0.5 text-[9px] font-medium text-muted-foreground">
              即将支持
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
