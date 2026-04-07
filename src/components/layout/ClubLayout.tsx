import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import {
  LayoutDashboard, Users, ShoppingCart, Package,
  BarChart2, BookOpen, Settings, Bell, X, Check, AlertTriangle, ShieldCheck,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { clubsService } from '@/services/clubs.service'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { PlatformTariff } from '@/types/database'
import { formatCurrency } from '@/lib/utils'

const dbAdmin = (supabaseAdmin ?? supabase) as any

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

function daysUntilDate(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function NotificationBell({ clubId }: { clubId: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: () => clubsService.get(clubId),
    enabled: !!clubId,
    staleTime: 5 * 60_000,
  })

  const { data: tariff } = useQuery<PlatformTariff | null>({
    queryKey: ['platform_tariff', club?.tariff_id],
    queryFn: async () => {
      if (!club?.tariff_id) return null
      const { data } = await (supabase as any).from('platform_tariffs').select('*').eq('id', club.tariff_id).single()
      return data ?? null
    },
    enabled: !!club?.tariff_id,
    staleTime: 10 * 60_000,
  })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const daysLeft = daysUntilDate(club?.tariff_expires_at ?? null)
  const isExpired  = daysLeft !== null && daysLeft < 0
  const isWarning  = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7
  const badgeCount = (isExpired || isWarning) ? 1 : 0

  const statusColor = isExpired ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : isWarning ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    : 'text-green-400 bg-green-500/10 border-green-500/20'

  const statusLabel = isExpired ? 'Muddati tugagan'
    : isWarning ? `${daysLeft} kun qoldi`
    : daysLeft !== null ? `${daysLeft} kun qoldi`
    : 'Faol'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Bell size={17} />
        {badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-[#00ff88]" />
              <span className="text-white font-semibold text-sm">Bildirishnomalar</span>
              {badgeCount > 0 && (
                <span className="text-xs bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {badgeCount}
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
            {/* Tariff card */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#00ff88] shrink-0" />
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {tariff?.name ?? (club?.tariff_id ? 'Tarif yuklanmoqda...' : 'Tarif belgilanmagan')}
                    </p>
                    <p className="text-xs text-gray-500">Platforma tarifi</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>

              {tariff && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Narx</span>
                    <span className="text-white">{formatCurrency(tariff.price)} / {tariff.period_days} kun</span>
                  </div>
                  {club?.tariff_expires_at && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Tugash sanasi</span>
                      <span className="text-white">
                        {new Date(club.tariff_expires_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Expiry progress bar */}
              {tariff && club?.tariff_expires_at && daysLeft !== null && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Muddat</span>
                    <span>{Math.max(0, daysLeft)} / {tariff.period_days} kun</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, (Math.max(0, daysLeft) / tariff.period_days) * 100))}%`,
                        background: isExpired ? '#ef4444' : isWarning ? '#eab308' : '#00ff88',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Features */}
              {tariff && tariff.features.length > 0 && (
                <div className="pt-1 border-t border-gray-700">
                  <p className="text-xs text-gray-500 mb-1.5">Kiruvchi xizmatlar</p>
                  <div className="grid grid-cols-2 gap-1">
                    {tariff.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-gray-300">
                        <Check size={10} className="text-[#00ff88] shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Warning message */}
            {isExpired && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">
                  Platformadan foydalanish muddati tugagan. Administrator bilan bog'laning.
                </p>
              </div>
            )}
            {isWarning && !isExpired && (
              <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-300">
                  Tarifingiz {daysLeft} kun ichida tugaydi. Uzluksiz xizmat uchun yangilang.
                </p>
              </div>
            )}

            {/* No tariff */}
            {!club?.tariff_id && (
              <div className="text-center py-4 text-gray-500 text-xs">
                Hozircha bildirishnoma yo'q
              </div>
            )}
          </div>

          {/* Footer quick links */}
          <div className="border-t border-gray-800 px-3 py-2 flex gap-2">
            <a href="/customers" className="flex-1 text-center text-xs py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors">
              Mijozlar
            </a>
            <a href="/inventory" className="flex-1 text-center text-xs py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors">
              Ombor
            </a>
          </div>
        </div>
      )}
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
  const clubId = profile?.club_id ?? ''

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
            {clubId && <NotificationBell clubId={clubId} />}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
