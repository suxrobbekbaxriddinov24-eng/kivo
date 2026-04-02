import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import {
  LayoutDashboard, Building2, Users, Tag,
  MapPin, DollarSign, Settings,
} from 'lucide-react'

const NAV = [
  { label: 'Bosh sahifa', path: '/admin/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Klublar', path: '/admin/clubs', icon: <Building2 size={18} /> },
  { label: 'Agentlar', path: '/admin/agents', icon: <Users size={18} /> },
  { label: 'Tariflar', path: '/admin/tariffs', icon: <Tag size={18} /> },
  { label: 'Viloyatlar', path: '/admin/regions', icon: <MapPin size={18} /> },
  { label: 'Valyuta', path: '/admin/currencies', icon: <DollarSign size={18} /> },
  { label: 'Sozlamalar', path: '/admin/settings', icon: <Settings size={18} /> },
]

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Bosh sahifa',
  '/admin/clubs': 'Klublar',
  '/admin/agents': 'Agentlar',
  '/admin/tariffs': 'Tariflar',
  '/admin/regions': 'Viloyatlar',
  '/admin/currencies': 'Valyuta',
  '/admin/settings': 'Sozlamalar',
}

export default function AdminLayout() {
  const location = useLocation()
  const base = '/' + location.pathname.split('/').slice(1, 3).join('/')
  const title = PAGE_TITLES[base] ?? 'Admin Panel'

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar navItems={NAV} brand="Kivo Admin" brandSub="Super Admin Panel" />
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
