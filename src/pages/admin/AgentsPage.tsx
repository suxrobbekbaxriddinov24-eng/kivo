import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin.service'
import { clubsService } from '@/services/clubs.service'
import { toast } from '@/stores/uiStore'
import { formatDate } from '@/lib/utils'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Agent } from '@/types/database'
import Button from '@/components/ui/Button'
import DataTable from '@/components/ui/DataTable'
import type { Column } from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import PhoneInput from '@/components/ui/PhoneInput'
import StatusBadge from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus, Eye, EyeOff } from 'lucide-react'

const AGENT_ROLES = [
  { value: 'sales',    label: 'Sotuv agenti' },
  { value: 'support',  label: 'Qo\'llab-quvvatlash' },
  { value: 'manager',  label: 'Menejer' },
  { value: 'recruiter',label: 'Rekruter' },
]

const SCHEDULE_OPTIONS = [
  { value: 'Har kuni',     label: 'Har kuni' },
  { value: 'Juft kunlar',  label: 'Juft kunlar' },
  { value: 'Toq kunlar',   label: 'Toq kunlar' },
  { value: 'Hafta kunlari',label: 'Hafta kunlari' },
]

const schema = z.object({
  full_name:   z.string().min(1, 'Ism kiritilishi shart'),
  phone:       z.string().min(1, 'Telefon kiritilishi shart'),
  club_id:     z.string().optional(),
  role:        z.string().optional(),
  username:    z.string().min(3, 'Username kamida 3 ta belgi').regex(/^[a-z0-9_]+$/, 'Faqat kichik harf, raqam va _'),
  password:    z.string().optional(),
  schedule:    z.string().optional(),
  status:      z.enum(['active', 'inactive', 'suspended']),
  region_id:   z.string().optional(),
  district_id: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function AgentsPage() {
  const qc = useQueryClient()
  const [open, setOpen]           = useState(false)
  const [editAgent, setEditAgent] = useState<Agent | null>(null)
  const [deleteId, setDeleteId]   = useState<string | null>(null)
  const [showPwd, setShowPwd]     = useState(false)

  const { data: agents  = [], isLoading } = useQuery({ queryKey: ['agents'],  queryFn: adminService.listAgents })
  const { data: regions = [] }            = useQuery({ queryKey: ['regions'], queryFn: adminService.listRegions })
  const { data: clubs   = [] }            = useQuery({ queryKey: ['clubs'],   queryFn: clubsService.list })

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active' },
  })

  const selectedRegion = watch('region_id')
  const { data: districts = [] } = useQuery({
    queryKey: ['districts', selectedRegion],
    queryFn: () => adminService.listDistricts(selectedRegion),
    enabled: !!selectedRegion,
  })

  const closeModal = () => { setOpen(false); setEditAgent(null); reset(); setShowPwd(false) }

  const openAdd = () => {
    reset({ full_name: '', phone: '', club_id: '', role: '', username: '', password: '', schedule: '', status: 'active', region_id: '', district_id: '' })
    setEditAgent(null)
    setShowPwd(false)
    setOpen(true)
  }

  const openEdit = (a: Agent) => {
    setEditAgent(a)
    setValue('full_name',   a.full_name)
    setValue('phone',       a.phone ?? '')
    setValue('club_id',     a.club_id ?? '')
    setValue('role',        a.role ?? '')
    setValue('username',    a.username)
    setValue('password',    '')
    setValue('schedule',    a.schedule ?? '')
    setValue('status',      a.status)
    setValue('region_id',   a.region_id ?? '')
    setValue('district_id', a.district_id ?? '')
    setShowPwd(false)
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const existingSettings = (editAgent?.settings ?? {}) as Record<string, unknown>
      const payload = {
        full_name:   data.full_name,
        phone:       data.phone || null,
        club_id:     data.club_id || null,
        role:        data.role || null,
        username:    data.username,
        schedule:    data.schedule || null,
        status:      data.status,
        region_id:   data.region_id || null,
        district_id: data.district_id || null,
        user_id:     null,
        settings: {
          ...existingSettings,
          password: data.password || existingSettings.password || null,
        },
      }
      return editAgent
        ? adminService.updateAgent(editAgent.id, payload)
        : adminService.createAgent(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] })
      toast.success(editAgent ? 'Agent yangilandi' : "Agent qo'shildi")
      closeModal()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: adminService.deleteAgent,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agents'] })
      toast.success("O'chirildi")
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const columns: Column<Agent>[] = [
    {
      header: 'Agent',
      accessor: (a) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#00ff88]/10 flex items-center justify-center text-[#00ff88] text-xs font-bold shrink-0">
            {a.full_name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-white font-medium">{a.full_name}</p>
            <p className="text-xs text-gray-400">@{a.username}</p>
          </div>
        </div>
      ),
    },
    { header: 'Telefon',  accessor: (a) => <span className="text-gray-300">{a.phone ?? '—'}</span> },
    {
      header: 'Klub / Rol',
      accessor: (a) => {
        const club = clubs.find((c) => c.id === a.club_id)
        return (
          <div>
            <p className="text-gray-300 text-sm">{club?.name ?? '—'}</p>
            {a.role && <p className="text-xs text-gray-500">{AGENT_ROLES.find((r) => r.value === a.role)?.label ?? a.role}</p>}
          </div>
        )
      },
    },
    { header: 'Jadval',       accessor: (a) => <span className="text-gray-400 text-sm">{a.schedule ?? '—'}</span> },
    { header: "Qo'shilgan",   accessor: (a) => <span className="text-gray-400 text-sm">{formatDate(a.created_at)}</span> },
    { header: 'Holat',        accessor: (a) => <StatusBadge status={a.status} /> },
  ]

  const isEdit = !!editAgent

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Agentlar</h2>
          <p className="text-sm text-gray-500 mt-0.5">Barcha agentlarni boshqaring</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={openAdd}>Yangi agent</Button>
      </div>

      <DataTable
        data={agents}
        columns={columns}
        isLoading={isLoading}
        rowKey={(a) => a.id}
        searchable
        searchPlaceholder="Agent qidirish..."
        emptyMessage="Agentlar yo'q"
        actions={(a) => (
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={() => openEdit(a)}>Tahrirlash</Button>
            <Button size="sm" variant="danger" onClick={() => setDeleteId(a.id)}>O'chirish</Button>
          </div>
        )}
      />

      {/* Modal */}
      <Modal
        open={open}
        onClose={closeModal}
        title={isEdit ? 'Agentni tahrirlash' : "Yangi agent qo'shish"}
        size="md"
      >
        <div className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ism *"
              placeholder="Aziz Aliyev"
              autoComplete="off"
              error={errors.full_name?.message}
              {...register('full_name')}
            />
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  label="Telefon *"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.phone?.message}
                />
              )}
            />
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Klub *"
              options={clubs.filter((c) => c.status === 'active').map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Tanlang..."
              {...register('club_id')}
            />
            <Select
              label="Rol *"
              options={AGENT_ROLES}
              placeholder="Tanlang..."
              {...register('role')}
            />
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Foydalanuvchi nomi *"
              placeholder="aziz"
              autoComplete="off"
              error={errors.username?.message}
              {...register('username')}
            />
            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-300 font-medium">
                {isEdit ? "Yangi parol (ixtiyoriy)" : 'Parol *'}
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder={isEdit ? "O'zgartirmaslik uchun bo'sh qoldiring" : 'aziz123'}
                  autoComplete="new-password"
                  {...register('password')}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 pr-10 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Ish jadvali"
              options={SCHEDULE_OPTIONS}
              placeholder="Tanlang..."
              {...register('schedule')}
            />
            <Select
              label="Holat"
              options={[
                { value: 'active',    label: 'Faol' },
                { value: 'inactive',  label: 'Nofaol' },
                { value: 'suspended', label: 'Bloklangan' },
              ]}
              {...register('status')}
            />
          </div>

          {/* Row 5 */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Viloyat"
              options={regions.map((r) => ({ value: r.id, label: r.name }))}
              placeholder="Tanlang..."
              {...register('region_id')}
            />
            <Select
              label="Tuman"
              options={districts.map((d) => ({ value: d.id, label: d.name }))}
              placeholder="Tanlang..."
              disabled={!selectedRegion}
              {...register('district_id')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-800">
          <Button variant="ghost" onClick={closeModal}>Bekor qilish</Button>
          <Button loading={saveMutation.isPending} onClick={handleSubmit((d) => saveMutation.mutate(d))}>
            ✓ Saqlash
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        message="Agentni o'chirishni tasdiqlaysizmi?"
      />
    </div>
  )
}
