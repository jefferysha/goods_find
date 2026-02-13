export function calculatePremiumRate(price: number, referencePrice: number): number {
  if (referencePrice <= 0) return 0
  return Math.round(((price - referencePrice) / referencePrice) * 10000) / 100
}

export function getPriceLevel(
  premiumRate: number,
  thresholds = { lowPriceMax: -15, fairMax: 5, slightPremiumMax: 20 },
): string {
  if (premiumRate < thresholds.lowPriceMax) return 'low_price'
  if (premiumRate <= thresholds.fairMax) return 'fair'
  if (premiumRate <= thresholds.slightPremiumMax) return 'slight_premium'
  return 'high_premium'
}

export function parsePriceNumber(priceStr: string | number | undefined): number {
  if (priceStr === undefined || priceStr === null) return 0
  const str = String(priceStr).replace('¥', '').replace(',', '').trim()
  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}
