import { useEffect, useState } from 'react'
import { usePurchases } from '@/hooks/purchases/usePurchases'
import type { PurchaseItem, PurchaseStatus } from '@/types/purchase'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

const STATUS_MAP: Record<PurchaseStatus, { label: string; color: string }> = {
  new: { label: '新发现', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  contacting: { label: '联系中', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  negotiating: { label: '议价中', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  purchased: { label: '已收货', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  abandoned: { label: '已放弃', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
}

const ALL_STATUSES: PurchaseStatus[] = ['new', 'contacting', 'negotiating', 'purchased', 'abandoned']

function StatusBadge({ status }: { status: PurchaseStatus }) {
  const cfg = STATUS_MAP[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

export default function PurchasesPage() {
  const {
    items,
    stats,
    isLoading,
    filters,
    setFilters,
    updateItem,
    deleteItem,
    markPurchased,
    batchAssign,
    refresh,
  } = usePurchases()

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Mark Purchased Dialog
  const [markDialog, setMarkDialog] = useState<{ open: boolean; item?: PurchaseItem }>({ open: false })
  const [actualPrice, setActualPrice] = useState('')

  // Batch Assign Dialog
  const [assignDialog, setAssignDialog] = useState(false)
  const [assignee, setAssignee] = useState('')

  useEffect(() => {
    refresh()
  }, [refresh])

  const handleFilterStatus = (value: string) => {
    const newFilters = { ...filters, status: value === 'all' ? undefined : value as PurchaseStatus }
    setFilters(newFilters)
    refresh(newFilters)
  }

  const handleStatusChange = async (item: PurchaseItem, newStatus: PurchaseStatus) => {
    if (newStatus === 'purchased') {
      setMarkDialog({ open: true, item })
      setActualPrice(String(item.price))
    } else {
      await updateItem(item.id, { status: newStatus })
    }
  }

  const handleMarkPurchased = async () => {
    if (!markDialog.item) return
    const price = parseFloat(actualPrice)
    if (isNaN(price) || price <= 0) return
    await markPurchased(markDialog.item.id, price)
    setMarkDialog({ open: false })
    setActualPrice('')
  }

  const handleBatchAssign = async () => {
    if (!assignee.trim() || selectedIds.size === 0) return
    await batchAssign(Array.from(selectedIds), assignee.trim())
    setAssignDialog(false)
    setAssignee('')
    setSelectedIds(new Set())
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('确认删除该采购项？')) return
    await deleteItem(id)
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)))
    }
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">采购清单</h1>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button variant="outline" onClick={() => setAssignDialog(true)}>
              批量分配 ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" onClick={() => refresh()}>
            刷新
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ALL_STATUSES.map((s) => (
            <Card key={s} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleFilterStatus(filters.status === s ? 'all' : s)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {STATUS_MAP[s].label}
                </CardTitle>
                <StatusBadge status={s} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.by_status?.[s] ?? 0}</div>
              </CardContent>
            </Card>
          ))}
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
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={items.length > 0 && selectedIds.size === items.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>商品标题</TableHead>
              <TableHead className="w-[90px] text-right">售价</TableHead>
              <TableHead className="w-[100px] text-right">预估利润</TableHead>
              <TableHead className="w-[80px]">平台</TableHead>
              <TableHead className="w-[80px]">负责人</TableHead>
              <TableHead className="w-[90px]">状态</TableHead>
              <TableHead className="w-[110px]">加入时间</TableHead>
              <TableHead className="w-[130px]">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  加载中...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  暂无采购数据
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt=""
                          className="h-10 w-10 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        {item.item_link ? (
                          <a
                            href={item.item_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline text-foreground line-clamp-2"
                          >
                            {item.title}
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-foreground line-clamp-2">{item.title}</span>
                        )}
                        <p className="text-xs text-muted-foreground">{item.keyword}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">¥{item.price}</TableCell>
                  <TableCell className="text-right">
                    {item.estimated_profit != null ? (
                      <span className={item.estimated_profit > 0 ? 'text-green-600' : 'text-red-500'}>
                        ¥{item.estimated_profit.toFixed(0)}
                        {item.estimated_profit_rate != null && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({(item.estimated_profit_rate * 100).toFixed(0)}%)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{item.platform}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{item.assignee || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="cursor-pointer">
                          <StatusBadge status={item.status} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {ALL_STATUSES.map((s) => (
                          <DropdownMenuItem
                            key={s}
                            onClick={() => handleStatusChange(item, s)}
                            disabled={s === item.status}
                          >
                            <StatusBadge status={s} />
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(item.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {item.status !== 'purchased' && item.status !== 'abandoned' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setMarkDialog({ open: true, item })
                            setActualPrice(String(item.price))
                          }}
                        >
                          收货
                        </Button>
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

      {/* Mark Purchased Dialog */}
      <Dialog open={markDialog.open} onOpenChange={(open) => { if (!open) setMarkDialog({ open: false }) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>标记已收货</DialogTitle>
            <DialogDescription>
              {markDialog.item?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>实际收购价（元）</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={actualPrice}
                onChange={(e) => setActualPrice(e.target.value)}
                placeholder="请输入实际收购价格"
              />
            </div>
            {markDialog.item && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>商品售价：¥{markDialog.item.price}</p>
                {markDialog.item.purchase_range_low != null && markDialog.item.purchase_range_high != null && (
                  <p>建议收购区间：¥{markDialog.item.purchase_range_low} - ¥{markDialog.item.purchase_range_high}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkDialog({ open: false })}>取消</Button>
            <Button onClick={handleMarkPurchased}>确认收货</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Assign Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>批量分配负责人</DialogTitle>
            <DialogDescription>
              已选择 {selectedIds.size} 个采购项
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>负责人</Label>
              <Input
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="请输入负责人名称"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>取消</Button>
            <Button onClick={handleBatchAssign} disabled={!assignee.trim()}>确认分配</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
