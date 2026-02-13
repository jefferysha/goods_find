import { useState, useEffect } from 'react'
import { ExternalLink, ShoppingCart } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import type { CategoryOverview } from '@/api/premiumMap'

interface Item {
  商品信息: {
    商品ID: string
    商品标题: string
    当前售价: string
    商品主图链接: string
    商品链接: string
  }
  evaluation_status: string
  estimated_profit?: number
  estimated_profit_rate?: number
  platform?: string
}

interface ItemListDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: CategoryOverview | null
}

export function ItemListDialog({ open, onOpenChange, category }: ItemListDialogProps) {
  const [items, setItems] = useState<Item[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [statusFilter, setStatusFilter] = useState('good_deal')
  const [sortBy, setSortBy] = useState('profit_rate')
  const [isLoading, setIsLoading] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const { toast } = useToast()
  
  useEffect(() => {
    if (open && category) {
      loadItems()
    } else {
      setItems([])
      setSelectedIds(new Set())
    }
  }, [open, category, statusFilter, sortBy])
  
  const loadItems = async () => {
    if (!category) return
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      params.set('sort_by', sortBy)
      
      const res = await fetch(
        `/api/premium-map/categories/${category.category_id}/items?${params}`
      )
      const data = await res.json()
      setItems(data.items || [])
    } catch (err) {
      console.error(err)
      toast({
        title: '加载失败',
        description: (err as Error).message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  const toggleSelection = (itemId: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(itemId)) {
      newSet.delete(itemId)
    } else {
      newSet.add(itemId)
    }
    setSelectedIds(newSet)
  }
  
  const toggleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((i) => i.商品信息.商品ID)))
    }
  }
  
  const handleBatchAdd = async () => {
    if (selectedIds.size === 0 || !category) return
    setIsAdding(true)
    try {
      const res = await fetch(
        `/api/premium-map/categories/${category.category_id}/items/batch-purchase`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ item_ids: Array.from(selectedIds) }),
        }
      )
      const data = await res.json()
      toast({ title: `已加入 ${data.added_count} 件商品到采购清单` })
      setSelectedIds(new Set())
    } catch (err) {
      toast({
        title: '操作失败',
        description: (err as Error).message,
        variant: 'destructive',
      })
    } finally {
      setIsAdding(false)
    }
  }
  
  const extractPrice = (priceStr: string): number => {
    const cleaned = priceStr.replace(/¥|,/g, '').trim()
    return parseFloat(cleaned) || 0
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {category?.category_name}
            <Badge variant="default">{items.length} 件商品</Badge>
          </DialogTitle>
          {category && (
            <DialogDescription>
              收购区间：¥{category.purchase_range[0]?.toFixed(0) || '--'} ~ ¥
              {category.purchase_range[1]?.toFixed(0) || '--'}
            </DialogDescription>
          )}
        </DialogHeader>
        
        {/* 筛选工具栏 */}
        <div className="flex items-center gap-3 border-b pb-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="great_deal">超值捡漏</SelectItem>
              <SelectItem value="good_deal">可收</SelectItem>
              <SelectItem value="all">全部</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profit_rate">按利润率</SelectItem>
              <SelectItem value="profit">按利润金额</SelectItem>
              <SelectItem value="price">按价格</SelectItem>
              <SelectItem value="crawl_time">按爬取时间</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex-1" />
          
          <Button
            size="sm"
            onClick={handleBatchAdd}
            disabled={selectedIds.size === 0 || isAdding}
          >
            <ShoppingCart className="mr-1.5 h-4 w-4" />
            批量加入采购 ({selectedIds.size})
          </Button>
        </div>
        
        {/* 商品列表 */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              加载中...
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              暂无商品
            </div>
          ) : (
            <div className="space-y-2">
              {/* 全选行 */}
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-md sticky top-0 z-10">
                <Checkbox
                  checked={selectedIds.size === items.length && items.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  全选 {selectedIds.size > 0 && `(已选 ${selectedIds.size} 件)`}
                </span>
              </div>
              
              {items.map((item) => {
                const itemId = item.商品信息?.商品ID
                const price = extractPrice(item.商品信息?.当前售价 || '0')
                
                return (
                  <div
                    key={itemId}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      checked={selectedIds.has(itemId)}
                      onCheckedChange={() => toggleSelection(itemId)}
                    />
                    
                    {/* 商品图片 */}
                    <img
                      src={item.商品信息?.商品主图链接 || '/placeholder.png'}
                      alt={item.商品信息?.商品标题}
                      className="h-16 w-16 rounded object-cover flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder.png'
                      }}
                    />
                    
                    {/* 商品信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1">
                        <h4 className="text-sm font-medium line-clamp-1 flex-1">
                          {item.商品信息?.商品标题}
                        </h4>
                        {item.evaluation_status === 'great_deal' && (
                          <Badge className="bg-emerald-600 flex-shrink-0">超值</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          售价:{' '}
                          <span className="font-mono font-semibold text-foreground">
                            ¥{price.toFixed(0)}
                          </span>
                        </span>
                        {item.estimated_profit != null && (
                          <span>
                            预估利润:{' '}
                            <span className="font-mono font-semibold text-emerald-600">
                              ¥{item.estimated_profit.toFixed(0)}
                            </span>
                          </span>
                        )}
                        {item.estimated_profit_rate != null && (
                          <span>
                            利润率:{' '}
                            <span className="font-mono font-semibold text-emerald-600">
                              {(item.estimated_profit_rate * 100).toFixed(1)}%
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        window.open(item.商品信息?.商品链接, '_blank', 'noopener,noreferrer')
                      }
                      className="flex-shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
