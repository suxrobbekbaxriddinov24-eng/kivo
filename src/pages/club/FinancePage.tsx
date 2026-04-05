import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { salesService, type FinancePeriod } from '@/services/sales.service'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { PERIOD_OPTIONS, PAYMENT_METHODS, COLORS } from '@/lib/constants'
import StatCard from '@/components/ui/StatCard'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, ShoppingBag, Tag, Users } from 'lucide-react'
import { format } from 'date-fns'
import { uz } from 'date-fns/locale'

export default function FinancePage() {
  const { profile } = useAuthStore()
  const clubId = profile?.club_id!
  const [period, setPeriod] = useState<FinancePeriod>('month')

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales', clubId, period],
    queryFn: () => salesService.list(clubId, period),
    enabled: !!clubId,
  })

  const totalRevenue = sales.reduce((s, r) => s + r.amount, 0)
  const subRevenue = sales.filter((s) => s.type === 'subscription').reduce((s, r) => s + r.amount, 0)
  const barRevenue = sales.filter((s) => s.type === 'bar').reduce((s, r) => s + r.amount, 0)
  const profit = sales.reduce((s, r) => s + (r.amount - r.purchase_cost), 0)

  // Group by day for chart
  const byDay: Record<string, { sub: number; bar: number }> = {}
  for (const sale of sales) {
    const day = format(new Date(sale.created_at), 'dd MMM', { locale: uz })
    if (!byDay[day]) byDay[day] = { sub: 0, bar: 0 }
    if (sale.type === 'subscription') byDay[day].sub += sale.amount
    else byDay[day].bar += sale.amount
  }
  const chartData = Object.entries(byDay).map(([date, v]) => ({ date, ...v }))

  // Pie data
  const pieData = [
    { name: 'Abonement', value: subRevenue },
    { name: 'Bar / Kassa', value: barRevenue },
  ].filter((d) => d.value > 0)

  // Top customers
  const topCustomers: Record<string, { name: string; total: number }> = {}
  for (const sale of sales) {
    if (!sale.customer_id) continue
    const name = sale.customer
      ? `${sale.customer.first_name} ${sale.customer.last_name ?? ''}`
      : 'Noma\'lum'
    if (!topCustomers[sale.customer_id]) topCustomers[sale.customer_id] = { name, total: 0 }
    topCustomers[sale.customer_id].total += sale.amount
  }
  const topList = Object.values(topCustomers).sort((a, b) => b.total - a.total).slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex gap-2">
        {PERIOD_OPTIONS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value as FinancePeriod)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${period === p.value ? 'bg-[#00ff88] text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Jami daromad" value={formatCurrency(totalRevenue)} icon={<TrendingUp size={18} />} color="green" />
        <StatCard title="Foyda" value={formatCurrency(profit)} icon={<Tag size={18} />} color="brand" />
        <StatCard title="Abonement" value={formatCurrency(subRevenue)} sub={`${sales.filter(s => s.type === 'subscription').length} ta`} icon={<Users size={18} />} color="blue" />
        <StatCard title="Bar / Kassa" value={formatCurrency(barRevenue)} sub={`${sales.filter(s => s.type === 'bar').length} ta`} icon={<ShoppingBag size={18} />} color="yellow" />
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Area chart */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Daromad dinamikasi</h3>
          {chartData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-12">Ma'lumot yo'q</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gradSub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  labelStyle={{ color: '#e5e7eb' }}
                  formatter={(v: unknown) => [formatCurrency(v as number), '']}
                />
                <Area type="monotone" dataKey="sub" name="Abonement" stroke={COLORS.primary} fill="url(#gradSub)" strokeWidth={2} />
                <Area type="monotone" dataKey="bar" name="Bar" stroke={COLORS.success} fill="url(#gradBar)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col">
          <h3 className="text-white font-semibold mb-4">Daromad taqsimoti</h3>
          {pieData.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-12">Ma'lumot yo'q</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS.chart[i]} />)}
                </Pie>
                <Legend formatter={(v) => <span className="text-gray-300 text-sm">{v}</span>} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(v: unknown) => [formatCurrency(v as number), '']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top customers */}
      {topList.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Top mijozlar</h3>
          <div className="space-y-3">
            {topList.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 text-center text-sm text-gray-500 font-bold">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm text-white font-medium">{c.name}</p>
                </div>
                <p className="text-sm font-semibold text-[#00ff88]">{formatCurrency(c.total)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">Tranzaksiyalar</h3>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
        ) : sales.length === 0 ? (
          <p className="text-center text-gray-500 py-12 text-sm">Tranzaksiyalar topilmadi</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Sana', 'Turi', 'Mijoz/Mahsulot', 'Summa', 'Usul'].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs text-gray-400 uppercase font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {sales.slice(0, 50).map((s) => (
                  <tr key={s.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-3 text-gray-400">{formatDateTime(s.created_at)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.type === 'subscription' ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'bg-green-500/15 text-green-400'}`}>
                        {s.type === 'subscription' ? 'Abonement' : 'Bar'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-300">
                      {s.customer ? `${s.customer.first_name} ${s.customer.last_name ?? ''}` : s.product_name ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-white font-medium">{formatCurrency(s.amount)}</td>
                    <td className="px-5 py-3 text-gray-400 capitalize">
                      {PAYMENT_METHODS.find((m) => m.value === s.payment_method)?.label ?? s.payment_method}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
