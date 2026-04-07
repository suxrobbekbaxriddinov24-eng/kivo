import { useState, useEffect, useRef } from 'react'
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
import PhoneInput from '@/components/ui/PhoneInput'
import StatusBadge from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Customer } from '@/types/database'
import { formatDate, daysUntil, formatCurrency, formatPhone } from '@/lib/utils'
import { GENDER_OPTIONS, PAYMENT_METHODS, PLAN_DURATIONS, DEFAULT_DISCOUNTS } from '@/lib/constants'
import { Plus, UserCheck, Camera, Upload, Check, Pencil } from 'lucide-react'
import CameraModal from '@/components/ui/CameraModal'

// ---------- schema ----------
const schema = z.object({
  full_name: z.string().min(1, 'Ism kiritilishi shart'),
  phone: z.string().optional(),
  email: z.string().optional(),
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

const DURATIONS = [
  { months: 1, label: '1 oy',   discountKey: 'm1'  as keyof typeof DEFAULT_DISCOUNTS },
  { months: 3, label: '3 oy',   discountKey: 'm3'  as keyof typeof DEFAULT_DISCOUNTS },
  { months: 6, label: '6 oy',   discountKey: 'm6'  as keyof typeof DEFAULT_DISCOUNTS },
  { months: 12, label: '12 oy', discountKey: 'm12' as keyof typeof DEFAULT_DISCOUNTS },
]

// ---------- component ----------
export default function CustomersPage() {
  const { profile } = useAuthStore()
  const clubId = profile?.club_id!
  const qc = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  const [addOpen, setAddOpen]         = useState(false)
  const [step, setStep]               = useState<1 | 2>(1)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number>(1)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash')
  const [planError, setPlanError]     = useState(false)
  const [cameraOpen, setCameraOpen]   = useState(false)

  const [editOpen, setEditOpen]        = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)

  const [subOpen, setSubOpen]         = useState(false)
  const [deleteId, setDeleteId]       = useState<string | null>(null)
  const [subCustomerId, setSubCustomerId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Open add modal if navigated here with state
  useEffect(() => {
    if (location.state?.openAdd) {
      openAdd()
      window.history.replaceState({}, '')
    }
  }, [location.state])


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

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: () => clubsService.get(clubId),
    enabled: !!clubId,
    staleTime: 5 * 60_000,
  })
  const clubDiscounts = (club?.settings?.discounts as typeof DEFAULT_DISCOUNTS) ?? DEFAULT_DISCOUNTS

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  })

  const { register: regSub, handleSubmit: handleSubSubmit, watch, reset: resetSub, formState: { errors: subErrors } } = useForm<SubFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(subSchema) as any,
    defaultValues: { duration_months: 1, payment_method: 'cash' },
  })

  const watchedPlanId   = watch('plan_id')
  const watchedDuration = watch('duration_months')
  const selectedPlanSub = plans.find((p) => p.id === watchedPlanId)
  const discountKeySub  = `m${watchedDuration}` as keyof typeof DEFAULT_DISCOUNTS
  const discountSub     = (clubDiscounts[discountKeySub] ?? DEFAULT_DISCOUNTS[discountKeySub]) ?? 0
  const totalSub        = selectedPlanSub ? Math.round(selectedPlanSub.price * watchedDuration * (1 - discountSub / 100)) : 0

  // Wizard — computed values
  const selectedPlanObj  = plans.find((p) => p.id === selectedPlanId)
  const durDiscount = (dur: number) => (clubDiscounts[`m${dur}` as keyof typeof DEFAULT_DISCOUNTS] ?? DEFAULT_DISCOUNTS[`m${dur}` as keyof typeof DEFAULT_DISCOUNTS]) ?? 0
  const durTotal    = (dur: number) => selectedPlanObj ? Math.round(selectedPlanObj.price * dur * (1 - durDiscount(dur) / 100)) : 0

  function openAdd() {
    reset()
    setStep(1)
    setPhotoPreview(null)
    setSelectedPlanId(null)
    setSelectedDuration(1)
    setPaymentMethod('cash')
    setPlanError(false)
    setAddOpen(true)
  }

  function openEdit(c: Customer) {
    setEditCustomer(c)
    reset({
      full_name: [c.first_name, c.last_name].filter(Boolean).join(' '),
      phone: c.phone ?? '',
      email: (c as any).email ?? '',
      gender: c.gender ?? undefined,
      birth_date: c.birth_date ?? '',
      notes: c.notes ?? '',
    })
    setEditOpen(true)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
  }

  function goToStep2(data: FormData) {
    if (!selectedPlanId) { setPlanError(true); return }
    setPlanError(false)
    setStep(2)
  }

  const wizardMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const parts   = data.full_name.trim().split(/\s+/)
      const firstName = parts[0] ?? ''
      const lastName  = parts.slice(1).join(' ') || null

      const customer = await customersService.create({
        club_id: clubId,
        first_name: firstName,
        last_name: lastName,
        phone: data.phone ?? null,
        gender: data.gender ?? null,
        birth_date: data.birth_date ?? null,
        notes: data.notes ?? null,
        photo_url: null,
        address: null,
        locker_number: null,
        branch_id: null,
        status: 'active',
      })

      if (selectedPlanId && selectedPlanObj) {
        const disc   = durDiscount(selectedDuration)
        const amount = durTotal(selectedDuration)
        await subscriptionsService.create({
          club_id: clubId,
          customer_id: customer.id,
          plan: selectedPlanObj,
          duration_months: selectedDuration,
          discount_pct: disc,
          amount_paid: amount,
          payment_method: paymentMethod,
          sold_by: profile!.id,
        })
      }
      return customer
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', clubId] })
      qc.invalidateQueries({ queryKey: ['stats', clubId] })
      toast.success("Mijoz va obuna muvaffaqiyatli qo'shildi")
      setAddOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', clubId] })
      toast.success("Mijoz o'chirildi")
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!editCustomer) return
      const parts = data.full_name.trim().split(/\s+/)
      await customersService.update(editCustomer.id, {
        first_name: parts[0] ?? '',
        last_name: parts.slice(1).join(' ') || null,
        phone: data.phone ?? null,
        gender: data.gender ?? null,
        birth_date: data.birth_date ?? null,
        notes: data.notes ?? null,
      } as any)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers', clubId] })
      toast.success('Mijoz yangilandi')
      setEditOpen(false)
      setEditCustomer(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const subMutation = useMutation({
    mutationFn: async (data: SubFormData) => {
      const plan    = plans.find((p) => p.id === data.plan_id)!
      const discKey = `m${data.duration_months}` as keyof typeof DEFAULT_DISCOUNTS
      const disc    = (clubDiscounts[discKey] ?? DEFAULT_DISCOUNTS[discKey]) ?? 0
      const amount  = Math.round(plan.price * data.duration_months * (1 - disc / 100))
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
      const customer = customers.find((c) => c.id === customerId)
      const sub = customer?.active_subscription
      if (!sub) throw new Error("Mijozning faol obunasi yo'q")
      if (sub.expires_at && new Date(sub.expires_at) < new Date()) throw new Error('Obuna muddati tugagan')
      if (sub.duration_type === 'visit_based' && sub.visits_total !== null && sub.visits_used >= sub.visits_total) throw new Error('Tashrif limiti tugagan')
      return customersService.checkIn(customerId, clubId, profile!.id, sub.id)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers', clubId] }); toast.success('Kirish qayd etildi') },
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
      header: "Qo'shilgan sana",
      accessor: (c) => <span className="text-gray-400 text-sm">{formatDate(c.created_at)}</span>,
    },
    {
      header: 'Holat',
      accessor: (c) => <StatusBadge status={c.active_subscription ? 'active' : 'inactive'} />,
    },
  ]

  const activePlans = plans.filter((p) => p.status === 'active')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{customers.length} ta mijoz</p>
        <Button icon={<Plus size={16} />} onClick={openAdd}>
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
            <Button size="sm" variant="ghost" icon={<UserCheck size={14} />}
              onClick={() => checkInMutation.mutate(c.id)}
              loading={checkInMutation.isPending && checkInMutation.variables === c.id}
              title="Kirdi deb belgilash" />
            <Button size="sm" variant="ghost" icon={<Pencil size={14} />}
              onClick={(e) => { e.stopPropagation(); openEdit(c) }}
              title="Tahrirlash" />
            <Button size="sm" variant="outline"
              onClick={(e) => { e.stopPropagation(); setSubCustomerId(c.id); setSubOpen(true) }}>
              Obuna
            </Button>
            <Button size="sm" variant="danger"
              onClick={(e) => { e.stopPropagation(); setDeleteId(c.id) }}>
              O'chirish
            </Button>
          </div>
        )}
      />

      {/* ── Wizard modal ── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} size="2xl">
        {/* Stepper */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {/* Step 1 */}
          <div className="flex flex-col items-center gap-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${step >= 1 ? 'bg-[#00ff88] border-[#00ff88] text-gray-950' : 'border-gray-600 text-gray-400'}`}>1</div>
            <span className={`text-xs font-medium ${step >= 1 ? 'text-[#00ff88]' : 'text-gray-500'}`}>Ma'lumotlar va Tarif</span>
          </div>
          <div className={`h-0.5 w-24 mb-4 transition-colors ${step >= 2 ? 'bg-[#00ff88]' : 'bg-gray-700'}`} />
          {/* Step 2 */}
          <div className="flex flex-col items-center gap-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${step >= 2 ? 'bg-[#00ff88] border-[#00ff88] text-gray-950' : 'border-gray-600 text-gray-400'}`}>2</div>
            <span className={`text-xs font-medium ${step >= 2 ? 'text-[#00ff88]' : 'text-gray-500'}`}>To'lov</span>
          </div>
        </div>

        {step === 1 && (
          <div className="grid grid-cols-2 gap-6">
            {/* ── Left: Personal info ── */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <UserCheck size={13} /> Shaxsiy ma'lumotlar
              </p>

              {/* Photo upload */}
              <div className="flex gap-3 items-start">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-600 hover:border-[#00ff88]/60 flex flex-col items-center justify-center cursor-pointer transition-colors shrink-0 overflow-hidden"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera size={24} className="text-gray-500" />
                      <span className="text-xs text-gray-500 mt-1">Rasm yuklash</span>
                    </>
                  )}
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors">
                    <Upload size={13} /> Fayldan yuklash
                  </button>
                  <button type="button" onClick={() => setCameraOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors">
                    <Camera size={13} /> Kamera orqali
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </div>

              {/* Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Ism va Familiya</label>
                  <input
                    {...register('full_name')}
                    placeholder="Masalan: Jasur Karimov"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition"
                  />
                  {errors.full_name && <p className="text-xs text-red-400 mt-1">{errors.full_name.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Telefon raqami</label>
                  <Controller name="phone" control={control} render={({ field }) => (
                    <PhoneInput value={field.value ?? ''} onChange={field.onChange} />
                  )} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Email manzili (ixtiyoriy)</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="example@mail.com"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Jinsi</label>
                    <select {...register('gender')}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] transition appearance-none">
                      <option value="">Tanlang</option>
                      {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Tug'ilgan sana</label>
                    <input type="date" {...register('birth_date')}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] transition" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Admin uchun eslatma</label>
                  <textarea {...register('notes')} rows={2} placeholder="Faqat xodimlar uchun ko'rinadi"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#00ff88] transition resize-none" />
                </div>
              </div>
            </div>

            {/* ── Right: Plan + duration ── */}
            <div className="space-y-4">
              {/* Plans */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                  🎫 Xizmat turini tanlang
                </p>
                {activePlans.length === 0 ? (
                  <div className="border border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-500 text-sm">
                    Hech qanday tarif mavjud emas
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                    {activePlans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => { setSelectedPlanId(plan.id); setPlanError(false) }}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                          selectedPlanId === plan.id
                            ? 'border-[#00ff88] bg-[#00ff88]/5'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-semibold text-sm">{plan.name}</p>
                            <p className={`text-xs mt-0.5 font-bold ${selectedPlanId === plan.id ? 'text-[#00ff88]' : 'text-gray-400'}`}>
                              {formatCurrency(plan.price)}
                            </p>
                          </div>
                          {selectedPlanId === plan.id && (
                            <div className="w-6 h-6 rounded-full bg-[#00ff88] flex items-center justify-center shrink-0">
                              <Check size={13} className="text-gray-950" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {planError && <p className="text-xs text-red-400 mt-1">Tarif tanlash shart</p>}
              </div>

              {/* Duration cards */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                  📅 Muddatni tanlang
                </p>
                {!selectedPlanId ? (
                  <div className="border border-dashed border-gray-700 rounded-xl p-6 text-center text-gray-500 text-sm">
                    Avval xizmat turini tanlang
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {DURATIONS.map((d) => {
                      const disc  = durDiscount(d.months)
                      const total = durTotal(d.months)
                      const orig  = selectedPlanObj ? selectedPlanObj.price * d.months : 0
                      const isSel = selectedDuration === d.months
                      const isRec = d.months === 3
                      const isBest = d.months === 12
                      return (
                        <button
                          key={d.months}
                          type="button"
                          onClick={() => setSelectedDuration(d.months)}
                          className={`relative text-left p-3 rounded-xl border-2 transition-all ${
                            isSel ? 'border-[#00ff88] bg-[#00ff88]/5' : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                          }`}
                        >
                          {isRec && !isSel && (
                            <span className="absolute top-2 right-2 bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">TAVSIYA</span>
                          )}
                          {isBest && !isSel && (
                            <span className="absolute top-2 right-2 bg-[#00ff88] text-gray-950 text-[9px] font-bold px-1.5 py-0.5 rounded">ENG FOYDALI</span>
                          )}
                          <p className="text-white font-bold text-sm">{d.label}</p>
                          {disc > 0 && (
                            <p className="text-gray-500 text-xs line-through">{formatCurrency(orig)}</p>
                          )}
                          <p className={`text-sm font-bold ${isSel ? 'text-[#00ff88]' : 'text-white'}`}>{formatCurrency(total)}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{disc > 0 ? `−${disc}% chegirma` : 'Chegirmasiz'}</p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 max-w-sm mx-auto">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">To'lov usulini tanlang</p>
            <div className="grid grid-cols-3 gap-3">
              {(PAYMENT_METHODS as unknown as {value: string; label: string}[]).map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPaymentMethod(m.value as 'cash' | 'card' | 'transfer')}
                  className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    paymentMethod === m.value
                      ? 'border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88]'
                      : 'border-gray-700 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Summary */}
            {selectedPlanObj && (
              <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-white font-semibold text-base mb-3">Buyurtma xulosasi</p>
                <div className="flex justify-between text-gray-400">
                  <span>Tarif</span>
                  <span className="text-white">{selectedPlanObj.name}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Muddat</span>
                  <span className="text-white">{selectedDuration} oy</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Asl narx</span>
                  <span>{formatCurrency(selectedPlanObj.price * selectedDuration)}</span>
                </div>
                {durDiscount(selectedDuration) > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Chegirma ({durDiscount(selectedDuration)}%)</span>
                    <span>−{formatCurrency(Math.round(selectedPlanObj.price * selectedDuration * durDiscount(selectedDuration) / 100))}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-bold border-t border-gray-700 pt-2 text-base">
                  <span>Jami</span>
                  <span className="text-[#00ff88]">{formatCurrency(durTotal(selectedDuration))}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-800">
          <Button variant="ghost" onClick={() => step === 1 ? setAddOpen(false) : setStep(1)}>
            {step === 1 ? 'Bekor qilish' : '← Orqaga'}
          </Button>
          {step === 1 ? (
            <Button onClick={handleSubmit(goToStep2)}>
              To'lovga o'tish →
            </Button>
          ) : (
            <Button loading={wizardMutation.isPending} onClick={handleSubmit((d) => wizardMutation.mutate(d))}>
              ✓ Tasdiqlash
            </Button>
          )}
        </div>
      </Modal>

      {/* Subscription modal (for existing customers) */}
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
          {selectedPlanSub && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-1 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Narx × {watchedDuration} oy</span>
                <span>{formatCurrency(selectedPlanSub.price * watchedDuration)}</span>
              </div>
              {discountSub > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Chegirma ({discountSub}%)</span>
                  <span>−{formatCurrency(Math.round(selectedPlanSub.price * watchedDuration * discountSub / 100))}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-semibold border-t border-gray-700 pt-2 mt-2">
                <span>Jami</span>
                <span>{formatCurrency(totalSub)}</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Edit customer modal ── */}
      <Modal
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditCustomer(null) }}
        title="Mijozni tahrirlash"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setEditOpen(false); setEditCustomer(null) }}>Bekor qilish</Button>
            <Button loading={updateMutation.isPending} onClick={handleSubmit(d => updateMutation.mutate(d))}>Saqlash</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="To'liq ism *" placeholder="Ism Familiya" error={errors.full_name?.message} {...register('full_name')} />
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <PhoneInput label="Telefon raqami" value={field.value ?? ''} onChange={field.onChange} />
            )}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-300 font-medium">Jinsi</label>
              <select {...register('gender')} className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition">
                <option value="">Tanlang</option>
                {(GENDER_OPTIONS as unknown as {value: string; label: string}[]).map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <Input label="Tug'ilgan sana" type="date" {...register('birth_date')} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300 font-medium">Izoh</label>
            <textarea {...register('notes')} rows={2} placeholder="Qo'shimcha ma'lumot..." className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition resize-none" />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        message="Bu mijozni o'chirishni tasdiqlaysizmi? Bu amalni ortga qaytarib bo'lmaydi."
      />

      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(dataUrl) => setPhotoPreview(dataUrl)}
      />
    </div>
  )
}
