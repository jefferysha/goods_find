import type { TeamMember, TeamPerformance, WorkspaceData } from '@/types/team'
import { http } from './http'

/** 获取所有团队成员 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  return await http('/api/team/members')
}

/** 获取成员详情 */
export async function getMember(userId: number): Promise<TeamMember> {
  return await http(`/api/team/members/${userId}`)
}

/** 更新成员 */
export async function updateMember(
  userId: number,
  data: Partial<TeamMember>,
): Promise<TeamMember> {
  return await http(`/api/team/members/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

/** 获取团队业绩 */
export async function getTeamPerformance(params?: {
  user_id?: number
  start_date?: string
  end_date?: string
}): Promise<TeamPerformance[]> {
  return await http('/api/team/performance', {
    params: params as Record<string, any>,
  })
}

/** 获取成员工作台数据 */
export async function getWorkspace(userId: number): Promise<WorkspaceData> {
  return await http(`/api/team/workspace/${userId}`)
}
