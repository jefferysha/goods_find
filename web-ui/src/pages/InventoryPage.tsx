import { useEffect, useState, useCallback } from 'react'
import { useInventory } from '@/hooks/inventory/useInventory'
import type { InventoryItem, InventoryStatus } from '@/types/inventory'
import { getPricingSuggestion, type PricingSuggestion } from '@/api/inventory'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STATUS_MAP: Record<InventoryStatus, { label: string; color: string }> = {
  in_stock: { label: '在库', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  refurbishing: { label: '整备中', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  listed: { label: '已上架', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  sold: { label: '已售出', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  returned: { label: '已退货', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
}

const ALL_STATUSES: InventoryStatus[] = ['in_stock', 'refurbishing', 'listed', 'sold', 'returned']

function StatusBadge({ status }: { status: InventoryStatus }) {
  const cfg = STATUS_MAP[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

export default function InventoryPage() {
  const {
    items,
    summary,
    agingAlerts,
    isLoading,
    filters,
    setFilters,
    markSold,
    deleteItem,
    refresh,
  } = useInventory()

  // Mark Sold Dialog
  const [soldDialog, setSoldDialog] = useState<{ open: boolean; item?: InventoryItem }>({ open: false })
  const [soldPrice, setSoldPrice] = useState('')
  const [soldChannel, setSoldChannel] = useState('')

  // Pricing Suggestion Dialog
  const [pricingDialog, setPricingDialog] = useState<{ open: boolean; item?: InventoryItem }>({ open: false })
  const [pricingSuggestion, setPricingSuggestion] = useState<PricingSuggestion | null>(null)
  const [pricingCondition, setPricingCondition] = useState('good')
  const [pricingLoading, setPricingLoading] = useState(false)

  const fetchPricing = useCallback(async (itemId: string, condition: string) => {
    setPricingLoading(true)
    try {
      const data = await getPricingSuggestion(itemId, condition)
      setPricingSuggestion(data)
    } catch (e) {
      console.error('获取定价建议失败:', e)
      setPricingSuggestion(null)
    } finally {
      setPricingLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleFilterStatus = (value: string) => {
    const newFilters = { ...filters, status: value === 'all' ? undefined : value as InventoryStatus }
    setFilters(newFilters)
    refresh(newFilters)
  }

  const handleMarkSold = async () => {
    if (!soldDialog.item) return
    const price = parseFloat(soldPrice)
    if (isNaN(price) || price <= 0 || !soldChannel.trim()) return
    await markSold(soldDialog.item.id, price, soldChannel.trim())
    setSoldDialog({ open: false })
    setSoldPrice('')
    setSoldChannel('')
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确认删除该库存项？')) return
    await deleteItem(id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">库存台账</h1>
        <Button variant="outline" onClick={() => refresh()}>
          刷新
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总库存件数</CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_count}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {ALL_STATUSES.filter(s => s !== 'sold' && s !== 'returned').map(s => `${STATUS_MAP[s].label} ${summary.by_status?.[s] ?? 0}`).join(' / ')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">总成本</CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥{summary.total_cost?.toLocaleString() ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">预估总货值</CardTitle>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥{summary.estimated_value?.toLocaleString() ?? 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Aging Alerts */}
      {agingAlerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <div className="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">库龄预警（超过7天）</h3>
            <Badge variant="destructive" className="ml-auto">{agingAlerts.length}件</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {agingAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-center gap-2 rounded-md bg-white/80 dark:bg-black/20 px-3 py-1.5 text-sm">
                <span className="font-medium truncate max-w-[200px]">{alert.title}</span>
                <span className="text-amber-700 dark:text-amber-400 font-semibold">{alert.aging_days}天</span>
                <span className="text-muted-foreground">¥{alert.total_cost}</span>
              </div>
            ))}
            {agingAlerts.length > 5 && (
              <span className="text-sm text-amber-700 dark:text-amber-400 self-center">
                还有 {agingAlerts.length - 5} 件...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">状态筛选：</span>
          <Select value={filters.status ?? 'all'} onValueChange={handleFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_MAP[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>商品名称</TableHead>
              <TableHead className="w-[90px] text-right">收购价</TableHead>
              <TableHead className="w-[90px] text-right">总成本</TableHead>
              <TableHead className="w-[90px] text-right">挂牌价</TableHead>
              <TableHead className="w-[80px]">状态</TableHead>
              <TableHead className="w-[70px] text-right">库龄</TableHead>
              <TableHead className="w-[80px]">负责人</TableHead>
              <TableHead className="w-[130px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  暂无库存数据
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.keyword} · {item.platform}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">¥{item.purchase_price}</TableCell>
                  <TableCell className="text-right">
                    <span className="font-medium">¥{item.total_cost}</span>
                    {(item.shipping_fee > 0 || item.refurbish_fee > 0 || item.platform_fee > 0) && (
                      <p className="text-xs text-muted-foreground">
                        含费用 ¥{(item.shipping_fee + item.refurbish_fee + item.platform_fee + item.other_fee).toFixed(0)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.listing_price != null ? (
                      <span className="font-medium">¥{item.listing_price}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {item.aging_days != null ? (
                      <span className={`text-sm font-medium ${item.aging_days > 7 ? 'text-amber-600' : item.aging_days > 14 ? 'text-red-600' : ''}`}>
                        {item.aging_days}天
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{item.assignee || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {item.status !== 'sold' && item.status !== 'returned' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setPricingDialog({ open: true, item })
                              setPricingCondition('good')
                              setPricingSuggestion(null)
                              fetchPricing(String(item.id), 'good')
                            }}
                          >
                            定价
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setSoldDialog({ open: true, item })
                              setSoldPrice(item.listing_price ? String(item.listing_price) : '')
                              setSoldChannel('')
                            }}
                          >
                            售出
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mark Sold Dialog */}
      <Dialog open={soldDialog.open} onOpenChange={(open) => { if (!open) setSoldDialog({ open: false }) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>标记售出</DialogTitle>
            <DialogDescription>
              {soldDialog.item?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>售出价格（元）</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
                placeholder="请输入售出价格"
              />
            </div>
            <div className="space-y-2">
              <Label>售出渠道</Label>
              <Input
                value={soldChannel}
                onChange={(e) => setSoldChannel(e.target.value)}
                placeholder="如：闲鱼、转转、拼多多等"
              />
            </div>
            {soldDialog.item && (
              <div className="text-sm text-muted-foreground space-y-1 border-t pt-3">
                <p>总成本：¥{soldDialog.item.total_cost}</p>
                {soldPrice && !isNaN(parseFloat(soldPrice)) && (
                  <p className={parseFloat(soldPrice) - soldDialog.item.total_cost > 0 ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                    预估利润：¥{(parseFloat(soldPrice) - soldDialog.item.total_cost).toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSoldDialog({ open: false })}>取消</Button>
            <Button onClick={handleMarkSold} disabled={!soldPrice || !soldChannel.trim()}>确认售出</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing Suggestion Dialog */}
      <Dialog open={pricingDialog.open} onOpenChange={(open) => { if (!open) setPricingDialog({ open: false }) }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>智能定价建议</DialogTitle>
            <DialogDescription>
              {pricingDialog.item?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* 成色选择 */}
            <div className="space-y-2">
              <Label>商品成色</Label>
              <Select
                value={pricingCondition}
                onValueChange={(v) => {
                  setPricingCondition(v)
                  if (pricingDialog.item) fetchPricing(String(pricingDialog.item.id), v)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">95新及以上</SelectItem>
                  <SelectItem value="good">9成新</SelectItem>
                  <SelectItem value="fair">7-8成新</SelectItem>
                  <SelectItem value="poor">6成新及以下</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {pricingLoading ? (
              <div className="text-center py-8 text-muted-foreground">正在分析市场行情...</div>
            ) : pricingSuggestion ? (
              <>
                {/* 建议价格 */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                    <CardContent className="pt-4 pb-3 px-4">
                      <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">快速出手价</p>
                      <p className="text-xl font-bold text-green-700 dark:text-green-300">
                        {pricingSuggestion.quick_sell_price != null ? `¥${pricingSuggestion.quick_sell_price}` : '-'}
                      </p>
                      {pricingSuggestion.estimated_profit_quick != null && (
                        <p className={`text-xs mt-1 ${pricingSuggestion.estimated_profit_quick >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          预估利润 ¥{pricingSuggestion.estimated_profit_quick}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4 pb-3 px-4">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">利润最大化价</p>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                        {pricingSuggestion.max_profit_price != null ? `¥${pricingSuggestion.max_profit_price}` : '-'}
                      </p>
                      {pricingSuggestion.estimated_profit_max != null && (
                        <p className={`text-xs mt-1 ${pricingSuggestion.estimated_profit_max >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          预估利润 ¥{pricingSuggestion.estimated_profit_max}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* 市场行情 */}
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium">市场行情参考</p>
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">样本数</p>
                      <p className="font-medium">{pricingSuggestion.sample_count}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">中位价</p>
                      <p className="font-medium">{pricingSuggestion.median_price != null ? `¥${pricingSuggestion.median_price}` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">最低价</p>
                      <p className="font-medium">{pricingSuggestion.min_price != null ? `¥${pricingSuggestion.min_price}` : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">最高价</p>
                      <p className="font-medium">{pricingSuggestion.max_price != null ? `¥${pricingSuggestion.max_price}` : '-'}</p>
                    </div>
                  </div>
                </div>

                {pricingSuggestion.sample_count === 0 && (
                  <p className="text-sm text-amber-600 text-center">暂无同类商品数据，建议先运行对应关键词的监控任务</p>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">暂无定价数据</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPricingDialog({ open: false })}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
