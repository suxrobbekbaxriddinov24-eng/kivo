import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin.service'
import { toast } from '@/stores/uiStore'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { PlatformTariff } from '@/types/database'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import StatusBadge from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus, Check, Pencil, Trash2 } from 'lucide-react'

const ALL_FEATURES = [
  'CRM tizimi', 'Hisobotlar',
  'Analitika', 'API kirish',
  'Mobil ilova', 'Marketing',
  "Qo'llab-quvvatlash", 'Cheksiz foydalanuvchilar',
]

const schema = z.object({
  name:        z.string().min(1, 'Tarif nomi kiritilishi shart'),
  price:       z.coerce.number().min(0),
  currency_id: z.string().optional(),
  period_days: z.coerce.number().min(1),
  features:    z.array(z.string()),
  status:      z.enum(['active', 'inactive', 'suspended']),
})
type FormData = z.infer<typeof schema>

export default function TariffsPage() {
  const qc = useQueryClient()
  const [open, setOpen]           = useState(false)
  const [editTariff, setEditTariff] = useState<PlatformTariff | null>(null)
  const [deleteId, setDeleteId]   = useState<string | null>(null)

  const { data: tariffs = [], isLoading } = useQuery({ queryKey: ['tariffs'],    queryFn: adminService.listTariffs })
  const { data: currencies = [] }         = useQuery({ queryKey: ['currencies'], queryFn: adminService.listCurrencies })

  const defaultCurrency = currencies.find(c => c.is_default) ?? currencies[0]

  const { register, handleSubmit, reset, setValue, control, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { status: 'active', period_days: 30, features: [], currency_id: '' },
  })

  const selectedFeatures = watch('features') ?? []

  const toggleFeature = (f: string) => {
    const cur = selectedFeatures
    setValue('features', cur.includes(f) ? cur.filter(x => x !== f) : [...cur, f])
  }

  const selectAll = () => {
    setValue('features', selectedFeatures.length === ALL_FEATURES.length ? [] : [...ALL_FEATURES])
  }

  const openAdd = () => {
    setEditTariff(null)
    reset({ name: '', price: 0, period_days: 30, features: [], status: 'active', currency_id: defaultCurrency?.id ?? '' })
    setOpen(true)
  }

  const openEdit = (t: PlatformTariff) => {
    setEditTariff(t)
    reset({
      name:        t.name,
      price:       t.price,
      period_days: t.period_days,
      features:    t.features,
      status:      t.status,
      currency_id: defaultCurrency?.id ?? '',
    })
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        name:        data.name,
        price:       data.price,
        period_days: data.period_days,
        features:    data.features,
        status:      data.status,
      }
      return editTariff
        ? adminService.updateTariff(editTariff.id, payload)
        : adminService.createTariff(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariffs'] })
      toast.success(editTariff ? 'Yangilandi' : "Tarif qo'shildi")
      setOpen(false); setEditTariff(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: adminService.deleteTariff,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariffs'] })
      toast.success("O'chirildi")
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const formatPrice = (price: number, currencyId?: string) => {
    const cur = currencies.find(c => c.id === currencyId) ?? defaultCurrency
    if (!cur) return `${price.toLocaleString()}`
    return `${price.toLocaleString()} ${cur.symbol}`
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button icon={<Plus size={16} />} onClick={openAdd}>
          Tarif qo'shish
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : tariffs.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl py-16 text-center text-gray-500 text-sm">
          Hali tariflar qo'shilmagan
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tariffs.map((t) => (
            <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-4 hover:border-gray-700 transition-colors">
              <div className="flex items-start justify-between">
                <h3 className="text-white font-semibold text-lg">{t.name}</h3>
                <StatusBadge status={t.status} size="sm" />
              </div>
              <p className="text-3xl font-bold text-[#00ff88]">
                {formatPrice(t.price)}
                <span className="text-sm text-gray-400 font-normal"> / {t.period_days} kun</span>
              </p>
              {t.features.length > 0 && (
                <ul className="space-y-1.5 flex-1">
                  {t.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check size={14} className="text-[#00ff88] shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 mt-auto pt-2 border-t border-gray-800">
                <button onClick={() => openEdit(t)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-sm transition-colors">
                  <Pencil size={13} /> Tahrirlash
                </button>
                <button onClick={() => setDeleteId(t.id)} className="px-3 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 text-sm transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditTariff(null) }}
        title={editTariff ? 'Tarifni tahrirlash' : 'Yangi tarif yaratish'}
        size="md"
      >
        <div className="space-y-4">
          {/* Row 1: Tarif nomi + Holat */}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tarif nomi *" placeholder="masalan: Premium" error={errors.name?.message} {...register('name')} />
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-300 font-medium">Holat</label>
              <select
                {...register('status')}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition"
              >
                <option value="active">Faol</option>
                <option value="inactive">Nofaol</option>
                <option value="suspended">Bloklangan</option>
              </select>
            </div>
          </div>

          {/* Row 2: Narx (currency + amount) + Muddat */}
          <div className="grid grid-cols-[2fr_1fr] gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-300 font-medium">Narx *</label>
              <div className="flex gap-1.5">
                <select
                  {...register('currency_id')}
                  className="w-[110px] shrink-0 bg-gray-800 border border-gray-700 text-white rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition"
                >
                  {currencies.map(c => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                  {currencies.length === 0 && <option value="">UZS — So'n</option>}
                </select>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="299 000"
                  {...register('price')}
                  className="flex-1 min-w-0 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition"
                />
              </div>
              {errors.price && <p className="text-xs text-red-400">{errors.price.message}</p>}
            </div>
            <Input label="Muddat (kun) *" type="number" placeholder="30" {...register('period_days')} />
          </div>

          {/* Features checkboxes */}
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-300 font-medium">Xususiyatlar</label>
            <div className="grid grid-cols-2 gap-2 bg-gray-800/50 border border-gray-700 rounded-xl p-3">
              {ALL_FEATURES.map((f) => (
                <label key={f} className="flex items-center gap-2 cursor-pointer group">
                  <div
                    onClick={() => toggleFeature(f)}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      selectedFeatures.includes(f)
                        ? 'bg-[#00ff88] border-[#00ff88]'
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {selectedFeatures.includes(f) && <Check size={10} className="text-gray-950" />}
                  </div>
                  <span
                    onClick={() => toggleFeature(f)}
                    className={`text-sm transition-colors ${selectedFeatures.includes(f) ? 'text-white' : 'text-gray-400'}`}
                  >
                    {f}
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={selectAll}
              className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-xs transition-colors"
            >
              <Check size={11} />
              {selectedFeatures.length === ALL_FEATURES.length ? 'Barchasini olib tashlash' : 'Barchasini tanlash'}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-800">
          <Button variant="ghost" onClick={() => { setOpen(false); setEditTariff(null) }}>Bekor qilish</Button>
          <Button loading={saveMutation.isPending} onClick={handleSubmit(d => saveMutation.mutate(d))}>Saqlash</Button>
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
