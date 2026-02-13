import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import TasksPage from '../TasksPage'

vi.mock('@/hooks/tasks/useTasks', () => ({
  useTasks: vi.fn(),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

vi.mock('@/api/accounts', () => ({
  listAccounts: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/platforms', () => ({
  getAllPlatforms: () => [
    { id: 'xianyu', name: '闲鱼', color: '#FF6600', enabled: true },
  ],
}))

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}))

vi.mock('@/components/common/PlatformBadge', () => ({
  PlatformBadge: ({ platformId }: any) => <span data-testid="platform-badge">{platformId}</span>,
}))

import { useTasks } from '@/hooks/tasks/useTasks'

const baseReturn = {
  tasks: [],
  isLoading: false,
  error: null,
  createTask: vi.fn(),
  updateTask: vi.fn(),
  removeTask: vi.fn(),
  deleteTask: vi.fn(),
  startTask: vi.fn(),
  stopTask: vi.fn(),
  refreshTasks: vi.fn(),
  regenerateAiStandard: vi.fn(),
  stoppingTaskIds: new Set<number>(),
}

describe('TasksPage', () => {
  beforeEach(() => {
    vi.mocked(useTasks).mockReturnValue(baseReturn as any)
  })

  it('renders page title', () => {
    render(<TasksPage />)
    expect(screen.getByText('任务管理')).toBeInTheDocument()
  })

  it('shows empty state when no tasks', () => {
    render(<TasksPage />)
    expect(screen.getByText('没有找到任何任务。')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    vi.mocked(useTasks).mockReturnValue({ ...baseReturn, isLoading: true } as any)
    render(<TasksPage />)
    expect(screen.getByText('正在加载中...')).toBeInTheDocument()
  })

  it('shows task name when tasks exist', () => {
    vi.mocked(useTasks).mockReturnValue({
      ...baseReturn,
      tasks: [
        {
          id: 1,
          task_name: '测试任务A',
          keyword: 'MacBook',
          enabled: true,
          is_running: false,
          platform: 'xianyu',
          min_price: '100',
          max_price: '5000',
          max_pages: 3,
          cron: '',
          description: '',
          account_state_file: '',
          personal_only: true,
          free_shipping: true,
          ai_prompt_criteria_file: null,
        },
      ],
    } as any)
    render(<TasksPage />)
    expect(screen.getByText('测试任务A')).toBeInTheDocument()
  })

  it('has create task button', () => {
    render(<TasksPage />)
    expect(screen.getByText('+ 创建新任务')).toBeInTheDocument()
  })
})
