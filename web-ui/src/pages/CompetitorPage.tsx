import { useState, Fragment } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useCompetitor } from '@/hooks/competitor/useCompetitor'
import { ChevronDown, ChevronRight, RefreshCw, ExternalLink } from 'lucide-react'

export default function CompetitorPage() {
  const { keywords, selectedKeyword, setSelectedKeyword, data, isLoading, refresh } = useCompetitor()
  const [expandedSeller, setExpandedSeller] = useState<string | null>(null)

  const toggleSeller = (sellerName: string) => {
    setExpandedSeller(prev => (prev === sellerName ? null : sellerName))
  }

  // 空状态：没有关键词
  if (keywords.length === 0 && !isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">竞品观察</h1>
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-muted-foreground">暂无数据，请先运行爬虫任务</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">竞品观察</h1>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          刷新
        </Button>
      </div>

      {/* 顶部工具栏：品类选择器 */}
      <div className="flex items-center gap-4">
        <Select
          value={selectedKeyword ?? undefined}
          onValueChange={setSelectedKeyword}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="选择品类关键词" />
          </SelectTrigger>
          <SelectContent>
            {keywords.map(kw => (
              <SelectItem key={kw} value={kw}>
                {kw}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 加载中 */}
      {isLoading && (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      )}

      {/* 数据展示 */}
      {!isLoading && data && (
        <>
          {/* 统计卡片行 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  总卖家数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.total_sellers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  总商品数
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{data.total_items}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  均价
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">¥{data.price_stats.avg.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          {/* 卖家定价分布表格 */}
          <Card>
            <CardHeader>
              <CardTitle>卖家定价分布</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>卖家昵称</TableHead>
                    <TableHead className="text-right">在售数量</TableHead>
                    <TableHead className="text-right">均价</TableHead>
                    <TableHead className="text-right">最低价</TableHead>
                    <TableHead className="text-right">最高价</TableHead>
                    <TableHead className="text-right">价差</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sellers.map(seller => (
                    <Fragment key={seller.seller_name}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => toggleSeller(seller.seller_name)}
                      >
                        <TableCell>
                          {expandedSeller === seller.seller_name ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{seller.seller_name}</TableCell>
                        <TableCell className="text-right">{seller.item_count}</TableCell>
                        <TableCell className="text-right">¥{seller.avg_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">¥{seller.min_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">¥{seller.max_price.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          ¥{(seller.max_price - seller.min_price).toFixed(2)}
                        </TableCell>
                      </TableRow>

                      {/* 展开的子列表 */}
                      {expandedSeller === seller.seller_name && seller.items.map((item, idx) => (
                        <TableRow key={`${seller.seller_name}-item-${idx}`} className="bg-muted/30">
                          <TableCell />
                          <TableCell colSpan={4} className="pl-8 text-sm text-muted-foreground">
                            {item.title}
                          </TableCell>
                          <TableCell className="text-right text-sm">¥{item.price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <a
                              href={item.item_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              onClick={e => e.stopPropagation()}
                            >
                              查看
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TableCell>
                        </TableRow>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 价格统计摘要 */}
          <Card>
            <CardHeader>
              <CardTitle>价格统计摘要</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">最低价</p>
                  <p className="text-lg font-semibold">¥{data.price_stats.min.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">平均价</p>
                  <p className="text-lg font-semibold">¥{data.price_stats.avg.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">最高价</p>
                  <p className="text-lg font-semibold">¥{data.price_stats.max.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
