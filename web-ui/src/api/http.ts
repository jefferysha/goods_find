/**
 * HTTP 客户端 - 自动携带 JWT Token
 */

// Token 存储键
const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
  /** 跳过 Token 附带（用于登录/注册等公开接口） */
  skipAuth?: boolean
}

/**
 * 获取存储的 Token
 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

/**
 * 存储 Token 和用户信息
 */
export function setAuth(token: string, user: { id: number; username: string; display_name: string }) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  // 兼容旧逻辑
  localStorage.setItem('auth_logged_in', 'true')
  localStorage.setItem('auth_username', user.username)
}

/**
 * 清除认证信息
 */
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem('auth_logged_in')
  localStorage.removeItem('auth_username')
}

/**
 * 获取当前用户信息
 */
export function getStoredUser(): { id: number; username: string; display_name: string } | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * 检查是否已登录（有 Token）
 */
export function isAuthenticated(): boolean {
  return !!getToken()
}

/**
 * 带鉴权的 HTTP 请求
 */
export async function http(url: string, options: FetchOptions = {}) {
  const { skipAuth, params, ...fetchOptions } = options
  const headers = new Headers(fetchOptions.headers)

  // 自动附带 Token
  if (!skipAuth) {
    const token = getToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  let fullUrl = url
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      fullUrl += (url.includes('?') ? '&' : '?') + queryString
    }
  }

  const config: RequestInit = { ...fetchOptions, headers }
  const response = await fetch(fullUrl, config)

  if (response.status === 401) {
    clearAuth()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
  }

  if (response.status === 204) return null
  return response.json()
}
