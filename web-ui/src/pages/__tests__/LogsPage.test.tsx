import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import LogsPage from '../LogsPage'

vi.mock('@/hooks/logs/useLogs', () => ({
  useLogs: vi.fn(),
}))

vi.mock('@/hooks/tasks/useTasks', () => ({
  useTasks: vi.fn(),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

import { useLogs } from '@/hooks/logs/useLogs'
import { useTasks } from '@/hooks/tasks/useTasks'

const baseLogsReturn = {
  logs: '',
  isAutoRefresh: false,
  isLoading: false,
  isFetchingHistory: false,
  hasMoreHistory: false,
  error: null,
  fetchLogs: vi.fn(),
  clearLogs: vi.fn(),
  toggleAutoRefresh: vi.fn(),
  setTaskId: vi.fn(),
  loadLatest: vi.fn(),
  loadPrevious: vi.fn(),
}

const baseTasksReturn = {
  tasks: [],
  isLoading: false,
  error: null,
  createTask: vi.fn(),
  updateTask: vi.fn(),
  removeTask: vi.fn(),
  startTask: vi.fn(),
  stopTask: vi.fn(),
  refreshTasks: vi.fn(),
  regenerateAiStandard: vi.fn(),
  stoppingTaskIds: new Set<number>(),
}

describe('LogsPage', () => {
  beforeEach(() => {
    vi.mocked(useLogs).mockReturnValue(baseLogsReturn)
    vi.mocked(useTasks).mockReturnValue(baseTasksReturn as any)
  })

  it('renders page title', () => {
    render(<LogsPage />)
    expect(screen.getByText('运行日志')).toBeInTheDocument()
  })

  it('shows default hint when no logs', () => {
    render(<LogsPage />)
    expect(screen.getByText('暂无日志输出...')).toBeInTheDocument()
  })

  it('shows log content when available', () => {
    vi.mocked(useLogs).mockReturnValue({
      ...baseLogsReturn,
      logs: '[INFO] 任务启动成功',
    })
    render(<LogsPage />)
    expect(screen.getByText('[INFO] 任务启动成功')).toBeInTheDocument()
  })
})
