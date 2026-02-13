import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/test-utils'
import FavoritesPage from '../FavoritesPage'
import type { Favorite } from '@/types/favorite'

vi.mock('@/hooks/favorites/useFavorites', () => ({
  useFavorites: vi.fn(),
}))

vi.mock('@/components/favorites/FavoriteCard', () => ({
  FavoriteCard: (props: any) => (
    <div data-testid="fav-card">{props.favorite?.id}</div>
  ),
}))

vi.mock('@/components/favorites/CompareDialog', () => ({
  CompareDialog: () => null,
}))

vi.mock('lucide-react', () => ({
  Heart: () => <span>Heart</span>,
  GitCompareArrows: () => <span>Compare</span>,
}))

import { useFavorites } from '@/hooks/favorites/useFavorites'

const baseReturn = {
  favorites: [] as Favorite[],
  loading: false,
  load: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
}

describe('FavoritesPage', () => {
  beforeEach(() => {
    vi.mocked(useFavorites).mockReturnValue(baseReturn)
  })

  it('renders page title "收藏对比"', () => {
    render(<FavoritesPage />)
    expect(screen.getByText('收藏对比')).toBeInTheDocument()
  })

  it('shows loading spinner when loading=true', () => {
    vi.mocked(useFavorites).mockReturnValue({ ...baseReturn, loading: true })
    const { container } = render(<FavoritesPage />)
    // The spinner uses animate-spin class
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('shows empty state "暂无收藏" when favorites=[]', () => {
    render(<FavoritesPage />)
    expect(screen.getByText('暂无收藏')).toBeInTheDocument()
  })

  it('shows hint text in empty state', () => {
    render(<FavoritesPage />)
    expect(
      screen.getByText(/在结果查看页面中.*加入收藏/),
    ).toBeInTheDocument()
  })

  it('shows favorite cards when favorites has items', () => {
    const favorites: Favorite[] = [
      {
        id: 'fav-1',
        item_id: 'item1',
        task_id: 1,
        item_snapshot: {},
        note: '',
        created_at: '2025-01-01',
      },
      {
        id: 'fav-2',
        item_id: 'item2',
        task_id: 1,
        item_snapshot: {},
        note: '',
        created_at: '2025-01-02',
      },
    ]
    vi.mocked(useFavorites).mockReturnValue({ ...baseReturn, favorites })
    render(<FavoritesPage />)
    const cards = screen.getAllByTestId('fav-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('fav-1')
    expect(cards[1]).toHaveTextContent('fav-2')
  })

  it('shows selection count text', () => {
    const favorites: Favorite[] = [
      {
        id: 'fav-1',
        item_id: 'item1',
        task_id: 1,
        item_snapshot: {},
        note: '',
        created_at: '2025-01-01',
      },
    ]
    vi.mocked(useFavorites).mockReturnValue({ ...baseReturn, favorites })
    render(<FavoritesPage />)
    expect(screen.getByText(/共 1 个收藏.*已选择 0 个/)).toBeInTheDocument()
  })

  it('calls load on mount', () => {
    const load = vi.fn()
    vi.mocked(useFavorites).mockReturnValue({ ...baseReturn, load })
    render(<FavoritesPage />)
    expect(load).toHaveBeenCalled()
  })
})
