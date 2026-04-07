import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import {
  LayoutDashboard, Building2, Users, Tag,
  MapPin, DollarSign, Settings, ShieldCheck, FolderOpen, Bell,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useState, useEffect } from 'react'

const NAV = [
  { label: 'Boshqaruv paneli',    path: '/admin/dashboard',  icon: <LayoutDashboard size={17} />, section: 'BOSHQARUV' },
  { label: 'Klublar',             path: '/admin/clubs',      icon: <Building2 size={17} />,       section: 'BOSHQARUV' },
  { label: 'Agentlar',            path: '/admin/agents',     icon: <Users size={17} />,            section: 'BOSHQARUV' },
  { label: 'Tariflar',            path: '/admin/tariffs',    icon: <Tag size={17} />,              section: 'BOSHQARUV' },
  { label: 'Viloyat va tumanlar', path: '/admin/regions',    icon: <MapPin size={17} />,           section: 'BOSHQARUV' },
  { label: 'Rollar',              path: '/admin/roles',      icon: <ShieldCheck size={17} />,      section: 'KONFIGURATSIYA' },
  { label: 'Valyuta',             path: '/admin/currencies', icon: <DollarSign size={17} />,       section: 'KONFIGURATSIYA' },
  { label: 'Kategoriyalar',       path: '/admin/categories', icon: <FolderOpen size={17} />,       section: 'KONFIGURATSIYA' },
  { label: 'Sozlamalar',          path: '/admin/settings',   icon: <Settings size={17} />,         section: 'KONFIGURATSIYA' },
]

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/admin/dashboard':  { title: 'Boshqaruv paneli',    subtitle: 'Tizim holati va umumiy ko\'rsatkichlar' },
  '/admin/clubs':      { title: 'Klublar',              subtitle: 'Barcha ro\'yxatdan o\'tgan klublarni boshqarish' },
  '/admin/agents':     { title: 'Agentlar',             subtitle: 'Tizim agentlarini boshqarish' },
  '/admin/tariffs':    { title: 'Tariflar',             subtitle: 'Obuna rejalari va narxlarini sozlash' },
  '/admin/regions':    { title: 'Viloyat va tumanlar',  subtitle: 'Geografik ma\'lumotlarni boshqarish' },
  '/admin/roles':      { title: 'Rollar va ruxsatlar',  subtitle: 'Foydalanuvchi rollari va huquqlarini sozlash' },
  '/admin/currencies': { title: 'Valyuta boshqaruvi',   subtitle: 'Valyuta kurslari va sozlamalari' },
  '/admin/categories': { title: 'Kategoriyalar',        subtitle: 'Mahsulot va xizmat kategoriyalarini boshqarish' },
  '/admin/settings':   { title: 'Sozlamalar',           subtitle: 'Tizim sozlamalari va konfiguratsiyasi' },
}

function ClockDisplay() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const hh = time.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Tashkent' })
  return (
    <div className="text-right shrink-0">
      <p className="font-mono font-bold text-sm leading-tight" style={{ color: '#00ff88' }}>{hh}</p>
      <p className="text-gray-600 text-xs uppercase tracking-wider">TOSHKENT VAQTI</p>
    </div>
  )
}

export default function AdminLayout() {
  const { profile } = useAuthStore()
  const location = useLocation()
  const base = '/' + location.pathname.split('/').slice(1, 3).join('/')
  const meta = PAGE_META[base] ?? { title: 'Admin Panel', subtitle: '' }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#030712' }}>
      <Sidebar navItems={NAV} brand="Kivo Admin" brandSub="SUPER ADMIN PANEL" />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-gray-800 flex items-center px-5 shrink-0 gap-4" style={{ background: 'rgba(13,13,13,0.9)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">{meta.title}</p>
            {meta.subtitle && <p className="text-xs text-gray-500 truncate">{meta.subtitle}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700">
              <div className="w-6 h-6 rounded-full bg-[#00ff88]/20 flex items-center justify-center">
                <ShieldCheck size={12} className="text-[#00ff88]" />
              </div>
              <div className="text-right">
                <p className="text-white text-xs font-medium leading-tight">{profile?.full_name ?? 'Super Admin'}</p>
                <p className="text-[#00ff88] text-[10px] leading-tight">Super Admin</p>
              </div>
            </div>
            <ClockDisplay />
            <button className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <Bell size={17} />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
