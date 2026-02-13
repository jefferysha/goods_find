import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense, type ReactNode } from 'react'
import LoginPage from '@/pages/LoginPage'
import MainLayout from '@/components/layout/MainLayout'
import { isAuthenticated } from '@/api/http'

// Lazy-loaded pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const TasksPage = lazy(() => import('@/pages/TasksPage'))
const AccountsPage = lazy(() => import('@/pages/AccountsPage'))
const ResultsPage = lazy(() => import('@/pages/ResultsPage'))
const FavoritesPage = lazy(() => import('@/pages/FavoritesPage'))
const LogsPage = lazy(() => import('@/pages/LogsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const AlertsPage = lazy(() => import('@/pages/AlertsPage'))
const BargainRadarPage = lazy(() => import('@/pages/BargainRadarPage'))
const PriceBookPage = lazy(() => import('@/pages/PriceBookPage'))
const PurchasesPage = lazy(() => import('@/pages/PurchasesPage'))
const InventoryPage = lazy(() => import('@/pages/InventoryPage'))
const ProfitPage = lazy(() => import('@/pages/ProfitPage'))
const TeamPage = lazy(() => import('@/pages/TeamPage'))
const PremiumMapPage = lazy(() => import('@/pages/PremiumMapPage'))
const MarketTrendPage = lazy(() => import('@/pages/MarketTrendPage'))
const CompetitorPage = lazy(() => import('@/pages/CompetitorPage'))

function SuspenseWrapper({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center text-muted-foreground">
          加载中...
        </div>
      }
    >
      {children}
    </Suspense>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation()
  if (!isAuthenticated()) {
    const redirect = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      // 总览
      { path: 'dashboard', element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper> },
      // 发现商品
      { path: 'bargain-radar', element: <SuspenseWrapper><BargainRadarPage /></SuspenseWrapper> },
      { path: 'premium-map', element: <SuspenseWrapper><PremiumMapPage /></SuspenseWrapper> },
      { path: 'results', element: <SuspenseWrapper><ResultsPage /></SuspenseWrapper> },
      // 价格管理
      { path: 'price-book', element: <SuspenseWrapper><PriceBookPage /></SuspenseWrapper> },
      { path: 'market-trend', element: <SuspenseWrapper><MarketTrendPage /></SuspenseWrapper> },
      { path: 'competitor', element: <SuspenseWrapper><CompetitorPage /></SuspenseWrapper> },
      // 交易管理
      { path: 'purchases', element: <SuspenseWrapper><PurchasesPage /></SuspenseWrapper> },
      { path: 'inventory', element: <SuspenseWrapper><InventoryPage /></SuspenseWrapper> },
      { path: 'profit', element: <SuspenseWrapper><ProfitPage /></SuspenseWrapper> },
      // 团队
      { path: 'team', element: <SuspenseWrapper><TeamPage /></SuspenseWrapper> },
      // 系统
      { path: 'tasks', element: <SuspenseWrapper><TasksPage /></SuspenseWrapper> },
      { path: 'accounts', element: <SuspenseWrapper><AccountsPage /></SuspenseWrapper> },
      { path: 'favorites', element: <SuspenseWrapper><FavoritesPage /></SuspenseWrapper> },
      { path: 'alerts', element: <SuspenseWrapper><AlertsPage /></SuspenseWrapper> },
      { path: 'logs', element: <SuspenseWrapper><LogsPage /></SuspenseWrapper> },
      { path: 'settings', element: <SuspenseWrapper><SettingsPage /></SuspenseWrapper> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
