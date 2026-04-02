import { Bell, Menu } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'

interface Props {
  title: string
}

export default function Topbar({ title }: Props) {
  const { setSidebarOpen, sidebarOpen } = useUIStore()

  return (
    <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center px-6 gap-4 shrink-0">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden p-1.5 text-gray-400 hover:text-white"
      >
        <Menu size={20} />
      </button>
      <h1 className="text-white font-semibold text-lg flex-1">{title}</h1>
      <button className="relative p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
        <Bell size={20} />
      </button>
    </header>
  )
}
