import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlatformBadge } from '@/components/common/PlatformBadge'
import { cn } from '@/lib/utils'
import type { BargainItem } from '@/api/dashboard'

interface BargainLeaderboardProps {
  data: BargainItem[]
  loading?: boolean
}

const RANK_COLORS = [
  'bg-amber-500 text-white',  // #1
  'bg-gray-400 text-white',   // #2
  'bg-orange-400 text-white',  // #3
]

export function BargainLeaderboard({ data, loading }: BargainLeaderboardProps) {
  // 确保 data 是数组
  const safeData = Array.isArray(data) ? data : []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span>捡漏排行榜</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Top {safeData.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-[300px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : safeData.length === 0 ? (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <p>暂无捡漏数据</p>
            <p className="text-xs">需要先设置市场基准价后才能计算溢价率</p>
          </div>
        ) : (
          <div className="space-y-2">
            {safeData.map((item, index) => {
              const rate = item.premium_rate
              const isGoodDeal = rate < 0

              return (
                <a
                  key={`${item.link}-${index}`}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  {/* Rank */}
                  <div
                    className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                      index < 3 ? RANK_COLORS[index] : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {index + 1}
                  </div>

                  {/* Image */}
                  {item.image && (
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      <img
                        src={item.image}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <PlatformBadge platformId={item.platform} size="sm" />
                      <span>参考价 ¥{item.reference_price.toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Price & Rate */}
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold text-red-600">
                      ¥{item.price.toFixed(0)}
                    </div>
                    <div
                      className={cn(
                        'text-xs font-semibold tabular-nums',
                        isGoodDeal ? 'text-emerald-600' : 'text-red-600',
                      )}
                    >
                      {rate > 0 ? '+' : ''}{rate.toFixed(1)}%
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
