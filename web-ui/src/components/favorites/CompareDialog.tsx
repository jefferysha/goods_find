import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CompareTable } from './CompareTable'
import type { Favorite } from '@/types/favorite'

interface CompareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Favorite[]
}

export function CompareDialog({ open, onOpenChange, items }: CompareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>商品对比</DialogTitle>
          <DialogDescription>
            对比 {items.length} 个收藏商品的详细信息
          </DialogDescription>
        </DialogHeader>
        <CompareTable items={items} />
      </DialogContent>
    </Dialog>
  )
}
