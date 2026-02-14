import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import HeaderUserMenu from './HeaderUserMenu'
import { useSidebar } from '@/hooks/shared/useSidebar'
import { Button } from '@/components/ui/button'

const pageTitles: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/tasks': '任务管理',
  '/accounts': '账号管理',
  '/results': '结果查看',
  '/favorites': '收藏对比',
  '/alerts': '智能提醒',
  '/logs': '运行日志',
  '/settings': '系统设置',
  '/bargain-radar': '捡漏雷达',
  '/premium-map': '溢价地图',
  '/price-book': '价格本',
  '/market-trend': '行情走势',
  '/competitor': '竞品观察',
  '/purchases': '采购清单',
  '/inventory': '库存台账',
  '/profit': '利润核算',
  '/team': '团队工作台',
}

export default function Header() {
  const location = useLocation()
  const title = pageTitles[location.pathname] || '二手聚合监控'
  const { toggle } = useSidebar()

  return (
    <header className="flex h-14 md:h-16 items-center justify-between border-b border-border/60 bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* 移动端汉堡菜单按钮 */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden -ml-1 shrink-0"
          onClick={toggle}
          aria-label="打开导航菜单"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <h1 className="text-base md:text-lg font-semibold text-foreground truncate">{title}</h1>
      </div>
      <HeaderUserMenu />
    </header>
  )
}
