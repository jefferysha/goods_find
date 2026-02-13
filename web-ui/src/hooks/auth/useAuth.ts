import { useState, useCallback } from 'react'
import { wsService } from '@/services/websocket'

function getStoredUsername(): string | null {
  return localStorage.getItem('auth_username')
}

function getStoredLoggedIn(): boolean {
  return localStorage.getItem('auth_logged_in') === 'true'
}

export function useAuth() {
  const [username, setUsername] = useState<string | null>(getStoredUsername)
  const [isAuthenticated, setIsAuthenticated] = useState(getStoredLoggedIn)

  const setAuthenticated = useCallback((user: string) => {
    setUsername(user)
    setIsAuthenticated(true)
    localStorage.setItem('auth_username', user)
    localStorage.setItem('auth_logged_in', 'true')
    // Start WebSocket connection
    wsService.start()
  }, [])

  const logout = useCallback(() => {
    setUsername(null)
    setIsAuthenticated(false)
    localStorage.removeItem('auth_username')
    localStorage.removeItem('auth_logged_in')
    // Stop WebSocket connection
    wsService.stop()
    window.location.href = '/login'
  }, [])

  const login = useCallback(
    async (user: string, pass: string): Promise<boolean> => {
      try {
        const response = await fetch('/auth/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user, password: pass }),
        })

        if (response.ok) {
          setAuthenticated(user)
          return true
        }
        return false
      } catch (e) {
        console.error('Login error', e)
        return false
      }
    },
    [setAuthenticated],
  )

  return {
    username,
    isAuthenticated,
    login,
    logout,
  }
}
