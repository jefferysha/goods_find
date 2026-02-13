import { useEffect } from 'react'
import { useMarketPrice } from '@/hooks/pricing/useMarketPrice'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { MarketPriceInput } from './MarketPriceInput'
import { MarketPriceBatchImport } from './MarketPriceBatchImport'

interface MarketPriceConfigProps {
  taskId: number
  keyword?: string
  className?: string
}

export function MarketPriceConfig({ taskId, keyword = '', className }: MarketPriceConfigProps) {
  const { prices, loading, load, add, update, remove } = useMarketPrice(taskId)

  useEffect(() => {
    load()
  }, [load])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">市场基准价配置</CardTitle>
            <CardDescription>
              为不同成色设置参考价，用于计算商品溢价率。支持设置合理二手价进行更精准的对比。
            </CardDescription>
          </div>
          <MarketPriceBatchImport
            taskId={taskId}
            keyword={keyword}
            onImported={load}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && prices.length === 0 && (
          <div className="py-4 text-center text-sm text-muted-foreground">
            加载中...
          </div>
        )}

        {/* Existing prices */}
        {prices.map((mp) => (
          <MarketPriceInput
            key={mp.id}
            data={mp}
            taskId={taskId}
            keyword={keyword}
            onSave={add}
            onUpdate={update}
            onDelete={remove}
          />
        ))}

        {prices.length === 0 && !loading && (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            暂无基准价配置。添加基准价后可在结果页看到溢价分析。
          </div>
        )}

        {/* Add new row */}
        <div className="border-t pt-3">
          <p className="mb-2 text-xs text-muted-foreground">添加新基准价：</p>
          <MarketPriceInput
            taskId={taskId}
            keyword={keyword}
            onSave={add}
          />
        </div>
      </CardContent>
    </Card>
  )
}
