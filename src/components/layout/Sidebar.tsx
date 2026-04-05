import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { initials } from '@/lib/utils'
import { LogOut, ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
  section?: string
  directorOnly?: boolean
}

interface Props {
  navItems: NavItem[]
  brand: string
  brandSub?: string
}

export default function Sidebar({ navItems, brand, brandSub }: Props) {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { profile, logout } = useAuthStore()

  // Group nav items by section
  const sections: { label: string | null; items: NavItem[] }[] = []
  const seen = new Map<string | undefined, NavItem[]>()
  for (const item of navItems) {
    const key = item.section ?? '__none__'
    if (!seen.has(key)) seen.set(key, [])
    seen.get(key)!.push(item)
  }
  seen.forEach((items, key) => {
    sections.push({ label: key === '__none__' ? null : key ?? null, items })
  })

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-gray-800 transition-all duration-300 shrink-0',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
      style={{ background: '#0d0d0d' }}
    >
      {/* Brand */}
      <div className="flex items-center justify-between h-16 px-3 border-b border-gray-800">
        {sidebarOpen && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #00ff88 0%, #00cc6d 100%)' }}
            >
              <Dumbbell size={15} className="text-gray-950" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate leading-tight">{brand}</p>
              {brandSub && (
                <p className="text-xs truncate font-semibold tracking-wider" style={{ color: '#00ff88', fontSize: '9px' }}>
                  {brandSub}
                </p>
              )}
            </div>
          </div>
        )}
        {!sidebarOpen && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto"
            style={{ background: 'linear-gradient(135deg, #00ff88 0%, #00cc6d 100%)' }}
          >
            <Dumbbell size={15} className="text-gray-950" />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className={cn(
            'p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors shrink-0',
            !sidebarOpen && 'hidden'
          )}
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4">
        {sections.map((section, si) => (
          <div key={si}>
            {section.label && sidebarOpen && (
              <p className="text-gray-600 text-xs font-semibold uppercase tracking-wider px-2 mb-1">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium',
                      isActive
                        ? 'text-[#00ff88] bg-[#00ff88]/10 border-l-2 border-[#00ff88]'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/60 border-l-2 border-transparent'
                    )
                  }
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-gray-800 p-3">
        <div className={cn('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'rgba(0,255,136,0.15)', color: '#00ff88' }}
          >
            {initials(profile?.full_name ?? 'U')}
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white font-medium truncate">{profile?.full_name}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{profile?.role?.replace('_', ' ')}</p>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={logout}
              title="Chiqish"
              className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="mt-2 w-full flex justify-center p-1.5 text-gray-600 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </aside>
  )
}
