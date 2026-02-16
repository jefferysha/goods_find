import { http } from './http'

export interface CategoryNode {
  id: string
  name: string
  level: number
  parent_id: string | null
  keywords: string[]
  children: CategoryNode[]
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  return http('/api/categories/tree')
}

export async function createCategory(data: {
  name: string
  level: number
  parent_id?: string | null
  keywords?: string[]
}): Promise<CategoryNode> {
  return http('/api/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function updateCategory(id: string, data: {
  name?: string
  keywords?: string[]
}): Promise<CategoryNode> {
  return http(`/api/categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export async function deleteCategory(id: string): Promise<{ success: boolean }> {
  return http(`/api/categories/${id}`, { method: 'DELETE' })
}

export async function getCategoryPath(id: string): Promise<{ path: string }> {
  return http(`/api/categories/${id}/path`)
}
