/**
 * 实时商品推送通知组件
 * 监听 WebSocket 的 new_item_discovered 事件，展示浮动通知卡片
 */
import { useCallback, useState } from 'react'
import { useWebSocket } from '@/hooks/shared/useWebSocket'
import { X } from 'lucide-react'

interface LiveItem {
  id: string
  task_name: string
  keyword: string
  item_id: string
  title: string
  price: number | null
  image_url: string | null
  item_link: string | null
  seller_name: string | null
  is_recommended: boolean | null
  ai_reason: string | null
  instant_notify: boolean
  timestamp: number
}

const MAX_VISIBLE = 5

export default function LiveItemToast() {
  const [items, setItems] = useState<LiveItem[]>([])

  const handleNewItem = useCallback((data: any) => {
    const item: LiveItem = {
      ...data,
      id: `${data.item_id}-${Date.now()}`,
      timestamp: Date.now(),
    }

    setItems((prev) => {
      const next = [item, ...prev].slice(0, MAX_VISIBLE)
      return next
    })

    // 自动移除（12 秒后淡出）
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    }, 12000)
  }, [])

  useWebSocket('new_item_discovered', handleNewItem)

  const dismiss = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {items.map((item) => (
        <div
          key={item.id}
          className="relative bg-card border border-border rounded-lg shadow-lg p-3 animate-in slide-in-from-right-5 fade-in duration-300"
        >
          <button
            onClick={() => dismiss(item.id)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="flex gap-3">
            {item.image_url && (
              <img
                src={item.image_url}
                alt=""
                className="w-12 h-12 rounded object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                {item.instant_notify && (
                  <span className="text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1 py-0.5 rounded">
                    速报
                  </span>
                )}
                {item.is_recommended === true && (
                  <span className="text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1 py-0.5 rounded">
                    AI推荐
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground truncate">
                  {item.keyword}
                </span>
              </div>

              <a
                href={item.item_link || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-foreground hover:underline line-clamp-1"
              >
                {item.title}
              </a>

              <div className="flex items-center justify-between mt-1">
                {item.price != null && (
                  <span className="text-sm font-bold text-orange-500">
                    ¥{item.price}
                  </span>
                )}
                {item.seller_name && (
                  <span className="text-[10px] text-muted-foreground">
                    {item.seller_name}
                  </span>
                )}
              </div>

              {item.ai_reason && (
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                  {item.ai_reason}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
