import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clubsService } from '@/services/clubs.service'
import { adminService } from '@/services/admin.service'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Plus, Pencil, Trash2, CalendarDays, Tag, CheckCircle2, AlertCircle } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Branch } from '@/types/database'
import { toast } from '@/stores/uiStore'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const addSchema = z.object({
  name:    z.string().min(1, 'Filial nomi kiritilishi shart'),
  address: z.string().optional(),
  status:  z.enum(['active', 'inactive', 'suspended']),
})
type AddForm = z.infer<typeof addSchema>

const editSchema = z.object({
  tariff_id:        z.string().optional(),
  tariff_starts_at: z.string().optional(),
  tariff_ends_at:   z.string().optional(),
  status:           z.enum(['active', 'inactive', 'suspended']),
})
type EditForm = z.infer<typeof editSchema>

const STATUS_INFO: Record<string, { label: string; desc: string; color: string; border: string }> = {
  active:    { label: 'Faol',       desc: 'Filial faol. Barcha xizmatlar va funksiyalar mavjud.', color: 'bg-green-500/10 text-green-400', border: 'border-green-500/20' },
  inactive:  { label: 'Nofaol',    desc: 'Filial nofaol. Xizmatlar cheklangan.',                  color: 'bg-gray-500/10 text-gray-400',  border: 'border-gray-500/20' },
  suspended: { label: 'Bloklangan',desc: 'Filial bloklangan. Kirish taqiqlangan.',                color: 'bg-red-500/10 text-red-400',    border: 'border-red-500/20' },
}

export default function ClubDetailPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const qc = useQueryClient()
  const [addOpen, setAddOpen]   = useState(false)
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: club }        = useQuery({ queryKey: ['club', clubId],     queryFn: () => clubsService.get(clubId!),      enabled: !!clubId })
  const { data: branches = [] } = useQuery({ queryKey: ['branches', clubId], queryFn: () => clubsService.branches(clubId!), enabled: !!clubId })
  const { data: tariffs = [] }  = useQuery({ queryKey: ['tariffs'],           queryFn: adminService.listTariffs })

  const { register: regAdd, handleSubmit: handleAdd, reset: resetAdd, formState: { errors: addErrors } } = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: { status: 'active' },
  })

  const { register: regEdit, handleSubmit: handleEdit, reset: resetEdit, setValue: setEditVal, watch: watchEdit } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { status: 'active', tariff_starts_at: new Date().toISOString().split('T')[0] },
  })

  const editStatus = watchEdit('status')

  const addMutation = useMutation({
    mutationFn: (data: AddForm) =>
      clubsService.createBranch({ club_id: clubId!, name: data.name, address: data.address || null, phone: null, manager: null, status: data.status, tariff_id: null, tariff_name: null, tariff_starts_at: null, tariff_ends_at: null } as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches', clubId] }); toast.success("Filial qo'shildi"); resetAdd(); setAddOpen(false) },
    onError: (e: Error) => toast.error(e.message),
  })

  const editMutation = useMutation({
    mutationFn: (data: EditForm) => {
      const tariff = tariffs.find(t => t.id === data.tariff_id)
      return clubsService.updateBranch(editBranch!.id, {
        status:           data.status,
        tariff_id:        data.tariff_id || null,
        tariff_name:      tariff?.name || null,
        tariff_starts_at: data.tariff_starts_at || null,
        tariff_ends_at:   data.tariff_ends_at || null,
      } as any)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches', clubId] }); toast.success('Filial yangilandi'); setEditBranch(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clubsService.deleteBranch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches', clubId] }); toast.success("Filial o'chirildi"); setDeleteId(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const openEdit = (b: Branch) => {
    setEditBranch(b)
    setEditVal('status', b.status)
    setEditVal('tariff_id', b.tariff_id ?? '')
    setEditVal('tariff_starts_at', b.tariff_starts_at?.split('T')[0] ?? new Date().toISOString().split('T')[0])
    setEditVal('tariff_ends_at', b.tariff_ends_at?.split('T')[0] ?? '')
  }

  if (!club) return null

  const si = STATUS_INFO[editStatus] ?? STATUS_INFO.active

  return (
    <div className="space-y-5">
      <Link to="/admin/clubs" className="inline-flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors">
        <ArrowLeft size={15} /> Klublar
      </Link>

      {/* Club info card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{club.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">ID: {club.slug ?? club.id.slice(0, 8)}</p>
          </div>
          <StatusBadge status={club.status} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          {[
            ['Rahbar',   club.director_name],
            ['Telefon',  club.phone],
            ['Login',    club.slug],
            ["Qo'shilgan", formatDate(club.created_at)],
          ].map(([label, value]) => (
            <div key={label!}>
              <p className="text-gray-500 text-xs">{label}</p>
              <p className="text-white font-medium mt-0.5">{value ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Branches */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold">Filiallar <span className="text-gray-600 font-normal text-sm">({branches.length})</span></h3>
          <Button size="sm" icon={<Plus size={13} />} onClick={() => { resetAdd(); setAddOpen(true) }}>
            Filial qo'shish
          </Button>
        </div>

        {branches.length === 0 ? (
          <div className="py-14 text-center text-gray-600 text-sm">Filiallar yo'q</div>
        ) : (
          <div className="divide-y divide-gray-800">
            {branches.map((b) => (
              <div key={b.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold">{b.name}</p>
                    <StatusBadge status={b.status} size="sm" />
                  </div>
                  {b.address && <p className="text-xs text-gray-500">{b.address}</p>}
                  <div className="flex items-center gap-4 mt-1">
                    {b.tariff_name && (
                      <span className="flex items-center gap-1 text-xs text-[#00ff88]">
                        <Tag size={11} /> {b.tariff_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <CalendarDays size={11} /> {formatDate(b.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => openEdit(b)} className="p-1.5 text-gray-500 hover:text-[#00ff88] hover:bg-gray-800 rounded-lg transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleteId(b.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add branch modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); resetAdd() }} title="Yangi filial qo'shish" size="sm">
        <div className="space-y-3">
          <Input label="Filial nomi *" placeholder="masalan: Markaziy filial" error={addErrors.name?.message} {...regAdd('name')} />
          <Input label="Manzil" placeholder="Toshkent sh., Chilonzor..." {...regAdd('address')} />
          <Select
            label="Holat"
            options={[
              { value: 'active',    label: 'Faol' },
              { value: 'inactive',  label: 'Nofaol' },
              { value: 'suspended', label: 'Bloklangan' },
            ]}
            {...regAdd('status')}
          />
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-800">
          <Button variant="ghost" onClick={() => { setAddOpen(false); resetAdd() }}>Bekor</Button>
          <Button loading={addMutation.isPending} onClick={handleAdd(d => addMutation.mutate(d))}>Saqlash</Button>
        </div>
      </Modal>

      {/* Edit branch modal */}
      <Modal open={!!editBranch} onClose={() => setEditBranch(null)} title="Filial Tahrirlash" size="md">
        {editBranch && (
          <>
            <p className="text-xs text-gray-500 -mt-1 mb-4">ID: {editBranch.id.slice(0, 6).toUpperCase()}</p>

            {/* Joriy holat */}
            <div className={`rounded-xl border p-4 mb-5 ${si.border} ${si.color}`}>
              <div className="flex items-center justify-between">
                <p className="font-semibold">Joriy Holat</p>
                <span className="text-xs font-medium">● {si.label}</span>
              </div>
              <p className="text-xs mt-1 opacity-80">{si.desc}</p>
            </div>

            {/* Tarif section */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
              <p className="text-white font-semibold text-sm">Tarif va Muddatni Yangilash</p>
              <Select
                label="Tarif rejasi"
                options={tariffs.map(t => ({ value: t.id, label: `${t.name}` }))}
                placeholder="Tanlang..."
                {...regEdit('tariff_id')}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-300 font-medium">Boshlanish sanasi</label>
                  <input type="date" {...regEdit('tariff_starts_at')}
                    className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-gray-300 font-medium">Tugash sanasi</label>
                  <input type="date" {...regEdit('tariff_ends_at')}
                    className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition" />
                </div>
              </div>
            </div>

            {/* Eslatma */}
            <div className="mt-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 flex gap-2">
              <AlertCircle size={15} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-400 font-medium">Eslatma</p>
                <p className="text-xs text-blue-300/70 mt-0.5">Tarif o'zgartirilganda yangi imkoniyatlar darhol kuchga kiradi. To'lov tarixi avtomatik ravishda hisobotlarda aks etadi.</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-5 pt-4 border-t border-gray-800">
              <button
                onClick={() => { setEditVal('status', 'suspended'); editMutation.mutate({ ...watchEdit(), status: 'suspended' }) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
              >
                Filialni bloklash
              </button>
              <Button
                className="flex-1"
                loading={editMutation.isPending}
                icon={<CheckCircle2 size={15} />}
                onClick={handleEdit(d => editMutation.mutate(d))}
              >
                Tasdiqlash va faollashtirish
              </Button>
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
        message="Filialni o'chirishni tasdiqlaysizmi?"
      />
    </div>
  )
}
