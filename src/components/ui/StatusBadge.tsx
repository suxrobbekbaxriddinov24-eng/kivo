import { cn } from '@/lib/utils'

interface Props {
  status: string
  size?: 'sm' | 'md'
}

const MAP: Record<string, { label: string; class: string }> = {
  active:    { label: 'Faol',             class: 'bg-green-500/15 text-green-400 border-green-500/20' },
  inactive:  { label: 'Nofaol',           class: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
  suspended: { label: 'Bloklangan',       class: 'bg-red-500/15 text-red-400 border-red-500/20' },
  expired:   { label: 'Muddati tugagan',  class: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  frozen:    { label: 'Muzlatilgan',      class: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  cancelled: { label: 'Bekor qilingan',   class: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
  ok:        { label: 'Yetarli',          class: 'bg-green-500/15 text-green-400 border-green-500/20' },
  low:       { label: "Kam qoldi",        class: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  out:       { label: "Tugagan",          class: 'bg-red-500/15 text-red-400 border-red-500/20' },
}

const sizes = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-xs px-2.5 py-1',
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const cfg = MAP[status] ?? { label: status, class: 'bg-gray-500/15 text-gray-400 border-gray-500/20' }
  return (
    <span className={cn('inline-flex items-center rounded-full border font-medium', cfg.class, sizes[size])}>
      {cfg.label}
    </span>
  )
}
