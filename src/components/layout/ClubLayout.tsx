import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import {
  LayoutDashboard, Users, ShoppingCart, Package,
  BarChart2, BookOpen, Settings, Bell,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useState, useEffect } from 'react'

const NAV = [
  { label: 'Boshqaruv paneli', path: '/dashboard',  icon: <LayoutDashboard size={17} /> },
  { label: 'Mijozlar',         path: '/customers',   icon: <Users size={17} /> },
  { label: 'Xizmatlar va Tariflar', path: '/plans',  icon: <BookOpen size={17} />, directorOnly: true },
  { label: 'Savdo (Bar)',      path: '/pos',         icon: <ShoppingCart size={17} /> },
  { label: 'Ombor (Mahsulotlar)', path: '/inventory',icon: <Package size={17} />, directorOnly: true },
  { label: 'Moliya',           path: '/finance',     icon: <BarChart2 size={17} />, directorOnly: true },
  { label: 'Sozlamalar',       path: '/settings',    icon: <Settings size={17} />, directorOnly: true },
]

const PAGE_META: Record<string, { title: string; subtitle: string; action?: React.ReactNode }> = {
  '/dashboard':  { title: 'Tizim holati',          subtitle: 'Bugungi yangiliklar va hisobotlar' },
  '/customers':  { title: "Mijozlar Ro'yxati",     subtitle: "Barcha ro'yxatdan o'tgan mijozlarni boshqarish" },
  '/plans':      { title: 'Xizmatlar va Tariflar', subtitle: "Klubingiz taklif qiladigan barcha xizmat turlarini boshqaring" },
  '/pos':        { title: 'Savdo (Bar)',            subtitle: new Date().toLocaleDateString('uz-UZ', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) },
  '/inventory':  { title: 'Ombor (Mahsulotlar)',   subtitle: 'Barcha mahsulotlar va ombor zaxiralarini boshqarish' },
  '/finance':    { title: 'Moliya va Hisobotlar',  subtitle: 'Daromad, xarajat va moliyaviy ko\'rsatkichlar' },
  '/settings':   { title: 'Sozlamalar',            subtitle: 'Klub sozlamalari va konfiguratsiyasi' },
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

export default function ClubLayout() {
  const { profile } = useAuthStore()
  const location = useLocation()
  const isDirector = profile?.role === 'club_director'
  const navItems = NAV.filter((n) => !n.directorOnly || isDirector)

  const base = location.pathname
  const meta = PAGE_META[base] ?? { title: 'Kivo', subtitle: '' }

  const clubName = profile?.full_name ?? 'Kivo Club'
  const roleLabel = isDirector ? 'Rahbar' : 'Xodim'

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#030712' }}>
      <Sidebar navItems={navItems} brand={clubName} brandSub={roleLabel} />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 border-b border-gray-800 flex items-center px-5 shrink-0 gap-4" style={{ background: 'rgba(13,13,13,0.9)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">{meta.title}</p>
            {meta.subtitle && <p className="text-xs text-gray-500 truncate">{meta.subtitle}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {meta.action}
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
