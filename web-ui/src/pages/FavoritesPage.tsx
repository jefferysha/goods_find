import { useEffect, useState, useMemo } from 'react'
import { Heart, GitCompareArrows } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useFavorites } from '@/hooks/favorites/useFavorites'
import { FavoriteCard } from '@/components/favorites/FavoriteCard'
import { CompareDialog } from '@/components/favorites/CompareDialog'

export default function FavoritesPage() {
  const { favorites, loading, load, remove } = useFavorites()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [compareOpen, setCompareOpen] = useState(false)

  useEffect(() => {
    load()
  }, [load])

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }

  const handleRemove = async (id: string) => {
    await remove(id)
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const selectedItems = useMemo(
    () => favorites.filter((f) => selectedIds.has(f.id)),
    [favorites, selectedIds],
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">收藏对比</h1>
        <div className="flex h-60 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-foreground">收藏对比</h1>

      {favorites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Heart className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h2 className="mb-2 text-lg font-semibold text-muted-foreground">暂无收藏</h2>
            <p className="text-sm text-muted-foreground">
              在结果查看页面中，可以将感兴趣的商品加入收藏进行对比。
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Selection hint */}
          <p className="text-sm text-muted-foreground">
            共 {favorites.length} 个收藏，已选择 {selectedIds.size} 个
          </p>

          {/* Card Grid */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {favorites.map((fav) => (
              <FavoriteCard
                key={fav.id}
                favorite={fav}
                selected={selectedIds.has(fav.id)}
                onSelect={handleSelect}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </>
      )}

      {/* Fixed bottom compare bar */}
      {selectedIds.size >= 2 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 px-6 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="mx-auto flex max-w-7xl items-center justify-between">
            <span className="text-sm text-muted-foreground">
              已选择 <strong>{selectedIds.size}</strong> 个商品
              {selectedIds.size > 4 && (
                <span className="ml-2 text-orange-500">（最多对比 4 个）</span>
              )}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                取消选择
              </Button>
              <Button
                size="sm"
                disabled={selectedIds.size > 4}
                onClick={() => setCompareOpen(true)}
              >
                <GitCompareArrows className="mr-1 h-4 w-4" />
                对比 ({Math.min(selectedIds.size, 4)})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Compare Dialog */}
      <CompareDialog
        open={compareOpen}
        onOpenChange={setCompareOpen}
        items={selectedItems.slice(0, 4)}
      />
    </div>
  )
}
