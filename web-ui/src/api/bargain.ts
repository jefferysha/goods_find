import { http } from './http'

export interface BargainStrategy {
  id: string
  name: string
  description: string
}

export interface BargainScript {
  opening: string
  reasoning: string
  follow_up: string
}

export interface BargainResult {
  scripts: BargainScript[]
  error?: string
}

export async function getBargainStrategies(): Promise<BargainStrategy[]> {
  return http('/api/bargain/strategies')
}

export async function generateBargainScripts(
  itemInfo: Record<string, any>,
  targetPrice: number,
  strategy: string = 'gentle'
): Promise<BargainResult> {
  return http('/api/bargain/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      item_info: itemInfo,
      target_price: targetPrice,
      strategy,
    }),
  })
}
