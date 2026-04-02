import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { salesService } from '@/services/sales.service'
import { customersService } from '@/services/customers.service'
import StatCard from '@/components/ui/StatCard'
import { formatCurrency, formatDateTime, daysUntil } from '@/lib/utils'
import { Users, TrendingUp, CalendarCheck, ShoppingBag, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusBadge from '@/components/ui/StatusBadge'

export default function ClubDashboardPage() {
  const { profile } = useAuthStore()
  const clubId = profile?.club_id!

  const { data: stats } = useQuery({
    queryKey: ['stats', clubId],
    queryFn: () => salesService.stats(clubId),
    enabled: !!clubId,
    refetchInterval: 60_000,
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', clubId],
    queryFn: () => customersService.listAll(clubId),
    enabled: !!clubId,
  })

  const expiring = customers.filter((c) => {
    const days = daysUntil(c.active_subscription?.expires_at)
    return days !== null && days >= 0 && days <= 7
  })

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Bugungi daromad"
          value={formatCurrency(stats?.todayRevenue ?? 0)}
          sub={`${stats?.todayCount ?? 0} ta tranzaksiya`}
          icon={<TrendingUp size={18} />}
          color="green"
        />
        <StatCard
          title="Oylik daromad"
          value={formatCurrency(stats?.monthRevenue ?? 0)}
          icon={<ShoppingBag size={18} />}
          color="indigo"
        />
        <StatCard
          title="Jami mijozlar"
          value={customers.length}
          icon={<Users size={18} />}
          color="blue"
        />
        <StatCard
          title="Faol obunalar"
          value={stats?.activeSubscriptions ?? 0}
          icon={<CalendarCheck size={18} />}
          color="yellow"
        />
      </div>

      {/* Expiring subscriptions */}
      {expiring.length > 0 && (
        <div className="bg-gray-900 border border-yellow-500/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-yellow-400" />
            <h2 className="text-white font-semibold">Obunasi tugayotgan mijozlar</h2>
            <span className="ml-auto text-xs text-yellow-400 bg-yellow-500/10 rounded-full px-2.5 py-0.5 border border-yellow-500/20">
              {expiring.length} ta
            </span>
          </div>
          <div className="space-y-2">
            {expiring.slice(0, 8).map((c) => {
              const days = daysUntil(c.active_subscription?.expires_at)
              return (
                <Link
                  key={c.id}
                  to={`/customers/${c.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                >
                  <div>
                    <p className="text-sm text-white font-medium">{c.first_name} {c.last_name}</p>
                    <p className="text-xs text-gray-400">{c.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${days === 0 ? 'text-red-400' : days !== null && days <= 3 ? 'text-orange-400' : 'text-yellow-400'}`}>
                      {days === 0 ? 'Bugun tugaydi' : `${days} kun qoldi`}
                    </p>
                    <p className="text-xs text-gray-400">{c.active_subscription?.plan_name}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent customers */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">So'nggi mijozlar</h2>
          <Link to="/customers" className="text-sm text-indigo-400 hover:text-indigo-300">Barchasi</Link>
        </div>
        <div className="space-y-2">
          {customers.slice(0, 6).map((c) => (
            <Link
              key={c.id}
              to={`/customers/${c.id}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/40 hover:bg-gray-800 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-300 font-bold text-sm shrink-0">
                {c.first_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{c.first_name} {c.last_name}</p>
                <p className="text-xs text-gray-400">{c.phone ?? '—'}</p>
              </div>
              <div className="text-right shrink-0">
                {c.active_subscription
                  ? <StatusBadge status="active" size="sm" />
                  : <StatusBadge status="inactive" size="sm" />}
                <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(c.created_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
