import { Badge } from '@/components/ui/badge'
import type { Favorite } from '@/types/favorite'

interface CompareTableProps {
  items: Favorite[]
}

interface RowDef {
  label: string
  render: (snap: Record<string, any>, index: number, prices: number[]) => React.ReactNode
}

export function CompareTable({ items }: CompareTableProps) {
  if (items.length === 0) return null

  const prices = items.map((f) => {
    const p = f.item_snapshot.price ?? f.item_snapshot.item_price
    return typeof p === 'number' ? p : Number(p) || 0
  })
  const minPrice = Math.min(...prices)

  const rows: RowDef[] = [
    {
      label: '图片',
      render: (snap) => {
        const url = snap.image_url || snap.pic_url || snap.img
        return url ? (
          <img
            src={url}
            alt="商品图"
            className="h-24 w-24 rounded-md object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
            无图
          </div>
        )
      },
    },
    {
      label: '标题',
      render: (snap) => (
        <span className="line-clamp-2 text-sm font-medium">
          {snap.title || snap.name || '未知'}
        </span>
      ),
    },
    {
      label: '价格',
      render: (snap, index) => {
        const isMin = prices[index] === minPrice && items.length > 1
        return (
          <span className={`text-sm font-bold ${isMin ? 'text-green-600' : 'text-red-500'}`}>
            ¥{prices[index]}
            {isMin && (
              <Badge className="ml-1" variant="secondary">
                最低
              </Badge>
            )}
          </span>
        )
      },
    },
    {
      label: '成色',
      render: (snap) => (
        <span className="text-sm">{snap.condition || '--'}</span>
      ),
    },
    {
      label: '卖家',
      render: (snap) => (
        <span className="text-sm">{snap.seller_name || '--'}</span>
      ),
    },
    {
      label: 'AI评分',
      render: (snap) => (
        <span className="text-sm font-medium">
          {snap.ai_score != null ? snap.ai_score : '--'}
        </span>
      ),
    },
    {
      label: '溢价率',
      render: (snap) => {
        const rate = snap.premium_rate
        if (rate == null) return <span className="text-sm">--</span>
        const pct = (rate * 100).toFixed(1)
        const color =
          rate < 0
            ? 'text-green-600'
            : rate < 0.1
              ? 'text-blue-600'
              : rate < 0.3
                ? 'text-orange-500'
                : 'text-red-500'
        return <span className={`text-sm font-medium ${color}`}>{pct}%</span>
      },
    },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b">
            <th className="w-24 py-2 pr-4 text-sm font-medium text-muted-foreground" />
            {items.map((f) => (
              <th key={f.id} className="min-w-[160px] py-2 px-3 text-sm font-medium">
                {(f.item_snapshot.title || f.item_snapshot.name || '商品').slice(0, 20)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b last:border-0">
              <td className="py-3 pr-4 text-sm font-medium text-muted-foreground">
                {row.label}
              </td>
              {items.map((f, idx) => (
                <td key={f.id} className="px-3 py-3">
                  {row.render(f.item_snapshot, idx, prices)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
