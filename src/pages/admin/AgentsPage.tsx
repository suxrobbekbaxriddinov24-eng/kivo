import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin.service'
import { toast } from '@/stores/uiStore'
import { formatDate } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Agent } from '@/types/database'
import Button from '@/components/ui/Button'
import DataTable from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import StatusBadge from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus } from 'lucide-react'

const schema = z.object({
  full_name: z.string().min(1),
  phone: z.string().optional(),
  username: z.string().min(3),
  schedule: z.string().optional(),
  region_id: z.string().optional(),
  status: z.enum(['active', 'inactive', 'suspended']),
})
type FormData = z.infer<typeof schema>

export default function AgentsPage() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editAgent, setEditAgent] = useState<Agent | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: agents = [], isLoading } = useQuery({ queryKey: ['agents'], queryFn: adminService.listAgents })
  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: adminService.listRegions })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active' },
  })

  const openEdit = (a: Agent) => {
    setEditAgent(a)
    setValue('full_name', a.full_name)
    setValue('phone', a.phone ?? '')
    setValue('username', a.username)
    setValue('schedule', a.schedule ?? '')
    setValue('region_id', a.region_id ?? '')
    setValue('status', a.status)
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { ...data, phone: data.phone || null, schedule: data.schedule || null, region_id: data.region_id || null, district_id: null, user_id: null }
      return editAgent ? adminService.updateAgent(editAgent.id, payload) : adminService.createAgent(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] })
      toast.success(editAgent ? 'Agent yangilandi' : 'Agent qo\'shildi')
      reset(); setOpen(false); setEditAgent(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: adminService.deleteAgent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] })
      toast.success('O\'chirildi')
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const columns: Column<Agent>[] = [
    {
      header: 'Agent',
      accessor: (a) => (
        <div>
          <p className="text-white font-medium">{a.full_name}</p>
          <p className="text-xs text-gray-400">@{a.username}</p>
        </div>
      ),
    },
    { header: 'Telefon', accessor: (a) => <span className="text-gray-300">{a.phone ?? '—'}</span> },
    { header: 'Jadval', accessor: (a) => <span className="text-gray-400">{a.schedule ?? '—'}</span> },
    { header: "Qo'shilgan", accessor: (a) => <span className="text-gray-400">{formatDate(a.created_at)}</span> },
    { header: 'Holat', accessor: (a) => <StatusBadge status={a.status} /> },
  ]

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button icon={<Plus size={16} />} onClick={() => { reset(); setEditAgent(null); setOpen(true) }}>
          Agent qo'shish
        </Button>
      </div>

      <DataTable data={agents} columns={columns} isLoading={isLoading} rowKey={(a) => a.id}
        searchable searchPlaceholder="Agent qidirish..." emptyMessage="Agentlar yo'q"
        actions={(a) => (
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => openEdit(a)}>Tahrirlash</Button>
            <Button size="sm" variant="danger" onClick={() => setDeleteId(a.id)}>O'chirish</Button>
          </div>
        )}
      />

      <Modal open={open} onClose={() => { setOpen(false); setEditAgent(null); reset() }}
        title={editAgent ? 'Agentni tahrirlash' : "Yangi agent qo'shish"} size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Bekor</Button>
            <Button loading={saveMutation.isPending} onClick={handleSubmit((d) => saveMutation.mutate(d))}>Saqlash</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Ism Familiya *" error={errors.full_name?.message} {...register('full_name')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Telefon" {...register('phone')} />
            <Input label="Username *" error={errors.username?.message} {...register('username')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Viloyat" options={regions.map((r) => ({ value: r.id, label: r.name }))} placeholder="Tanlang" {...register('region_id')} />
            <Input label="Jadval" placeholder="Juft kunlar" {...register('schedule')} />
          </div>
          <Select label="Holat" options={[{ value: 'active', label: 'Faol' }, { value: 'inactive', label: 'Nofaol' }]} {...register('status')} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending} message="Agentni o'chirishni tasdiqlaysizmi?" />
    </div>
  )
}
