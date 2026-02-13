import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatPrice(price: string | number | undefined): string {
  if (price === undefined || price === null || price === '') return '-'
  const num = typeof price === 'string'
    ? parseFloat(price.replace('¥', '').replace(',', '').trim())
    : price
  return isNaN(num) ? String(price) : `¥${num.toFixed(2)}`
}
