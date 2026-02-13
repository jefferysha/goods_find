import { useState, useEffect, useCallback } from 'react'
import * as settingsApi from '@/api/settings'
import type { NotificationSettings, AiSettings, RotationSettings, SystemStatus } from '@/api/settings'

export function useSettings() {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({})
  const [aiSettings, setAiSettings] = useState<AiSettings>({})
  const [rotationSettings, setRotationSettings] = useState<RotationSettings>({})
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [isReady, setIsReady] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [notif, ai, rotation, status] = await Promise.all([
        settingsApi.getNotificationSettings(),
        settingsApi.getAiSettings(),
        settingsApi.getRotationSettings(),
        settingsApi.getSystemStatus(),
      ])
      setNotificationSettings(notif)
      setAiSettings(ai)
      setRotationSettings(rotation)
      setSystemStatus(status)
    } catch (e) {
      if (e instanceof Error) setError(e)
    } finally {
      setIsLoading(false)
      setIsReady(true)
    }
  }, [])

  const refreshStatus = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setSystemStatus(await settingsApi.getSystemStatus())
    } catch (e) {
      if (e instanceof Error) setError(e)
      throw e
    } finally {
      setIsLoading(false)
    }
  }, [])

  const saveNotificationSettings = useCallback(async (settings: NotificationSettings) => {
    setIsSaving(true)
    try {
      await settingsApi.updateNotificationSettings(settings)
      setNotificationSettings(settings)
      // Refresh status as env file changed
      setSystemStatus(await settingsApi.getSystemStatus())
    } catch (e) {
      if (e instanceof Error) setError(e)
      throw e
    } finally {
      setIsSaving(false)
    }
  }, [])

  const saveAiSettings = useCallback(async (settings: AiSettings) => {
    setIsSaving(true)
    try {
      const payload = { ...settings }
      const apiKey = (payload.OPENAI_API_KEY || '').trim()
      if (apiKey) {
        payload.OPENAI_API_KEY = apiKey
      } else {
        delete payload.OPENAI_API_KEY
      }
      await settingsApi.updateAiSettings(payload)
      // Clear the API key from local state after save
      setAiSettings((prev) => ({ ...prev, OPENAI_API_KEY: '' }))
      // Refresh status
      setSystemStatus(await settingsApi.getSystemStatus())
    } catch (e) {
      if (e instanceof Error) setError(e)
      throw e
    } finally {
      setIsSaving(false)
    }
  }, [])

  const saveRotationSettings = useCallback(async (settings: RotationSettings) => {
    setIsSaving(true)
    try {
      await settingsApi.updateRotationSettings(settings)
      setRotationSettings(settings)
    } catch (e) {
      if (e instanceof Error) setError(e)
      throw e
    } finally {
      setIsSaving(false)
    }
  }, [])

  const testAiConnection = useCallback(async (settings: AiSettings) => {
    setIsSaving(true)
    try {
      const payload = { ...settings }
      const apiKey = (payload.OPENAI_API_KEY || '').trim()
      if (apiKey) {
        payload.OPENAI_API_KEY = apiKey
      } else {
        delete payload.OPENAI_API_KEY
      }
      return await settingsApi.testAiSettings(payload)
    } catch (e) {
      if (e instanceof Error) setError(e)
      throw e
    } finally {
      setIsSaving(false)
    }
  }, [])

  // Load all settings on mount
  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return {
    notificationSettings,
    setNotificationSettings,
    aiSettings,
    setAiSettings,
    rotationSettings,
    setRotationSettings,
    systemStatus,
    isLoading,
    isSaving,
    isReady,
    error,
    fetchAll,
    saveNotificationSettings,
    saveAiSettings,
    saveRotationSettings,
    testAiConnection,
    refreshStatus,
  }
}
