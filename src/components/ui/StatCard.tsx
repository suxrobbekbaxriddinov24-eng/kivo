import { cn } from '@/lib/utils'

interface Props {
  title: string
  value: string | number
  sub?: string
  icon?: React.ReactNode
  color?: 'brand' | 'indigo' | 'green' | 'yellow' | 'red' | 'blue'
  trend?: { value: number; label: string }
}

const colors = {
  brand:  'bg-[#00ff88]/10 text-[#00ff88]',
  indigo: 'bg-[#00ff88]/10 text-[#00ff88]',
  green:  'bg-green-500/10 text-green-400',
  yellow: 'bg-yellow-500/10 text-yellow-400',
  red:    'bg-red-500/10 text-red-400',
  blue:   'bg-blue-500/10 text-blue-400',
}

export default function StatCard({ title, value, sub, icon, color = 'brand', trend }: Props) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-3 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <p className="text-sm text-gray-400">{title}</p>
        {icon && (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', colors[color])}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {trend && (
        <div className={cn('text-xs font-medium flex items-center gap-1', trend.value >= 0 ? 'text-green-400' : 'text-red-400')}>
          <span>{trend.value >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(trend.value)}% {trend.label}</span>
        </div>
      )}
    </div>
  )
}
