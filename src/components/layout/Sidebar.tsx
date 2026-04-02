import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { initials } from '@/lib/utils'
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
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

  return (
    <aside
      className={cn(
        'flex flex-col bg-gray-900 border-r border-gray-800 transition-all duration-300 shrink-0',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      {/* Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {sidebarOpen && (
          <div className="min-w-0">
            <p className="font-bold text-white truncate">{brand}</p>
            {brandSub && <p className="text-xs text-gray-400 truncate">{brandSub}</p>}
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )
            }
            title={!sidebarOpen ? item.label : undefined}
          >
            <span className="shrink-0">{item.icon}</span>
            {sidebarOpen && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-gray-800 p-3">
        <div className={cn('flex items-center gap-3', !sidebarOpen && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initials(profile?.full_name ?? 'U')}
          </div>
          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white font-medium truncate">{profile?.full_name}</p>
              <p className="text-xs text-gray-400 truncate capitalize">{profile?.role?.replace('_', ' ')}</p>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={logout}
              title="Chiqish"
              className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
