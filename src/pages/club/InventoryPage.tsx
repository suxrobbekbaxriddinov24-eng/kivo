import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { productsService } from '@/services/products.service'
import { toast } from '@/stores/uiStore'
import { formatCurrency } from '@/lib/utils'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Product } from '@/types/database'
import Button from '@/components/ui/Button'
import DataTable from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import StatusBadge from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import StatCard from '@/components/ui/StatCard'
import CameraModal from '@/components/ui/CameraModal'
import { Plus, Package, AlertTriangle, DollarSign, Upload, Camera } from 'lucide-react'

const schema = z.object({
  name:           z.string().min(1, 'Nom kiritilishi shart'),
  category_name:  z.string().optional(),
  sell_price:     z.coerce.number().min(0, "Narx 0 dan katta bo'lishi kerak"),
  purchase_price: z.coerce.number().min(0),
  quantity:       z.coerce.number().min(0),
  low_stock_alert:z.coerce.number().min(0),
  barcode:        z.string().optional(),
  unit:           z.string().optional(),
})
type FormData = z.infer<typeof schema>

const UNITS = ['Dona', 'Kg', 'Litr', 'Paket', 'Quti', 'Metr']

function PriceField({ value, onChange, placeholder }: { value: number | string; onChange: (v: number) => void; placeholder?: string }) {
  const display = value !== '' && value !== 0
    ? String(Math.round(Number(value))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    : ''
  return (
    <div className="relative flex items-center">
      <input
        type="text"
        inputMode="numeric"
        value={display}
        placeholder={placeholder ?? '0'}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '')
          onChange(raw ? Number(raw) : 0)
        }}
        className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-lg px-3 py-2.5 pr-14 text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition"
      />
      <span className="absolute right-3 text-gray-500 text-xs pointer-events-none">so'm</span>
    </div>
  )
}

export default function InventoryPage() {
  const { profile } = useAuthStore()
  const clubId = profile?.club_id!
  const qc = useQueryClient()

  const [open, setOpen]               = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteId, setDeleteId]       = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', clubId],
    queryFn: () => productsService.list(clubId),
    enabled: !!clubId,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['product_categories', clubId],
    queryFn: () => productsService.listCategories(clubId),
    enabled: !!clubId,
  })

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { low_stock_alert: 10, quantity: 0, purchase_price: 0, unit: 'Dona' },
  })

  const openAdd = () => {
    reset({ low_stock_alert: 10, quantity: 0, purchase_price: 0, unit: 'Dona' })
    setEditProduct(null)
    setPhotoPreview(null)
    setOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditProduct(p)
    setValue('name', p.name)
    setValue('category_name', p.category?.name ?? '')
    setValue('sell_price', p.sell_price)
    setValue('purchase_price', p.purchase_price)
    setValue('quantity', p.quantity)
    setValue('low_stock_alert', p.low_stock_alert)
    setValue('barcode', p.barcode ?? '')
    setValue('unit', 'Dona')
    setPhotoPreview(p.image_url ?? null)
    setOpen(true)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
  }

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Create category if new name provided
      let categoryId = editProduct?.category_id ?? null
      if (data.category_name?.trim()) {
        const existing = categories.find((c: { id: string; name: string }) =>
          c.name.toLowerCase() === data.category_name!.trim().toLowerCase()
        )
        if (existing) {
          categoryId = existing.id
        } else {
          const newCat = await productsService.createCategory(clubId, data.category_name.trim())
          categoryId = newCat.id
        }
      }

      const payload = {
        club_id:         clubId,
        name:            data.name,
        category_id:     categoryId,
        sell_price:      data.sell_price,
        purchase_price:  data.purchase_price,
        quantity:        data.quantity,
        low_stock_alert: data.low_stock_alert,
        barcode:         data.barcode || null,
        image_url:       null,
        status:          'active' as const,
      }
      return editProduct
        ? productsService.update(editProduct.id, payload)
        : productsService.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', clubId] })
      qc.invalidateQueries({ queryKey: ['product_categories', clubId] })
      toast.success(editProduct ? 'Yangilandi' : "Mahsulot qo'shildi")
      reset()
      setOpen(false)
      setEditProduct(null)
      setPhotoPreview(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', clubId] })
      toast.success("O'chirildi")
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const lowStock  = products.filter((p) => p.quantity > 0 && p.quantity <= p.low_stock_alert)
  const outOfStock = products.filter((p) => p.quantity === 0)
  const totalValue = products.reduce((s: number, p: Product) => s + p.sell_price * p.quantity, 0)

  const stockStatus = (p: Product): string => {
    if (p.quantity === 0) return 'out'
    if (p.quantity <= p.low_stock_alert) return 'low'
    return 'ok'
  }

  const columns: Column<Product>[] = [
    {
      header: 'Mahsulot',
      accessor: (p) => (
        <div className="flex items-center gap-3">
          {p.image_url ? (
            <img src={p.image_url} className="w-8 h-8 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center shrink-0">
              <Package size={14} className="text-gray-500" />
            </div>
          )}
          <div>
            <p className="text-white font-medium">{p.name}</p>
            <p className="text-xs text-gray-400">{p.category?.name ?? '—'}</p>
          </div>
        </div>
      ),
    },
    { header: 'Sotish narxi', accessor: (p) => <span className="text-white">{formatCurrency(p.sell_price)}</span> },
    { header: 'Xarid narxi',  accessor: (p) => <span className="text-gray-400">{formatCurrency(p.purchase_price)}</span> },
    {
      header: 'Miqdor',
      accessor: (p) => (
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${p.quantity === 0 ? 'text-red-400' : p.quantity <= p.low_stock_alert ? 'text-yellow-400' : 'text-white'}`}>
            {p.quantity}
          </span>
          <StatusBadge status={stockStatus(p)} size="sm" />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Jami mahsulotlar" value={products.length}           icon={<Package size={18} />}       color="brand"  />
        <StatCard title="Ombor qiymati"     value={formatCurrency(totalValue)} icon={<DollarSign size={18} />}    color="green"  />
        <StatCard title="Kam qolgan"         value={lowStock.length}            icon={<AlertTriangle size={18} />} color="yellow" />
        <StatCard title="Tugagan"            value={outOfStock.length}          icon={<AlertTriangle size={18} />} color="red"    />
      </div>

      <div className="flex justify-end">
        <Button icon={<Plus size={16} />} onClick={openAdd}>Mahsulot qo'shish</Button>
      </div>

      <DataTable
        data={products}
        columns={columns}
        isLoading={isLoading}
        rowKey={(p) => p.id}
        searchable
        searchPlaceholder="Mahsulot qidirish..."
        emptyMessage="Mahsulotlar yo'q"
        actions={(p) => (
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => openEdit(p)}>Tahrirlash</Button>
            <Button size="sm" variant="danger"  onClick={() => setDeleteId(p.id)}>O'chirish</Button>
          </div>
        )}
      />

      {/* ── Product modal ── */}
      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditProduct(null); reset(); setPhotoPreview(null) }}
        title={editProduct ? 'Mahsulotni tahrirlash' : "Mahsulot qo'shish"}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button
              icon={<Package size={15} />}
              loading={saveMutation.isPending}
              onClick={handleSubmit((d) => saveMutation.mutate(d))}
            >
              Saqlash
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Photo */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              Mahsulot rasmi
            </label>
            <div className="flex gap-3 mb-3">
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1a1f2e] border border-gray-700 hover:border-[#00ff88]/50 text-white text-sm rounded-lg transition-colors">
                <Upload size={15} className="text-yellow-400" /> Fayldan yuklash
              </button>
              <button type="button" onClick={() => setCameraOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1a1f2e] border border-gray-700 hover:border-[#00ff88]/50 text-white text-sm rounded-lg transition-colors">
                <Camera size={15} className="text-yellow-400" /> Kamera orqali
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-gray-700 hover:border-[#00ff88]/40 transition-colors cursor-pointer overflow-hidden"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="w-full h-36 object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Camera size={28} className="text-gray-600" />
                  <p className="text-gray-500 text-sm">Rasm yuklash uchun bosing</p>
                  <p className="text-gray-600 text-xs">PNG, JPG, WEBP — max 5MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Name + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Mahsulot nomi *</label>
              <input {...register('name')} placeholder="Masalan: Protein Bar"
                className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition" />
              {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Kategoriya</label>
              <input {...register('category_name')}
                placeholder="Masalan: Ichimliqlar (yangi yaratir)"
                list="cat-list"
                className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition" />
              <datalist id="cat-list">
                {categories.map((c: { id: string; name: string }) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Barcode + Quantity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Shtrix-kod (ixtiyoriy)</label>
              <input {...register('barcode')} placeholder="Masalan: 4680012345678"
                className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Mahsulot miqdori *</label>
              <input {...register('quantity')} type="number" min={0} placeholder="0"
                className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition" />
            </div>
          </div>

          {/* Unit + Purchase price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">O'lchov birligi</label>
              <select {...register('unit')}
                className="w-full bg-[#1a1f2e] border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#00ff88] transition appearance-none">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Sotib olingan narxi (UZS) *</label>
              <Controller name="purchase_price" control={control} render={({ field }) => (
                <PriceField value={field.value} onChange={field.onChange} placeholder="0" />
              )} />
            </div>
          </div>

          {/* Sell price */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Sotish narxi (UZS) *</label>
            <Controller name="sell_price" control={control} render={({ field }) => (
              <PriceField value={field.value} onChange={field.onChange} placeholder="0" />
            )} />
            {errors.sell_price && <p className="text-xs text-red-400 mt-1">{errors.sell_price.message}</p>}
          </div>
        </div>
      </Modal>

      <CameraModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(dataUrl) => setPhotoPreview(dataUrl)}
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        message="Mahsulotni o'chirishni tasdiqlaysizmi?"
      />
    </div>
  )
}
