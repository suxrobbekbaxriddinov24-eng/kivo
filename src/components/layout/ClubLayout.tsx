import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import {
  LayoutDashboard, Users, ShoppingCart, Package,
  BarChart2, BookOpen, Settings,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const NAV = [
  { label: 'Bosh sahifa', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Mijozlar', path: '/customers', icon: <Users size={18} /> },
  { label: 'Savdo / Kassa', path: '/pos', icon: <ShoppingCart size={18} /> },
  { label: 'Mahsulotlar', path: '/inventory', icon: <Package size={18} />, directorOnly: true },
  { label: 'Moliya', path: '/finance', icon: <BarChart2 size={18} />, directorOnly: true },
  { label: 'Tariflar', path: '/plans', icon: <BookOpen size={18} />, directorOnly: true },
  { label: 'Sozlamalar', path: '/settings', icon: <Settings size={18} />, directorOnly: true },
]

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Bosh sahifa',
  '/customers': 'Mijozlar',
  '/pos': 'Savdo / Kassa',
  '/inventory': 'Mahsulotlar',
  '/finance': 'Moliya',
  '/plans': 'Tariflar',
  '/settings': 'Sozlamalar',
}

export default function ClubLayout() {
  const { profile } = useAuthStore()
  const location = useLocation()
  const isDirector = profile?.role === 'club_director'
  const navItems = NAV.filter((n) => !n.directorOnly || isDirector)
  const title = PAGE_TITLES[location.pathname] ?? 'Kivo'

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar navItems={navItems} brand="Kivo" brandSub={profile?.full_name} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center px-6 shrink-0">
          <h1 className="text-white font-semibold text-lg">{title}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
