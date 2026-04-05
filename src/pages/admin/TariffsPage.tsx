import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin.service'
import { toast } from '@/stores/uiStore'
import { formatCurrency } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { PlatformTariff } from '@/types/database'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import StatusBadge from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus, Check } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().min(0),
  period_days: z.coerce.number().min(1),
  features: z.string(), // comma separated
  status: z.enum(['active', 'inactive', 'suspended']),
})
type FormData = z.infer<typeof schema>

export default function TariffsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editTariff, setEditTariff] = useState<PlatformTariff | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: tariffs = [], isLoading } = useQuery({ queryKey: ['tariffs'], queryFn: adminService.listTariffs })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { status: 'active', period_days: 30, features: '' },
  })

  const openEdit = (t: PlatformTariff) => {
    setEditTariff(t)
    setValue('name', t.name)
    setValue('price', t.price)
    setValue('period_days', t.period_days)
    setValue('features', t.features.join(', '))
    setValue('status', t.status)
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        name: data.name,
        price: data.price,
        period_days: data.period_days,
        features: data.features.split(',').map((s) => s.trim()).filter(Boolean),
        status: data.status,
      }
      return editTariff ? adminService.updateTariff(editTariff.id, payload) : adminService.createTariff(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariffs'] })
      toast.success(editTariff ? 'Yangilandi' : 'Tarif qo\'shildi')
      reset(); setOpen(false); setEditTariff(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: adminService.deleteTariff,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tariffs'] })
      toast.success('O\'chirildi')
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button icon={<Plus size={16} />} onClick={() => { reset(); setEditTariff(null); setOpen(true) }}>
          Tarif qo'shish
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tariffs.map((t) => (
            <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between">
                <h3 className="text-white font-semibold text-lg">{t.name}</h3>
                <StatusBadge status={t.status} size="sm" />
              </div>
              <p className="text-3xl font-bold text-[#00ff88]">{formatCurrency(t.price)}<span className="text-sm text-gray-400 font-normal"> / {t.period_days} kun</span></p>
              {t.features.length > 0 && (
                <ul className="space-y-1.5">
                  {t.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check size={14} className="text-[#00ff88] shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 mt-auto">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(t)}>Tahrirlash</Button>
                <Button size="sm" variant="danger" onClick={() => setDeleteId(t.id)}>O'chirish</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => { setOpen(false); setEditTariff(null); reset() }}
        title={editTariff ? 'Tarifni tahrirlash' : "Yangi tarif qo'shish"} size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Bekor</Button>
            <Button loading={saveMutation.isPending} onClick={handleSubmit((d) => saveMutation.mutate(d))}>Saqlash</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Nomi *" error={errors.name?.message} {...register('name')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Narxi *" type="number" error={errors.price?.message} {...register('price')} />
            <Input label="Kun soni" type="number" {...register('period_days')} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300 font-medium">Xususiyatlar (vergul bilan)</label>
            <textarea className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00ff88] resize-none" rows={3} placeholder="CRM, Hisobotlar, Filiallar..." {...register('features')} />
          </div>
          <Select label="Holat" options={[{ value: 'active', label: 'Faol' }, { value: 'inactive', label: 'Nofaol' }]} {...register('status')} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending} message="Tarifni o'chirishni tasdiqlaysizmi?" />
    </div>
  )
}
