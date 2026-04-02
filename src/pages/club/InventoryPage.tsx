import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { productsService } from '@/services/products.service'
import { toast } from '@/stores/uiStore'
import { formatCurrency } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Product } from '@/types/database'
import Button from '@/components/ui/Button'
import DataTable from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import StatusBadge from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import StatCard from '@/components/ui/StatCard'
import { Plus, Package, AlertTriangle, DollarSign } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Nom kiritilishi shart'),
  category_id: z.string().optional(),
  sell_price: z.coerce.number().min(0, 'Narx 0 dan katta bo\'lishi kerak'),
  purchase_price: z.coerce.number().min(0),
  quantity: z.coerce.number().min(0),
  low_stock_alert: z.coerce.number().min(0),
  barcode: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function InventoryPage() {
  const { profile } = useAuthStore()
  const clubId = profile?.club_id!
  const qc = useQueryClient()

  const [open, setOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

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

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { low_stock_alert: 10, quantity: 0, purchase_price: 0 },
  })

  const openEdit = (p: Product) => {
    setEditProduct(p)
    setValue('name', p.name)
    setValue('category_id', p.category_id ?? '')
    setValue('sell_price', p.sell_price)
    setValue('purchase_price', p.purchase_price)
    setValue('quantity', p.quantity)
    setValue('low_stock_alert', p.low_stock_alert)
    setValue('barcode', p.barcode ?? '')
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        club_id: clubId,
        name: data.name,
        category_id: data.category_id || null,
        sell_price: data.sell_price,
        purchase_price: data.purchase_price,
        quantity: data.quantity,
        low_stock_alert: data.low_stock_alert,
        barcode: data.barcode || null,
        image_url: null,
        status: 'active' as const,
      }
      return editProduct
        ? productsService.update(editProduct.id, payload)
        : productsService.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', clubId] })
      toast.success(editProduct ? 'Yangilandi' : 'Mahsulot qo\'shildi')
      reset()
      setOpen(false)
      setEditProduct(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', clubId] })
      toast.success('O\'chirildi')
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= p.low_stock_alert)
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
        <div>
          <p className="text-white font-medium">{p.name}</p>
          <p className="text-xs text-gray-400">{p.category?.name ?? '—'}</p>
        </div>
      ),
    },
    { header: 'Sotish narxi', accessor: (p) => <span className="text-white">{formatCurrency(p.sell_price)}</span> },
    { header: 'Xarid narxi', accessor: (p) => <span className="text-gray-400">{formatCurrency(p.purchase_price)}</span> },
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
        <StatCard title="Jami mahsulotlar" value={products.length} icon={<Package size={18} />} color="indigo" />
        <StatCard title="Ombor qiymati" value={formatCurrency(totalValue)} icon={<DollarSign size={18} />} color="green" />
        <StatCard title="Kam qolgan" value={lowStock.length} icon={<AlertTriangle size={18} />} color="yellow" />
        <StatCard title="Tugagan" value={outOfStock.length} icon={<AlertTriangle size={18} />} color="red" />
      </div>

      <div className="flex justify-end">
        <Button icon={<Plus size={16} />} onClick={() => { reset(); setEditProduct(null); setOpen(true) }}>
          Mahsulot qo'shish
        </Button>
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
            <Button size="sm" variant="danger" onClick={() => setDeleteId(p.id)}>O'chirish</Button>
          </div>
        )}
      />

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditProduct(null); reset() }}
        title={editProduct ? 'Mahsulotni tahrirlash' : "Yangi mahsulot qo'shish"}
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
          <Select
            label="Kategoriya"
            options={categories.map((c: { id: string; name: string }) => ({ value: c.id, label: c.name }))}
            placeholder="Tanlang"
            {...register('category_id')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Sotish narxi *" type="number" suffix="so'm" error={errors.sell_price?.message} {...register('sell_price')} />
            <Input label="Xarid narxi" type="number" suffix="so'm" {...register('purchase_price')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Miqdor" type="number" {...register('quantity')} />
            <Input label="Ogohlantirish (minimum)" type="number" {...register('low_stock_alert')} />
          </div>
          <Input label="Shtrix-kod" {...register('barcode')} />
        </div>
      </Modal>

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
