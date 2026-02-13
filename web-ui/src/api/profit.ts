import { http } from './http'
import type {
  SaleRecord,
  ProfitSummary,
  KeywordProfit,
  AssigneeProfit,
  DailyProfit,
  ProfitFilters,
} from '@/types/profit'

export async function getSaleRecords(filters?: ProfitFilters): Promise<SaleRecord[]> {
  return http('/api/profit/records', { params: filters as Record<string, any> })
}

export async function getProfitSummary(filters?: ProfitFilters): Promise<ProfitSummary> {
  return http('/api/profit/summary', { params: filters as Record<string, any> })
}

export async function getProfitByKeyword(filters?: ProfitFilters): Promise<KeywordProfit[]> {
  return http('/api/profit/by-keyword', { params: filters as Record<string, any> })
}

export async function getProfitByAssignee(filters?: ProfitFilters): Promise<AssigneeProfit[]> {
  return http('/api/profit/by-assignee', { params: filters as Record<string, any> })
}

export async function getDailyProfit(days?: number, assignee?: string): Promise<DailyProfit[]> {
  return http('/api/profit/daily-trend', { params: { days, assignee } })
}
