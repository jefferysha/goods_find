import {
  LayoutDashboard,
  Radar,
  Map,
  Search,
  GitCompare,
  Layers,
  BookOpen,
  TrendingUp,
  Eye,
  FolderTree,
  ShoppingCart,
  Package,
  DollarSign,
  UsersRound,
  ListTodo,
  Users,
  Bell,
  FileText,
  Settings,
} from 'lucide-react'
import SidebarNavItem from './SidebarNavItem'

interface NavGroup {
  label: string
  items: { icon: typeof LayoutDashboard; label: string; to: string }[]
}

const navGroups: NavGroup[] = [
  {
    label: '总览',
    items: [
      { icon: LayoutDashboard, label: '仪表盘', to: '/dashboard' },
    ],
  },
  {
    label: '发现商品',
    items: [
      { icon: Radar, label: '捡漏雷达', to: '/bargain-radar' },
      { icon: Map, label: '溢价地图', to: '/premium-map' },
      { icon: Search, label: '全部结果', to: '/results' },
      { icon: GitCompare, label: '跨平台比价', to: '/cross-platform' },
      { icon: Layers, label: '商品比价', to: '/product-match' },
    ],
  },
  {
    label: '价格管理',
    items: [
      { icon: FolderTree, label: '品类管理', to: '/categories' },
      { icon: BookOpen, label: '价格本', to: '/price-book' },
      { icon: TrendingUp, label: '行情走势', to: '/market-trend' },
      { icon: Eye, label: '竞品观察', to: '/competitor' },
    ],
  },
  {
    label: '交易管理',
    items: [
      { icon: ShoppingCart, label: '采购清单', to: '/purchases' },
      { icon: Package, label: '库存台账', to: '/inventory' },
      { icon: DollarSign, label: '利润核算', to: '/profit' },
    ],
  },
  {
    label: '团队',
    items: [
      { icon: UsersRound, label: '团队工作台', to: '/team' },
    ],
  },
  {
    label: '系统',
    items: [
      { icon: ListTodo, label: '任务管理', to: '/tasks' },
      { icon: Users, label: '账号管理', to: '/accounts' },
      { icon: Bell, label: '智能提醒', to: '/alerts' },
      { icon: FileText, label: '运行日志', to: '/logs' },
      { icon: Settings, label: '系统设置', to: '/settings' },
    ],
  },
]

export default function SidebarNav() {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {navGroups.map((group, idx) => (
        <div key={group.label} className={idx > 0 ? 'mt-6' : ''}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <SidebarNavItem key={item.to} {...item} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}
