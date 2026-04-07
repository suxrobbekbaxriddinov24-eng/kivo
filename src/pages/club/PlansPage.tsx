import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { plansService } from '@/services/plans.service'
import { toast } from '@/stores/uiStore'
import { formatCurrency } from '@/lib/utils'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Plan } from '@/types/database'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import StatusBadge from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus, Clock, Star, X } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Nom kiritilishi shart'),
  price: z.coerce.number().min(0),
  duration_type: z.enum(['daily', 'visit_based']),
  duration_value: z.coerce.number().min(1),
  category: z.string().optional(),
  time_restricted: z.boolean().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function PlansPage() {
  const { profile } = useAuthStore()
  const clubId = profile?.club_id!
  const qc = useQueryClient()

  const [open, setOpen] = useState(false)
  const [editPlan, setEditPlan] = useState<Plan | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [amenities, setAmenities] = useState<string[]>([])
  const [amenityInput, setAmenityInput] = useState('')

  const addAmenity = () => {
    const val = amenityInput.trim()
    if (val && !amenities.includes(val)) setAmenities((prev) => [...prev, val])
    setAmenityInput('')
  }
  const removeAmenity = (a: string) => setAmenities((prev) => prev.filter((x) => x !== a))

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans', clubId],
    queryFn: () => plansService.list(clubId),
    enabled: !!clubId,
  })

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { duration_type: 'daily', duration_value: 30 },
  })

  const timeRestricted = watch('time_restricted')
  const durationType = watch('duration_type')

  const openEdit = (p: Plan) => {
    setEditPlan(p)
    setValue('name', p.name)
    setValue('price', p.price)
    setValue('duration_type', p.duration_type)
    setValue('duration_value', p.duration_value)
    setValue('category', p.category ?? '')
    setValue('time_restricted', p.time_restricted)
    setValue('start_time', p.start_time ?? '')
    setValue('end_time', p.end_time ?? '')
    setAmenities(Array.isArray(p.amenities) ? (p.amenities as string[]) : [])
    setAmenityInput('')
    setOpen(true)
  }

  const openAdd = () => {
    reset()
    setEditPlan(null)
    setAmenities([])
    setAmenityInput('')
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        club_id: clubId,
        name: data.name,
        price: data.price,
        duration_type: data.duration_type,
        duration_value: data.duration_value,
        category: data.category || null,
        amenities,
        time_restricted: data.time_restricted ?? false,
        start_time: data.time_restricted ? (data.start_time ?? null) : null,
        end_time: data.time_restricted ? (data.end_time ?? null) : null,
        status: 'active' as const,
      }
      return editPlan
        ? plansService.update(editPlan.id, payload)
        : plansService.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans', clubId] })
      toast.success(editPlan ? 'Tarif yangilandi' : 'Tarif qo\'shildi')
      reset()
      setOpen(false)
      setEditPlan(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => plansService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans', clubId] })
      toast.success('Tarif o\'chirildi')
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-gray-400 text-sm">{plans.length} ta tarif</p>
        <Button icon={<Plus size={16} />} onClick={openAdd}>
          Tarif qo'shish
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-24 text-gray-500">Tariflar yo'q</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-semibold">{plan.name}</h3>
                  {plan.category && <p className="text-xs text-gray-400 mt-0.5 capitalize">{plan.category}</p>}
                </div>
                <StatusBadge status={plan.status} size="sm" />
              </div>
              <p className="text-2xl font-bold text-[#00ff88]">{formatCurrency(plan.price)}</p>
              <div className="flex gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {plan.duration_type === 'daily' ? `${plan.duration_value} kun` : `${plan.duration_value} tashrif`}
                </span>
                {plan.time_restricted && plan.start_time && (
                  <span className="flex items-center gap-1">
                    <Star size={12} />
                    {plan.start_time}—{plan.end_time}
                  </span>
                )}
              </div>
              {Array.isArray(plan.amenities) && plan.amenities.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(plan.amenities as string[]).map((a) => (
                    <span key={a} className="px-2 py-0.5 rounded-md bg-[#00ff88]/10 text-[#00ff88] text-xs font-medium">
                      {a}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-auto">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(plan)}>Tahrirlash</Button>
                <Button size="sm" variant="danger" onClick={() => setDeleteId(plan.id)}>O'chirish</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditPlan(null); reset() }}
        title={editPlan ? 'Tarifni tahrirlash' : "Yangi tarif qo'shish"}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Bekor</Button>
            <Button loading={saveMutation.isPending} onClick={handleSubmit((d) => saveMutation.mutate(d))}>Saqlash</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nomi *" error={errors.name?.message} {...register('name')} />
          <Controller
            name="price"
            control={control}
            render={({ field }) => {
              const display = field.value
                ? String(Math.round(Number(field.value))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                : ''
              return (
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-300 font-medium">Narxi (so'm) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={display}
                    placeholder="100 000"
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '')
                      field.onChange(raw ? Number(raw) : '')
                    }}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition"
                  />
                  {errors.price && <p className="text-xs text-red-400">{errors.price.message}</p>}
                </div>
              )
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tur"
              options={[
                { value: 'daily', label: 'Kunlik' },
                { value: 'visit_based', label: 'Tashrif asosida' },
              ]}
              {...register('duration_type')}
            />
            <Input
              label={durationType === 'daily' ? 'Kunlar soni' : 'Tashriflar soni'}
              type="number"
              error={errors.duration_value?.message}
              {...register('duration_value')}
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-[#00ff88]" {...register('time_restricted')} />
            <span className="text-sm text-gray-300">Vaqt chegarasi</span>
          </label>
          {timeRestricted && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Boshlanish vaqti" type="time" {...register('start_time')} />
              <Input label="Tugash vaqti" type="time" {...register('end_time')} />
            </div>
          )}

          {/* Amenities */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Xizmat ichiga nimalar kiradi
            </label>
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3 flex flex-col gap-2">
              {amenities.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {amenities.map((a) => (
                    <span key={a} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold text-gray-950" style={{ background: 'linear-gradient(135deg,#00ff88,#00cc6d)' }}>
                      {a}
                      <button type="button" onClick={() => removeAmenity(a)} className="hover:opacity-70 transition-opacity">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={amenityInput}
                  onChange={(e) => setAmenityInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAmenity() } }}
                  placeholder="Xususiyat yozish..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 outline-none"
                />
                <button
                  type="button"
                  onClick={addAmenity}
                  className="w-7 h-7 rounded-lg bg-gray-700 hover:bg-[#00ff88] hover:text-gray-950 text-gray-400 transition-colors flex items-center justify-center"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        message="Tarifni o'chirishni tasdiqlaysizmi?"
      />
    </div>
  )
}
