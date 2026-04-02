import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { clubsService } from '@/services/clubs.service'
import { adminService } from '@/services/admin.service'
import { toast } from '@/stores/uiStore'
import { formatDate } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Club } from '@/types/database'
import Button from '@/components/ui/Button'
import DataTable from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import StatusBadge from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus } from 'lucide-react'
import { UZ_REGIONS } from '@/lib/constants'

const schema = z.object({
  name: z.string().min(1, 'Klub nomi kiritilishi shart'),
  director_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  region_id: z.string().optional(),
  tariff_id: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']),
})
type FormData = z.infer<typeof schema>

export default function ClubsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [editClub, setEditClub] = useState<Club | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: clubs = [], isLoading } = useQuery({ queryKey: ['clubs'], queryFn: clubsService.list })
  const { data: tariffs = [] } = useQuery({ queryKey: ['tariffs'], queryFn: adminService.listTariffs })
  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: adminService.listRegions })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active' },
  })

  const openEdit = (c: Club) => {
    setEditClub(c)
    setValue('name', c.name)
    setValue('director_name', c.director_name ?? '')
    setValue('phone', c.phone ?? '')
    setValue('email', c.email ?? '')
    setValue('address', c.address ?? '')
    setValue('region_id', c.region_id ?? '')
    setValue('tariff_id', c.tariff_id ?? '')
    setValue('status', c.status)
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        name: data.name,
        director_name: data.director_name || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        region_id: data.region_id || null,
        tariff_id: data.tariff_id || null,
        status: data.status,
        settings: { currency: 'UZS', timezone: 'Asia/Tashkent', discounts: { m1: 0, m3: 10, m6: 15, m12: 25 }, locker_count: 50 },
        slug: null, district_id: null, tariff_expires_at: null, logo_url: null,
      }
      return editClub ? clubsService.update(editClub.id, payload) : clubsService.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clubs'] })
      toast.success(editClub ? 'Klub yangilandi' : 'Klub qo\'shildi')
      reset()
      setOpen(false)
      setEditClub(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clubsService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clubs'] })
      toast.success('O\'chirildi')
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const columns: Column<Club>[] = [
    {
      header: 'Klub',
      accessor: (c) => (
        <div>
          <p className="text-white font-medium">{c.name}</p>
          <p className="text-xs text-gray-400">{c.director_name ?? '—'}</p>
        </div>
      ),
    },
    { header: 'Telefon', accessor: (c) => <span className="text-gray-300">{c.phone ?? '—'}</span> },
    { header: 'Viloyat', accessor: (c) => <span className="text-gray-400">{c.region_id ?? '—'}</span> },
    { header: "Qo'shilgan", accessor: (c) => <span className="text-gray-400">{formatDate(c.created_at)}</span> },
    { header: 'Holat', accessor: (c) => <StatusBadge status={c.status} /> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button icon={<Plus size={16} />} onClick={() => { reset(); setEditClub(null); setOpen(true) }}>
          Klub qo'shish
        </Button>
      </div>

      <DataTable
        data={clubs}
        columns={columns}
        isLoading={isLoading}
        rowKey={(c) => c.id}
        onRowClick={(c) => navigate(`/admin/clubs/${c.id}`)}
        searchable
        searchPlaceholder="Klub qidirish..."
        emptyMessage="Klublar yo'q"
        actions={(c) => (
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); openEdit(c) }}>Tahrirlash</Button>
            <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setDeleteId(c.id) }}>O'chirish</Button>
          </div>
        )}
      />

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditClub(null); reset() }}
        title={editClub ? 'Klubni tahrirlash' : "Yangi klub qo'shish"}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Bekor</Button>
            <Button loading={saveMutation.isPending} onClick={handleSubmit((d) => saveMutation.mutate(d))}>Saqlash</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Klub nomi *" error={errors.name?.message} {...register('name')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Rahbar ismi" {...register('director_name')} />
            <Input label="Telefon" {...register('phone')} />
          </div>
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Manzil" {...register('address')} />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Viloyat"
              options={regions.map((r) => ({ value: r.id, label: r.name }))}
              placeholder="Tanlang"
              {...register('region_id')}
            />
            <Select
              label="Tarif"
              options={tariffs.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="Tanlang"
              {...register('tariff_id')}
            />
          </div>
          <Select
            label="Holat"
            options={[
              { value: 'active', label: 'Faol' },
              { value: 'inactive', label: 'Nofaol' },
              { value: 'suspended', label: 'Bloklangan' },
            ]}
            {...register('status')}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        message="Klubni o'chirishni tasdiqlaysizmi? Barcha ma'lumotlar yo'qoladi."
      />
    </div>
  )
}
