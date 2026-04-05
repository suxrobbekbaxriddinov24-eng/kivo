import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { customersService } from '@/services/customers.service'
import { subscriptionsService } from '@/services/subscriptions.service'
import { plansService } from '@/services/plans.service'
import { clubsService } from '@/services/clubs.service'
import { toast } from '@/stores/uiStore'
import Button from '@/components/ui/Button'
import DataTable from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import StatusBadge from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Customer } from '@/types/database'
import { formatDate, daysUntil, formatCurrency, formatPhone } from '@/lib/utils'
import { GENDER_OPTIONS, PAYMENT_METHODS, PLAN_DURATIONS, DEFAULT_DISCOUNTS } from '@/lib/constants'
import { Plus, UserCheck } from 'lucide-react'

// ---------- schema ----------
const schema = z.object({
  first_name: z.string().min(1, 'Ism kiritilishi shart'),
  last_name: z.string().optional(),
  phone: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  birth_date: z.string().optional(),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const subSchema = z.object({
  plan_id: z.string().min(1, 'Tarif tanlang'),
  duration_months: z.coerce.number().min(1),
  payment_method: z.enum(['cash', 'card', 'transfer']),
})
type SubFormData = z.infer<typeof subSchema>

// ---------- component ----------
export default function CustomersPage() {
  const { profile } = useAuthStore()
  const clubId = profile?.club_id!
  const qc = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  const [addOpen, setAddOpen] = useState(false)
  const [subOpen, setSubOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [subCustomerId, setSubCustomerId] = useState<string | null>(null)

  // Open add modal if navigated here with state
  useEffect(() => {
    if (location.state?.openAdd) {
      setAddOpen(true)
      window.history.replaceState({}, '')
    }
  }, [location.state])

  // H-2: Mark expired subscriptions as expired when the page loads
  useEffect(() => {
    if (clubId) {
      subscriptionsService.expireStale(clubId).catch(() => {/* non-fatal */})
    }
  }, [clubId])

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', clubId],
    queryFn: () => customersService.list(clubId),
    enabled: !!clubId,
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['plans', clubId],
    queryFn: () => plansService.list(clubId),
    enabled: !!clubId,
  })

  // H-4: Fetch club settings for per-club discount configuration
  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: () => clubsService.get(clubId),
    enabled: !!clubId,
    staleTime: 5 * 60_000,
  })
  const clubDiscounts = (club?.settings?.discounts as typeof DEFAULT_DISCOUNTS) ?? DEFAULT_DISCOUNTS

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  })

  const { register: regSub, handleSubmit: handleSubSubmit, watch, reset: resetSub, formState: { errors: subErrors } } = useForm<SubFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(subSchema) as any,
    defaultValues: { duration_months: 1, payment_method: 'cash' },
  })

  const watchedPlanId = watch('plan_id')
  const watchedDuration = watch('duration_months')
  const selectedPlan = plans.find((p) => p.id === watchedPlanId)
  const discountKey = `m${watchedDuration}` as keyof typeof DEFAULT_DISCOUNTS
  // H-4: use per-club discounts, fallback to DEFAULT_DISCOUNTS
  const discount = (clubDiscounts[discountKey] ?? DEFAULT_DISCOUNTS[discountKey]) ?? 0
  const rawTotal = selectedPlan ? selectedPlan.price * watchedDuration * (1 - discount / 100) : 0
  const total = Math.round(rawTotal)

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      customersService.create({ ...data, club_id: clubId, status: 'active', gender: data.gender ?? null, birth_date: data.birth_date ?? null, last_name: data.last_name ?? null, phone: data.phone ?? null, notes: data.notes ?? null, photo_url: null, address: null, locker_number: null, branch_id: null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', clubId] })
      toast.success('Mijoz qo\'shildi')
      reset()
      setAddOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', clubId] })
      toast.success('Mijoz o\'chirildi')
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const subMutation = useMutation({
    mutationFn: async (data: SubFormData) => {
      const plan = plans.find((p) => p.id === data.plan_id)!
      const discKey = `m${data.duration_months}` as keyof typeof DEFAULT_DISCOUNTS
      const disc = (clubDiscounts[discKey] ?? DEFAULT_DISCOUNTS[discKey]) ?? 0
      const amount = Math.round(plan.price * data.duration_months * (1 - disc / 100))
      await subscriptionsService.create({
        club_id: clubId,
        customer_id: subCustomerId!,
        plan,
        duration_months: data.duration_months,
        discount_pct: disc,
        amount_paid: amount,
        payment_method: data.payment_method,
        sold_by: profile!.id,
      })
    },
    onSuccess: () => {
      // L-6: Invalidate all related queries
      qc.invalidateQueries({ queryKey: ['customers', clubId] })
      qc.invalidateQueries({ queryKey: ['stats', clubId] })
      if (subCustomerId) qc.invalidateQueries({ queryKey: ['customer', subCustomerId] })
      toast.success('Obuna yaratildi')
      resetSub()
      setSubOpen(false)
      setSubCustomerId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const checkInMutation = useMutation({
    mutationFn: (customerId: string) => {
      // H-3: Validate subscription before allowing check-in
      const customer = customers.find((c) => c.id === customerId)
      const sub = customer?.active_subscription

      if (!sub) throw new Error("Mijozning faol obunasi yo'q")

      if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
        throw new Error('Obuna muddati tugagan')
      }

      if (sub.duration_type === 'visit_based' && sub.visits_total !== null && sub.visits_used >= sub.visits_total) {
        throw new Error('Tashrif limiti tugagan')
      }

      return customersService.checkIn(customerId, clubId, profile!.id, sub.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', clubId] })
      toast.success('Kirish qayd etildi')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const columns: Column<Customer>[] = [
    {
      header: 'Mijoz',
      accessor: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#00ff88]/10 flex items-center justify-center text-[#00ff88] text-xs font-bold shrink-0">
            {c.first_name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-white font-medium">{c.first_name} {c.last_name}</p>
            <p className="text-xs text-gray-400">{formatPhone(c.phone)}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Obuna',
      accessor: (c) => {
        const sub = c.active_subscription
        if (!sub) return <StatusBadge status="inactive" />
        const days = daysUntil(sub.expires_at)
        return (
          <div>
            <p className="text-sm text-white">{sub.plan_name}</p>
            {sub.expires_at && (
              <p className={`text-xs ${days !== null && days <= 3 ? 'text-orange-400' : 'text-gray-400'}`}>
                {days === null ? '—' : days < 0 ? 'Muddati tugagan' : days === 0 ? 'Bugun tugaydi' : `${days} kun qoldi`}
              </p>
            )}
          </div>
        )
      },
    },
    {
      header: 'Qo\'shilgan sana',
      accessor: (c) => <span className="text-gray-400 text-sm">{formatDate(c.created_at)}</span>,
    },
    {
      header: 'Holat',
      accessor: (c) => <StatusBadge status={c.active_subscription ? 'active' : 'inactive'} />,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{customers.length} ta mijoz</p>
        <Button icon={<Plus size={16} />} onClick={() => { reset(); setAddOpen(true) }}>
          Mijoz qo'shish
        </Button>
      </div>

      <DataTable
        data={customers}
        columns={columns}
        isLoading={isLoading}
        rowKey={(c) => c.id}
        onRowClick={(c) => navigate(`/customers/${c.id}`)}
        searchable
        searchPlaceholder="Ism, telefon bo'yicha qidirish..."
        emptyMessage="Hech qanday mijoz topilmadi"
        actions={(c) => (
          <div className="flex items-center gap-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              icon={<UserCheck size={14} />}
              onClick={() => checkInMutation.mutate(c.id)}
              loading={checkInMutation.isPending}
              title="Kirdi deb belgilash"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); setSubCustomerId(c.id); setSubOpen(true) }}
            >
              Obuna
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => { e.stopPropagation(); setDeleteId(c.id) }}
            >
              O'chirish
            </Button>
          </div>
        )}
      />

      {/* Add customer modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Yangi mijoz qo'shish"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Bekor</Button>
            <Button loading={createMutation.isPending} onClick={handleSubmit((d) => createMutation.mutate(d))}>
              Saqlash
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ism *" error={errors.first_name?.message} {...register('first_name')} />
            <Input label="Familiya" error={errors.last_name?.message} {...register('last_name')} />
          </div>
          <Input label="Telefon" placeholder="+998 90 123-45-67" {...register('phone')} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Jinsi" options={GENDER_OPTIONS as unknown as {value:string;label:string}[]} placeholder="Tanlang" {...register('gender')} />
            <Input label="Tug'ilgan sana" type="date" {...register('birth_date')} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300 font-medium">Izoh</label>
            <textarea
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00ff88] resize-none"
              rows={2}
              {...register('notes')}
            />
          </div>
        </div>
      </Modal>

      {/* Subscription modal */}
      <Modal
        open={subOpen}
        onClose={() => { setSubOpen(false); setSubCustomerId(null) }}
        title="Obuna yaratish"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSubOpen(false)}>Bekor</Button>
            <Button loading={subMutation.isPending} onClick={handleSubSubmit((d) => subMutation.mutate(d))}>
              Tasdiqlash
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Tarif *"
            options={plans.filter((p) => p.status === 'active').map((p) => ({
              value: p.id,
              label: `${p.name} — ${formatCurrency(p.price)}`,
            }))}
            placeholder="Tarif tanlang"
            error={subErrors.plan_id?.message}
            {...regSub('plan_id')}
          />
          <Select
            label="Muddat"
            options={PLAN_DURATIONS.map((d) => ({
              value: String(d.value),
              label: `${d.label} (−${clubDiscounts[d.discountKey as keyof typeof DEFAULT_DISCOUNTS] ?? 0}%)`,
            }))}
            {...regSub('duration_months')}
          />
          <Select
            label="To'lov usuli"
            options={PAYMENT_METHODS as unknown as {value:string;label:string}[]}
            {...regSub('payment_method')}
          />
          {selectedPlan && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Narx × {watchedDuration} oy</span>
                <span>{formatCurrency(selectedPlan.price * watchedDuration)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Chegirma ({discount}%)</span>
                  <span>−{formatCurrency(Math.round(selectedPlan.price * watchedDuration * discount / 100))}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-semibold border-t border-gray-700 pt-2 mt-2">
                <span>Jami</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        message="Bu mijozni o'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo'lmaydi."
      />
    </div>
  )
}
