import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import SidebarNav from './SidebarNav'
import { useSidebar } from '@/hooks/shared/useSidebar'
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet'

/** 侧边栏内部内容（桌面端和移动端共享） */
function SidebarContent() {
  return (
    <>
      {/* Logo / Brand */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border/60 px-5 shrink-0">
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
    </>
  )
}

export default function Sidebar() {
  const { isOpen, close } = useSidebar()
  const location = useLocation()

  // 路由变化时自动关闭移动端抽屉
  useEffect(() => {
    close()
  }, [location.pathname, close])

  return (
    <>
      {/* 桌面端：固定侧边栏 (md 及以上显示) */}
      <aside className="hidden md:flex h-full w-64 flex-col border-r border-border/60 bg-white">
        <SidebarContent />
      </aside>

      {/* 移动端：Sheet 抽屉 (md 以下) */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
        <SheetContent side="left" className="w-64 p-0 md:hidden">
          <SheetTitle className="sr-only">导航菜单</SheetTitle>
          <div className="flex h-full flex-col bg-white">
            <SidebarContent />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
