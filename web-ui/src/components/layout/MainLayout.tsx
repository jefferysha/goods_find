import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar/Sidebar'
import Header from './Header/Header'
import { Toaster } from '@/components/ui/toaster'
import LiveItemToast from '@/components/realtime/LiveItemToast'

export default function MainLayout() {
  return (
    <div className="flex h-screen w-full bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <Toaster />
      <LiveItemToast />
    </div>
  )
}
