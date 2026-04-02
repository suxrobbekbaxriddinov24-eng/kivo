import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin.service'
import { toast } from '@/stores/uiStore'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Currency } from '@/types/database'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus, Trash2, Edit2, Star } from 'lucide-react'

const schema = z.object({
  code: z.string().min(1).max(5),
  name: z.string().min(1),
  symbol: z.string().min(1),
  rate: z.coerce.number().min(0),
  is_default: z.boolean(),
})
type FormData = z.infer<typeof schema>

export default function CurrenciesPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editCurrency, setEditCurrency] = useState<Currency | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: currencies = [] } = useQuery({ queryKey: ['currencies'], queryFn: adminService.listCurrencies })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { is_default: false, rate: 1 },
  })

  const openEdit = (c: Currency) => {
    setEditCurrency(c)
    setValue('code', c.code); setValue('name', c.name); setValue('symbol', c.symbol)
    setValue('rate', c.rate); setValue('is_default', c.is_default)
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (data: FormData) =>
      editCurrency ? adminService.updateCurrency(editCurrency.id, data) : adminService.createCurrency(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['currencies'] })
      toast.success(editCurrency ? 'Yangilandi' : 'Valyuta qo\'shildi')
      reset(); setOpen(false); setEditCurrency(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: adminService.deleteCurrency,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['currencies'] })
      toast.success('O\'chirildi')
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex justify-end">
        <Button icon={<Plus size={16} />} onClick={() => { reset(); setEditCurrency(null); setOpen(true) }}>
          Valyuta qo'shish
        </Button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
        {currencies.length === 0 ? (
          <p className="text-center text-gray-500 py-10 text-sm">Valyutalar yo'q</p>
        ) : currencies.map((c) => (
          <div key={c.id} className="flex items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
              {c.symbol}
            </div>
            <div className="flex-1">
              <p className="text-white font-medium flex items-center gap-2">
                {c.code} — {c.name}
                {c.is_default && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
              </p>
              <p className="text-xs text-gray-400">1 {c.code} = {c.rate} UZS</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-white">
                <Edit2 size={15} />
              </button>
              <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-gray-400 hover:text-red-400">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setEditCurrency(null); reset() }}
        title={editCurrency ? 'Valyutani tahrirlash' : "Yangi valyuta qo'shish"} size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Bekor</Button>
            <Button loading={saveMutation.isPending} onClick={handleSubmit((d) => saveMutation.mutate(d))}>Saqlash</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Kod (masalan: USD)" error={errors.code?.message} {...register('code')} />
            <Input label="Belgi ($)" error={errors.symbol?.message} {...register('symbol')} />
          </div>
          <Input label="To'liq nomi" error={errors.name?.message} {...register('name')} />
          <Input label="Kurs (UZS ga)" type="number" error={errors.rate?.message} {...register('rate')} />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-indigo-600" {...register('is_default')} />
            <span className="text-sm text-gray-300">Asosiy valyuta</span>
          </label>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending} message="Valyutani o'chirishni tasdiqlaysizmi?" />
    </div>
  )
}
