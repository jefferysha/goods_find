import { useLocation } from 'react-router-dom'
import HeaderUserMenu from './HeaderUserMenu'

const pageTitles: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/tasks': '任务管理',
  '/accounts': '账号管理',
  '/results': '结果查看',
  '/favorites': '收藏对比',
  '/alerts': '智能提醒',
  '/logs': '运行日志',
  '/settings': '系统设置',
}

export default function Header() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || '闲鱼智能监控'

  return (
    <header className="flex h-16 items-center justify-between border-b border-border/60 bg-white px-6">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <HeaderUserMenu />
    </header>
  )
}
