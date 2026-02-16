import { createBrowserRouter, Navigate, useLocation, useRouteError } from 'react-router-dom'
import { lazy, Suspense, type ReactNode, type ComponentType } from 'react'
import LoginPage from '@/pages/LoginPage'
import MainLayout from '@/components/layout/MainLayout'
import { isAuthenticated } from '@/api/http'

/**
 * 带自动重试的 lazy import —— 部署新版后旧 hash 文件 404 时自动刷新页面
 */
function lazyWithRetry(factory: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(() =>
    factory().catch((err) => {
      // 动态导入失败（通常是部署新版后旧 chunk 404）
      // 用 sessionStorage 标记防止无限刷新
      const key = 'lazy_reload_ts'
      const lastReload = Number(sessionStorage.getItem(key) || '0')
      const now = Date.now()
      if (now - lastReload > 10_000) {
        // 距上次刷新 >10s，执行一次硬刷新
        sessionStorage.setItem(key, String(now))
        window.location.reload()
      }
      throw err // 10s 内已刷新过，抛出错误走 errorElement
    })
  )
}

// Lazy-loaded pages
const DashboardPage = lazyWithRetry(() => import('@/pages/DashboardPage'))
const TasksPage = lazyWithRetry(() => import('@/pages/TasksPage'))
const AccountsPage = lazyWithRetry(() => import('@/pages/AccountsPage'))
const ResultsPage = lazyWithRetry(() => import('@/pages/ResultsPage'))
const FavoritesPage = lazyWithRetry(() => import('@/pages/FavoritesPage'))
const LogsPage = lazyWithRetry(() => import('@/pages/LogsPage'))
const SettingsPage = lazyWithRetry(() => import('@/pages/SettingsPage'))
const AlertsPage = lazyWithRetry(() => import('@/pages/AlertsPage'))
const BargainRadarPage = lazyWithRetry(() => import('@/pages/BargainRadarPage'))
const PriceBookPage = lazyWithRetry(() => import('@/pages/PriceBookPage'))
const PurchasesPage = lazyWithRetry(() => import('@/pages/PurchasesPage'))
const InventoryPage = lazyWithRetry(() => import('@/pages/InventoryPage'))
const ProfitPage = lazyWithRetry(() => import('@/pages/ProfitPage'))
const TeamPage = lazyWithRetry(() => import('@/pages/TeamPage'))
const PremiumMapPage = lazyWithRetry(() => import('@/pages/PremiumMapPage'))
const MarketTrendPage = lazyWithRetry(() => import('@/pages/MarketTrendPage'))
const CompetitorPage = lazyWithRetry(() => import('@/pages/CompetitorPage'))
const CrossPlatformPage = lazyWithRetry(() => import('@/pages/CrossPlatformPage'))
const CategoryPage = lazyWithRetry(() => import('@/pages/CategoryPage'))
const ProductMatchPage = lazyWithRetry(() => import('@/pages/ProductMatchPage'))

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

/**
 * 路由级错误兜底 —— 当 lazy import 或渲染出错时显示友好提示
 */
function RouteErrorFallback() {
  const error = useRouteError() as Error | undefined
  const isChunkError =
    error?.message?.includes('dynamically imported module') ||
    error?.message?.includes('Failed to fetch') ||
    error?.message?.includes('Loading chunk')

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="text-5xl">😵</div>
      <h2 className="text-xl font-semibold">
        {isChunkError ? '检测到新版本' : '页面加载出错'}
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {isChunkError
          ? '应用已更新，需要刷新页面加载最新版本。'
          : `发生了意外错误：${error?.message || '未知错误'}`}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        刷新页面
      </button>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    errorElement: <RouteErrorFallback />,
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
      { path: 'cross-platform', element: <SuspenseWrapper><CrossPlatformPage /></SuspenseWrapper> },
      { path: 'product-match', element: <SuspenseWrapper><ProductMatchPage /></SuspenseWrapper> },
      // 价格管理
      { path: 'categories', element: <SuspenseWrapper><CategoryPage /></SuspenseWrapper> },
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
