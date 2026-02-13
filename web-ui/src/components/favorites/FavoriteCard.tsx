import { Heart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { Favorite } from '@/types/favorite'

interface FavoriteCardProps {
  favorite: Favorite
  selected: boolean
  onSelect: (id: string, checked: boolean) => void
  onRemove: (id: string) => void
}

export function FavoriteCard({
  favorite,
  selected,
  onSelect,
  onRemove,
}: FavoriteCardProps) {
  const snap = favorite.item_snapshot
  const title = snap.title || snap.name || '未知商品'
  const price = snap.price ?? snap.item_price ?? '--'
  const imageUrl = snap.image_url || snap.pic_url || snap.img || null

  return (
    <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
      {/* Compare checkbox */}
      <div className="absolute left-3 top-3 z-10">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(favorite.id, !!checked)}
          className="bg-background/80 backdrop-blur-sm"
        />
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 z-10 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => onRemove(favorite.id)}
      >
        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
      </Button>

      {/* Image */}
      {imageUrl ? (
        <div className="aspect-square w-full overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex aspect-square w-full items-center justify-center bg-muted text-muted-foreground">
          暂无图片
        </div>
      )}

      <CardContent className="p-3">
        <h3 className="mb-1 line-clamp-2 text-sm font-medium leading-tight">
          {title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-red-500">¥{price}</span>
          {snap.condition && (
            <span className="text-xs text-muted-foreground">{snap.condition}</span>
          )}
        </div>
        {snap.seller_name && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            卖家: {snap.seller_name}
          </p>
        )}
        {favorite.note && (
          <p className="mt-1 truncate text-xs text-blue-500">备注: {favorite.note}</p>
        )}
      </CardContent>
    </Card>
  )
}
