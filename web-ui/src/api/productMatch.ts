import { http } from './http'

export interface ProductGroup {
  id: string
  name: string
  brand: string | null
  model: string | null
  category_path: string | null
  spec_summary: string | null
  created_at: string
  updated_at: string
}

export interface ItemMatch {
  id: string
  item_id: string
  product_group_id: string
  condition_tier: string
  condition_detail: string
  confidence: number
  matched_by: string
  created_at: string
}

export async function listProductGroups(params?: {
  brand?: string
  model?: string
}): Promise<ProductGroup[]> {
  return http('/api/product-groups', { params: params as Record<string, any> })
}

export async function getProductGroup(id: string): Promise<ProductGroup> {
  return http(`/api/product-groups/${id}`)
}

export async function createProductGroup(data: {
  name: string
  brand?: string
  model?: string
  category_path?: string
}): Promise<ProductGroup> {
  return http('/api/product-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteProductGroup(id: string): Promise<{ success: boolean }> {
  return http(`/api/product-groups/${id}`, { method: 'DELETE' })
}

export async function getGroupItems(groupId: string): Promise<ItemMatch[]> {
  return http(`/api/product-groups/${groupId}/items`)
}

export async function linkItemToGroup(groupId: string, data: {
  item_id: string
  condition_tier?: string
  condition_detail?: string
  confidence?: number
}): Promise<ItemMatch> {
  return http(`/api/product-groups/${groupId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function moveItem(groupId: string, itemId: string, newGroupId: string): Promise<{ success: boolean }> {
  return http(`/api/product-groups/${groupId}/items/${itemId}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_group_id: newGroupId }),
  })
}

export async function mergeGroups(targetGroupId: string, sourceGroupIds: string[]): Promise<{ success: boolean }> {
  return http('/api/product-groups/merge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_group_id: targetGroupId, source_group_ids: sourceGroupIds }),
  })
}
