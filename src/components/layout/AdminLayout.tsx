import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import {
  LayoutDashboard, Building2, Users, Tag,
  MapPin, DollarSign, Settings, ShieldCheck, FolderOpen,
} from 'lucide-react'

const NAV = [
  // BOSHQARUV section
  { label: 'Boshqaruv paneli', path: '/admin/dashboard', icon: <LayoutDashboard size={17} />, section: 'BOSHQARUV' },
  { label: 'Klublar',          path: '/admin/clubs',     icon: <Building2 size={17} />,       section: 'BOSHQARUV' },
  { label: 'Viloyat va tumanlar', path: '/admin/regions', icon: <MapPin size={17} />,          section: 'BOSHQARUV' },
  { label: 'Tariflar',         path: '/admin/tariffs',   icon: <Tag size={17} />,              section: 'BOSHQARUV' },
  { label: 'Agentlar',         path: '/admin/agents',    icon: <Users size={17} />,            section: 'BOSHQARUV' },
  // KONFIGURATSIYA section
  { label: 'Rollar va ruxsatlar', path: '/admin/roles',  icon: <ShieldCheck size={17} />,      section: 'KONFIGURATSIYA' },
  { label: 'Valyuta',          path: '/admin/currencies',icon: <DollarSign size={17} />,       section: 'KONFIGURATSIYA' },
  { label: 'Kategoriyalar',    path: '/admin/categories',icon: <FolderOpen size={17} />,       section: 'KONFIGURATSIYA' },
  { label: 'Sozlamalar',       path: '/admin/settings',  icon: <Settings size={17} />,         section: 'KONFIGURATSIYA' },
]

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard':  'Boshqaruv paneli',
  '/admin/clubs':      'Klublar',
  '/admin/agents':     'Agentlar',
  '/admin/tariffs':    'Tariflar',
  '/admin/regions':    'Viloyat va tumanlar',
  '/admin/currencies': 'Valyuta boshqaruvi',
  '/admin/roles':      'Rollar va ruxsatlar',
  '/admin/categories': 'Kategoriyalar',
  '/admin/settings':   'Sozlamalar',
}

export default function AdminLayout() {
  const location = useLocation()
  const base = '/' + location.pathname.split('/').slice(1, 3).join('/')
  const title = PAGE_TITLES[base] ?? 'Admin Panel'

  return (
    <div className="flex h-screen bg-[#030712] overflow-hidden">
      <Sidebar navItems={NAV} brand="Kivo Admin" brandSub="SUPER ADMIN PANEL" />
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-14 bg-gray-900/80 border-b border-gray-800 flex items-center px-6 shrink-0 backdrop-blur">
          <h1 className="text-white font-semibold">{title}</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
