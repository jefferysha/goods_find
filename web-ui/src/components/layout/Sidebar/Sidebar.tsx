import SidebarNav from './SidebarNav'

export default function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-border/60 bg-white">
      {/* Logo / Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF6B4A] to-[#FF8F6B] text-sm font-bold text-white shadow-sm shadow-orange-200/50">
          淘
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight text-foreground leading-tight">
            二手聚合监控
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight">
            多平台智能比价
          </span>
        </div>
      </div>

      {/* Navigation */}
      <SidebarNav />
    </aside>
  )
}
