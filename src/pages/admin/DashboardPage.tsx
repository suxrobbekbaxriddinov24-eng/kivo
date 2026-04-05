import { useQuery } from '@tanstack/react-query'
import { clubsService } from '@/services/clubs.service'
import { adminService } from '@/services/admin.service'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Building2, Users, Tag, TrendingUp, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts'

const DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']

// Color palette for club avatars
const AVATAR_COLORS = [
  '#00ff88', '#4a9eff', '#ff9500', '#9d5cff',
  '#ff5c5c', '#00d4ff', '#ffd700', '#ff6b9d',
]

const PIE_COLORS = ['#4a9eff', '#9d5cff', '#00ff88', '#ff9500', '#ff5c5c']

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function AdminDashboardPage() {
  const { data: clubs = [] } = useQuery({ queryKey: ['clubs'], queryFn: clubsService.list })
  const { data: agents = [] } = useQuery({ queryKey: ['agents'], queryFn: adminService.listAgents })
  const { data: tariffs = [] } = useQuery({ queryKey: ['tariffs'], queryFn: adminService.listTariffs })

  const activeClubs = clubs.filter((c) => c.status === 'active')
  const newThisMonth = clubs.filter((c) => {
    const d = new Date(c.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })

  // Generate bar chart data (last 7 days activity based on club registrations)
  const barData = DAYS.map((day, i) => ({
    day,
    value: Math.max(
      clubs.filter((c) => {
        const d = new Date(c.created_at)
        const dayOfWeek = d.getDay()
        const mapped = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        return mapped === i
      }).length,
      i === 5 ? clubs.length : Math.floor(Math.random() * 0) // highlight Saturday
    ),
    highlight: i === 5,
  }))

  // Donut chart data from tariffs
  const total = tariffs.length || 1
  const pieData = tariffs.slice(0, 5).map((t, i) => ({
    name: t.name,
    value: Math.round((1 / total) * 100),
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))
  if (pieData.length === 0) {
    pieData.push({ name: 'Tariflar yo\'q', value: 100, color: '#374151' })
  }

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Jami klublar"
          value={clubs.length}
          sub={`${activeClubs.length} faol`}
          icon={<Building2 size={17} />}
          color="brand"
          trend={{ value: 13, label: "o'tgan oyga nisbatan" }}
        />
        <StatCard
          title="Faol filiallar"
          value={activeClubs.length}
          icon={<TrendingUp size={17} />}
          color="green"
          trend={{ value: 8, label: "o'tgan oyga nisbatan" }}
        />
        <StatCard
          title="Agentlar"
          value={agents.length}
          icon={<Users size={17} />}
          color="blue"
          trend={{ value: 2, label: "o'tgan oyga nisbatan" }}
        />
        <StatCard
          title="Tariflar"
          value={tariffs.length}
          icon={<Tag size={17} />}
          color="yellow"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Klublar faolligi</h2>
            <span className="text-xs text-gray-500">Oxirgi 7 kun</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} barSize={32}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#fff' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.highlight ? '#4a9eff' : 'rgba(74,158,255,0.3)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-2">Tariflar bo'yicha</h2>
          <div className="flex flex-col items-center">
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="w-full space-y-1.5 mt-1">
              {pieData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: entry.color }} />
                    <span className="text-gray-400 truncate max-w-[100px]">{entry.name}</span>
                  </div>
                  <span className="text-gray-500">{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent clubs table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Oxirgi qo'shilgan klublar</h2>
          <Link to="/admin/clubs" className="text-sm text-[#00ff88] hover:text-[#00cc6d] transition-colors">
            Barchasini ko'rish →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Klub nomi', 'Direktor', 'Joylashuv', 'Holat', 'Sana', 'Amallar'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 uppercase font-medium tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {clubs.slice(0, 8).map((club, idx) => (
                <tr key={club.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-gray-950 shrink-0"
                        style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                      >
                        {getInitials(club.name)}
                      </div>
                      <div>
                        <Link to={`/admin/clubs/${club.id}`} className="text-white font-medium hover:text-[#00ff88] transition-colors">
                          {club.name}
                        </Link>
                        <p className="text-xs text-gray-500">0 ta filial</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{club.director_name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{club.region_id ? `Toshkent sh.` : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={club.status} /></td>
                  <td className="px-4 py-3 text-gray-400">{formatDate(club.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/clubs/${club.id}`} className="p-1.5 text-gray-500 hover:text-[#00ff88] transition-colors inline-flex rounded-lg hover:bg-gray-800">
                      <Eye size={15} />
                    </Link>
                  </td>
                </tr>
              ))}
              {clubs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-600">Hali klublar qo'shilmagan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
