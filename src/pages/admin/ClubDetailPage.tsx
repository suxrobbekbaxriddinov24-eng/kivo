import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clubsService } from '@/services/clubs.service'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Plus } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Branch } from '@/types/database'
import { toast } from '@/stores/uiStore'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const schema = z.object({
  name: z.string().min(1, 'Filial nomi kiritilishi shart'),
  address: z.string().optional(),
  phone: z.string().optional(),
  manager: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function ClubDetailPage() {
  const { clubId } = useParams<{ clubId: string }>()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editBranch, setEditBranch] = useState<Branch | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: () => clubsService.get(clubId!),
    enabled: !!clubId,
  })

  const { data: branches = [] } = useQuery({
    queryKey: ['branches', clubId],
    queryFn: () => clubsService.branches(clubId!),
    enabled: !!clubId,
  })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = { club_id: clubId!, name: data.name, address: data.address || null, phone: data.phone || null, manager: data.manager || null, status: 'active' as const }
      return editBranch ? clubsService.updateBranch(editBranch.id, payload) : clubsService.createBranch(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches', clubId] })
      toast.success(editBranch ? 'Filial yangilandi' : 'Filial qo\'shildi')
      reset(); setOpen(false); setEditBranch(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clubsService.deleteBranch(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches', clubId] })
      toast.success('Filial o\'chirildi')
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!club) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/admin/clubs" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm">
        <ArrowLeft size={16} /> Klublar
      </Link>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{club.name}</h2>
            <p className="text-gray-400 mt-1">{club.director_name ?? '—'} · {club.phone ?? '—'}</p>
          </div>
          <StatusBadge status={club.status} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 text-sm">
          {[
            ['Email', club.email],
            ['Manzil', club.address],
            ["Qo'shilgan", formatDate(club.created_at)],
          ].map(([label, value]) => (
            <div key={label!}>
              <p className="text-gray-400">{label}</p>
              <p className="text-white mt-0.5">{value ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Branches */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-white font-semibold">Filiallar ({branches.length})</h3>
          <Button size="sm" icon={<Plus size={14} />} onClick={() => { reset(); setEditBranch(null); setOpen(true) }}>
            Filial qo'shish
          </Button>
        </div>
        {branches.length === 0 ? (
          <p className="text-center text-gray-500 py-10 text-sm">Filiallar yo'q</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {branches.map((b) => (
              <div key={b.id} className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{b.name}</p>
                  <p className="text-xs text-gray-400">{b.address ?? '—'} · {b.manager ?? '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={b.status} size="sm" />
                  <Button size="sm" variant="outline" onClick={() => { setEditBranch(b); setValue('name', b.name); setValue('address', b.address ?? ''); setValue('phone', b.phone ?? ''); setValue('manager', b.manager ?? ''); setOpen(true) }}>
                    Tahrirlash
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleteId(b.id)}>O'chirish</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => { setOpen(false); setEditBranch(null); reset() }}
        title={editBranch ? 'Filialni tahrirlash' : "Yangi filial qo'shish"} size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Bekor</Button>
            <Button loading={saveMutation.isPending} onClick={handleSubmit((d) => saveMutation.mutate(d))}>Saqlash</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input label="Nomi *" error={errors.name?.message} {...register('name')} />
          <Input label="Manzil" {...register('address')} />
          <Input label="Telefon" {...register('phone')} />
          <Input label="Boshqaruvchi" {...register('manager')} />
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending} message="Filialni o'chirishni tasdiqlaysizmi?" />
    </div>
  )
}
