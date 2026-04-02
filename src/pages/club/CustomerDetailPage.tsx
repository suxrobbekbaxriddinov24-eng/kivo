import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { customersService } from '@/services/customers.service'
import { subscriptionsService } from '@/services/subscriptions.service'
import { formatDate, formatDateTime, formatPhone, formatCurrency, daysUntil } from '@/lib/utils'
import StatusBadge from '@/components/ui/StatusBadge'
import Button from '@/components/ui/Button'
import { ArrowLeft, Phone, Calendar, User } from 'lucide-react'

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>()
  const { profile } = useAuthStore()
  const clubId = profile?.club_id!

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersService.get(customerId!),
    enabled: !!customerId,
  })

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions', customerId],
    queryFn: () => subscriptionsService.listForCustomer(customerId!),
    enabled: !!customerId,
  })

  const { data: visits = [] } = useQuery({
    queryKey: ['visits', customerId],
    queryFn: () => customersService.visits(customerId!, clubId),
    enabled: !!customerId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!customer) return <p className="text-gray-400">Mijoz topilmadi</p>

  const activeSub = subscriptions.find((s) => s.status === 'active')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm">
        <ArrowLeft size={16} /> Mijozlar ro'yxati
      </Link>

      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-start gap-5">
        <div className="w-16 h-16 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-300 font-bold text-2xl shrink-0">
          {customer.first_name[0]?.toUpperCase()}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{customer.first_name} {customer.last_name}</h2>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-400">
            {customer.phone && (
              <span className="flex items-center gap-1.5"><Phone size={14} />{formatPhone(customer.phone)}</span>
            )}
            {customer.birth_date && (
              <span className="flex items-center gap-1.5"><Calendar size={14} />{formatDate(customer.birth_date)}</span>
            )}
            {customer.gender && (
              <span className="flex items-center gap-1.5"><User size={14} />{customer.gender === 'male' ? 'Erkak' : 'Ayol'}</span>
            )}
          </div>
          {customer.notes && <p className="text-sm text-gray-500 mt-2">{customer.notes}</p>}
        </div>
        <StatusBadge status={activeSub ? 'active' : 'inactive'} />
      </div>

      {/* Active subscription */}
      {activeSub && (
        <div className="bg-gray-900 border border-indigo-500/20 rounded-xl p-5">
          <h3 className="text-white font-semibold mb-3">Faol obuna</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Tarif</p>
              <p className="text-white font-medium">{activeSub.plan_name}</p>
            </div>
            <div>
              <p className="text-gray-400">To'langan</p>
              <p className="text-white font-medium">{formatCurrency(activeSub.amount_paid)}</p>
            </div>
            {activeSub.expires_at && (
              <div>
                <p className="text-gray-400">Tugash sanasi</p>
                <p className={`font-medium ${daysUntil(activeSub.expires_at)! <= 3 ? 'text-orange-400' : 'text-white'}`}>
                  {formatDate(activeSub.expires_at)} ({daysUntil(activeSub.expires_at)} kun)
                </p>
              </div>
            )}
            {activeSub.visits_total && (
              <div>
                <p className="text-gray-400">Tashrif</p>
                <p className="text-white font-medium">{activeSub.visits_used} / {activeSub.visits_total}</p>
              </div>
            )}
            <div>
              <p className="text-gray-400">To'lov usuli</p>
              <p className="text-white font-medium capitalize">{activeSub.payment_method}</p>
            </div>
            <div>
              <p className="text-gray-400">Boshlangan</p>
              <p className="text-white font-medium">{formatDate(activeSub.starts_at)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Subscription history */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">Obuna tarixi ({subscriptions.length})</h3>
        {subscriptions.length === 0 ? (
          <p className="text-gray-500 text-sm">Obunalar yo'q</p>
        ) : (
          <div className="space-y-2">
            {subscriptions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50">
                <div>
                  <p className="text-sm text-white font-medium">{s.plan_name}</p>
                  <p className="text-xs text-gray-400">{formatDate(s.starts_at)} — {s.expires_at ? formatDate(s.expires_at) : '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white">{formatCurrency(s.amount_paid)}</p>
                  <StatusBadge status={s.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visit history */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">Tashrif tarixi ({visits.length})</h3>
        {visits.length === 0 ? (
          <p className="text-gray-500 text-sm">Tashriflar yo'q</p>
        ) : (
          <div className="space-y-1">
            {(visits as { id: string; checked_in_at: string }[]).slice(0, 20).map((v) => (
              <div key={v.id} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-gray-800/50">
                <span className="text-gray-300">{formatDateTime(v.checked_in_at)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-indigo-400"
                >Kirdi</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
