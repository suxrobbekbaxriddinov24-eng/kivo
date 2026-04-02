import { useQuery } from '@tanstack/react-query'
import { clubsService } from '@/services/clubs.service'
import { adminService } from '@/services/admin.service'
import StatCard from '@/components/ui/StatCard'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Building2, Users, Tag, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Jami klublar" value={clubs.length} sub={`${activeClubs.length} faol`} icon={<Building2 size={18} />} color="indigo" />
        <StatCard title="Bu oy qo'shilgan" value={newThisMonth.length} icon={<TrendingUp size={18} />} color="green" />
        <StatCard title="Agentlar" value={agents.length} icon={<Users size={18} />} color="blue" />
        <StatCard title="Tariflar" value={tariffs.length} icon={<Tag size={18} />} color="yellow" />
      </div>

      {/* Clubs table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">So'nggi klublar</h2>
          <Link to="/admin/clubs" className="text-sm text-indigo-400 hover:text-indigo-300">Barchasi</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Klub nomi', 'Rahbar', 'Viloyat', 'Qo\'shilgan', 'Holat'].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-xs text-gray-400 uppercase font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {clubs.slice(0, 10).map((club) => (
                <tr key={club.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-5 py-3">
                    <Link to={`/admin/clubs/${club.id}`} className="text-white font-medium hover:text-indigo-400">{club.name}</Link>
                  </td>
                  <td className="px-5 py-3 text-gray-300">{club.director_name ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-400">{club.region_id ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-400">{formatDate(club.created_at)}</td>
                  <td className="px-5 py-3"><StatusBadge status={club.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
