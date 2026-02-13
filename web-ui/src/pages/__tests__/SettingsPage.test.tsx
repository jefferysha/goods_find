import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import SettingsPage from '../SettingsPage'

vi.mock('@/hooks/settings/useSettings', () => ({
  useSettings: vi.fn(),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

vi.mock('@/api/prompts', () => ({
  listPrompts: vi.fn().mockResolvedValue([]),
  getPromptContent: vi.fn().mockResolvedValue({ content: '' }),
  updatePrompt: vi.fn().mockResolvedValue({ message: 'ok' }),
}))

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}))

import { useSettings } from '@/hooks/settings/useSettings'

const baseReturn = {
  notificationSettings: {},
  setNotificationSettings: vi.fn(),
  aiSettings: {},
  setAiSettings: vi.fn(),
  rotationSettings: {},
  setRotationSettings: vi.fn(),
  systemStatus: null,
  isLoading: false,
  isSaving: false,
  isReady: true,
  error: null,
  refreshStatus: vi.fn(),
  saveNotificationSettings: vi.fn(),
  saveAiSettings: vi.fn(),
  saveRotationSettings: vi.fn(),
  testAiConnection: vi.fn(),
}

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.mocked(useSettings).mockReturnValue(baseReturn as any)
  })

  it('renders page title', () => {
    render(<SettingsPage />)
    expect(screen.getByText('系统设置')).toBeInTheDocument()
  })

  it('renders tab list', () => {
    render(<SettingsPage />)
    expect(screen.getByText('AI 模型')).toBeInTheDocument()
    expect(screen.getByText('通知推送')).toBeInTheDocument()
    expect(screen.getByText('IP 轮换')).toBeInTheDocument()
    expect(screen.getByText('系统状态')).toBeInTheDocument()
    expect(screen.getByText('Prompt 管理')).toBeInTheDocument()
  })

  it('shows AI settings card by default', () => {
    render(<SettingsPage />)
    expect(screen.getByText('AI 模型设置')).toBeInTheDocument()
  })
})
