import { http } from './http'

export interface SellerCreditInfo {
  seller_id: string
  seller_name?: string
  credit_score: number | null
  credit_level: string | null
  is_blacklisted: boolean
  is_whitelisted: boolean
}

export async function getSellerCredit(sellerId: string): Promise<SellerCreditInfo> {
  return http(`/api/seller-credit/${sellerId}`)
}

export async function addToBlacklist(sellerId: string, sellerName: string, reason: string = ''): Promise<void> {
  return http('/api/seller-credit/blacklist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seller_id: sellerId, seller_name: sellerName, reason }),
  })
}

export async function addToWhitelist(sellerId: string, sellerName: string, reason: string = ''): Promise<void> {
  return http('/api/seller-credit/whitelist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seller_id: sellerId, seller_name: sellerName, reason }),
  })
}

export async function removeFromList(sellerId: string): Promise<void> {
  return http(`/api/seller-credit/list/${sellerId}`, { method: 'DELETE' })
}
