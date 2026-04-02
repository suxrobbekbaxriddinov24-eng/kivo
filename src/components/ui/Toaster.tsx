import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const ICONS = {
  success: <CheckCircle size={18} className="text-green-400" />,
  error:   <XCircle size={18} className="text-red-400" />,
  warning: <AlertTriangle size={18} className="text-yellow-400" />,
  info:    <Info size={18} className="text-blue-400" />,
}

const BORDERS = {
  success: 'border-l-green-500',
  error:   'border-l-red-500',
  warning: 'border-l-yellow-500',
  info:    'border-l-blue-500',
}

export default function Toaster() {
  const { toasts, removeToast } = useUIStore()
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto bg-gray-900 border border-gray-700 border-l-4 rounded-lg px-4 py-3 flex items-start gap-3 shadow-2xl animate-in slide-in-from-right-4',
            BORDERS[t.type]
          )}
        >
          {ICONS[t.type]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">{t.title}</p>
            {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
          </div>
          <button onClick={() => removeToast(t.id)} className="text-gray-500 hover:text-gray-300 shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
