import { useState } from 'react'
import { ChevronDown, ChevronUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PriceHistoryChart } from '@/components/history/PriceHistoryChart'
import { useHistory } from '@/hooks/history/useHistory'

interface ResultCardHistoryProps {
  itemId: string
}

export function ResultCardHistory({ itemId }: ResultCardHistoryProps) {
  const [expanded, setExpanded] = useState(false)
  const { history, loading, load } = useHistory()

  const handleToggle = () => {
    if (!expanded && !history) {
      load(itemId)
    }
    setExpanded(!expanded)
  }

  return (
    <div className="border-t pt-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-full justify-start gap-1 text-xs text-muted-foreground"
        onClick={handleToggle}
      >
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        查看历史价格
      </Button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {loading ? (
            <div className="flex h-[120px] items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : history ? (
            <>
              {history.price_change !== null && history.price_change < 0 && (
                <div className="flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
                  <TrendingDown className="h-3 w-3" />
                  降价 ¥{Math.abs(history.price_change).toFixed(0)}
                  {history.price_change_rate !== null && (
                    <span>
                      （{(Math.abs(history.price_change_rate) * 100).toFixed(1)}%）
                    </span>
                  )}
                </div>
              )}
              <PriceHistoryChart history={history} />
            </>
          ) : (
            <div className="flex h-[60px] items-center justify-center text-xs text-muted-foreground">
              无法加载历史数据
            </div>
          )}
        </div>
      )}
    </div>
  )
}
