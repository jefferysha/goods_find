/**
 * 认证 API
 */

export interface UserInfo {
  id: number
  username: string
  display_name: string
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: UserInfo
}

/**
 * 用户注册
 */
export async function apiRegister(data: {
  username: string
  password: string
  display_name?: string
}): Promise<TokenResponse> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || '注册失败')
  }
  return response.json()
}

/**
 * 用户登录
 */
export async function apiLogin(data: {
  username: string
  password: string
}): Promise<TokenResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || '登录失败')
  }
  return response.json()
}

/**
 * 获取当前用户信息
 */
export async function apiGetMe(token: string): Promise<UserInfo> {
  const response = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    throw new Error('Token 无效')
  }
  return response.json()
}

/**
 * 修改密码
 */
export async function apiChangePassword(
  token: string,
  data: { old_password: string; new_password: string }
): Promise<void> {
  const response = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.detail || '修改密码失败')
  }
}
