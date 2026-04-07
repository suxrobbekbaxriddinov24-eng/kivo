import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { salesService } from '@/services/sales.service'
import { customersService } from '@/services/customers.service'
import StatCard from '@/components/ui/StatCard'
import { formatCurrency, daysUntil } from '@/lib/utils'
import { Users, TrendingUp, CalendarCheck, ShoppingBag, AlertTriangle, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

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

  const { data: todayVisits = [] } = useQuery({
    queryKey: ['today_visits', clubId],
    queryFn: () => salesService.todayVisits(clubId),
    enabled: !!clubId,
    refetchInterval: 30_000,
  })

  const { data: revenueByType } = useQuery({
    queryKey: ['revenue_by_type', clubId],
    queryFn: () => salesService.todayRevenueByType(clubId),
    enabled: !!clubId,
    refetchInterval: 60_000,
  })

  // Expiring in ≤3 days
  const expiring = customers.filter((c) => {
    const days = daysUntil(c.active_subscription?.expires_at)
    return days !== null && days >= 0 && days <= 3
  })

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Foydalanuvchi'

  const pieData = [
    { name: 'Obunalar', value: revenueByType?.subscriptions ?? 0, color: '#00ff88' },
    { name: 'Bar savdo', value: revenueByType?.bar ?? 0, color: '#3b82f6' },
  ].filter(d => d.value > 0)

  const totalRevenue = (revenueByType?.subscriptions ?? 0) + (revenueByType?.bar ?? 0)

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-white">Xush kelibsiz, {firstName}!</h1>
        <p className="text-sm text-gray-500 mt-0.5">Bugungi yangiliklar bilan tanishing.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          color="brand"
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

      {/* Two panels: Expiring + Live activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Muddati tugayotganlar */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Muddati tugayotganlar (&lt;3 kun)</h2>
            <Link to="/customers" className="text-xs text-[#00ff88] font-semibold hover:underline tracking-wide">
              HAMMASINI KO'RISH
            </Link>
          </div>
          {expiring.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
                <CalendarCheck size={28} className="text-green-400" />
              </div>
              <p className="text-gray-400 text-sm">Yaqin kunlarda tugaydigan abonementlar yo'q</p>
            </div>
          ) : (
            <div className="space-y-2 flex-1">
              {expiring.slice(0, 6).map((c) => {
                const days = daysUntil(c.active_subscription?.expires_at)
                const urgency = days === 0 ? 'text-red-400 bg-red-500/10 border-red-500/20'
                  : days === 1 ? 'text-orange-400 bg-orange-500/10 border-orange-500/20'
                  : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                return (
                  <Link
                    key={c.id}
                    to={`/customers/${c.id}`}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#00ff88]/10 flex items-center justify-center text-[#00ff88] font-bold text-xs shrink-0">
                        {c.first_name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm text-white font-medium leading-tight">{c.first_name} {c.last_name}</p>
                        <p className="text-xs text-gray-500">{c.active_subscription?.plan_name ?? '—'}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${urgency}`}>
                      {days === 0 ? 'Bugun!' : `${days} kun`}
                    </span>
                  </Link>
                )
              })}
              {expiring.length > 6 && (
                <p className="text-xs text-gray-500 text-center pt-1">+{expiring.length - 6} ta ko'proq</p>
              )}
            </div>
          )}
        </div>

        {/* Jonli faollik */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Jonli faollik</h2>
            <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Jonli
            </span>
          </div>
          {todayVisits.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <UserCheck size={28} className="text-blue-400" />
              </div>
              <p className="text-gray-400 text-sm">Bugun hali hech kim kelmadi!</p>
            </div>
          ) : (
            <div className="space-y-1.5 flex-1 overflow-y-auto max-h-60">
              {todayVisits.slice(0, 10).map((v, i) => {
                const customer = customers.find(c => c.id === v.customer_id)
                const time = new Date(v.checked_in_at).toLocaleTimeString('uz-UZ', {
                  hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tashkent'
                })
                return (
                  <div key={v.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-800/50">
                    <div className="w-7 h-7 rounded-full bg-[#00ff88]/10 flex items-center justify-center text-[#00ff88] text-xs font-bold shrink-0">
                      {customer?.first_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <p className="text-sm text-white flex-1 truncate">
                      {customer ? `${customer.first_name} ${customer.last_name ?? ''}` : 'Noma\'lum'}
                    </p>
                    <span className="text-xs text-gray-500 shrink-0">{time}</span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-500">Bugungi tashriflar</p>
            <span className="text-[#00ff88] font-bold text-lg">{todayVisits.length}</span>
          </div>
        </div>
      </div>

      {/* Tushum taqsimoti */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-white font-semibold mb-4">Tushum taqsimoti (Bugun)</h2>
        {totalRevenue === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
              <TrendingUp size={28} className="text-gray-600" />
            </div>
            <p className="text-gray-400 text-sm">Bugun hali daromad yo'q</p>
          </div>
        ) : (
          <div className="flex items-center gap-8">
            <div className="w-40 h-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={64} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9ca3af' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-3">
              {pieData.map((d) => (
                <div key={d.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-gray-300">{d.name}</span>
                    </div>
                    <span className="text-white font-semibold">{formatCurrency(d.value)}</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.round((d.value / totalRevenue) * 100)}%`, background: d.color }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{Math.round((d.value / totalRevenue) * 100)}%</p>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                <span className="text-sm text-gray-400">Jami</span>
                <span className="text-white font-bold">{formatCurrency(totalRevenue)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expiring alert banner */}
      {expiring.length > 0 && (
        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-300 flex-1">
            <span className="font-semibold">{expiring.length} ta mijoz</span>ning obunasi 3 kun ichida tugaydi.
          </p>
          <Link to="/customers" className="text-xs text-yellow-400 font-semibold hover:underline shrink-0">Ko'rish</Link>
        </div>
      )}
    </div>
  )
}
