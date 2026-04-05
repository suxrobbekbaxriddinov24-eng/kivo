import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { clubsService } from '@/services/clubs.service'
import { adminService } from '@/services/admin.service'
import { supabase } from '@/lib/supabase'
import { toast } from '@/stores/uiStore'
import { formatDate } from '@/lib/utils'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Club } from '@/types/database'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import PhoneInput from '@/components/ui/PhoneInput'
import StatusBadge from '@/components/ui/StatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus, Pencil, Trash2, Eye, EyeOff, Search } from 'lucide-react'
import { UZ_REGIONS } from '@/lib/constants'

const AVATAR_COLORS = ['#00ff88','#4a9eff','#ff9500','#9d5cff','#ff5c5c','#00d4ff','#ffd700','#ff6b9d']

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const schema = z.object({
  name:          z.string().min(1, 'Klub nomi kiritilishi shart'),
  director_name: z.string().min(1, 'Rahbar F.I.O kiritilishi shart'),
  login_id:      z.string().min(2, 'Klub ID kamida 2 ta belgi').regex(/^[a-z0-9_]+$/, 'Faqat kichik harf, raqam va _'),
  phone:         z.string().optional(),
  password:      z.string().optional(),
  region_id:     z.string().optional(),
  status:        z.enum(['active', 'inactive', 'suspended']),
})
type FormData = z.infer<typeof schema>

export default function ClubsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [editClub, setEditClub] = useState<Club | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState<string | null>(null)

  const { data: clubs = [], isLoading } = useQuery({ queryKey: ['clubs'], queryFn: clubsService.list })
  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: adminService.listRegions })
  const { data: allBranches = [] } = useQuery({ queryKey: ['all-branches'], queryFn: () => (supabase as any).from('branches').select('id,club_id').then(({ data }: any) => data ?? []) })

  const { register, handleSubmit, reset, setValue, control, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'active' },
  })

  const filtered = clubs.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.director_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const openAdd = () => {
    reset({ name: '', director_name: '', login_id: '', phone: '', password: '', region_id: '', status: 'active' })
    setEditClub(null)
    setShowPassword(false)
    setCurrentPassword(null)
    setOpen(true)
  }

  const openEdit = (c: Club) => {
    setEditClub(c)
    setValue('name', c.name)
    setValue('director_name', c.director_name ?? '')
    setValue('login_id', c.slug ?? '')
    setValue('phone', c.phone ?? '')
    setValue('region_id', c.region_id ?? '')
    setValue('status', c.status)
    setValue('password', '')
    setShowPassword(false)
    // Try to retrieve stored password from settings
    const stored = (c.settings as any)?.director_password ?? null
    setCurrentPassword(stored)
    setOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const baseSettings = editClub?.settings ?? { currency: 'UZS', timezone: 'Asia/Tashkent', discounts: { m1: 0, m3: 10, m6: 15, m12: 25 }, locker_count: 50 }
      const payload = {
        name:          data.name,
        director_name: data.director_name,
        slug:          data.login_id,
        phone:         data.phone || null,
        email:         null,
        region_id:     data.region_id || null,
        status:        data.status,
        address: null, district_id: null, tariff_id: null, tariff_expires_at: null, logo_url: null,
        settings: {
          ...baseSettings,
          // Only update password if provided, otherwise keep existing
          director_password: data.password || (baseSettings as any).director_password || null,
        },
      }

      if (editClub) {
        return clubsService.update(editClub.id, payload)
      }
      return clubsService.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clubs'] })
      toast.success(editClub ? 'Klub yangilandi' : "Klub qo'shildi")
      reset({ name: '', director_name: '', login_id: '', phone: '', password: '', region_id: '', status: 'active' }); setOpen(false); setEditClub(null)
    },
    onError: (e: Error) => {
      const msg = e.message
      if (msg.includes('clubs_slug_key') || msg.includes('slug')) {
        toast.error('Bu Klub ID allaqachon band. Boshqa ID kiriting.')
      } else if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.error('Bu ma\'lumot allaqachon mavjud.')
      } else {
        toast.error(msg)
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => clubsService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clubs'] }); toast.success("O'chirildi"); setDeleteId(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const isEdit = !!editClub

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Klublar boshqaruvi</h2>
          <p className="text-sm text-gray-500 mt-0.5">Barcha sport klublarini boshqaring</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={openAdd}>Yangi klub</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Klub nomi yoki rahbar..."
            className="bg-gray-900 border border-gray-800 text-white text-sm rounded-lg pl-9 pr-4 py-2 placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition w-64"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-600">Yuklanmoqda...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['№','Klub nomi','Login ID','Rahbar','Telefon','Filiallar','Holat','Sana','Amallar'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide first:w-10">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtered.map((club, idx) => (
                  <tr key={club.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-gray-600 text-xs">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-gray-950 shrink-0"
                          style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
                        >
                          {getInitials(club.name)}
                        </div>
                        <div>
                          <button
                            onClick={() => navigate(`/admin/clubs/${club.id}`)}
                            className="text-white font-medium hover:text-[#00ff88] transition-colors text-left"
                          >
                            {club.name}
                          </button>
                          <p className="text-xs text-gray-600">{allBranches.filter((b: any) => b.club_id === club.id).length} ta filial</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {club.slug ? (
                        <span className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2 py-0.5 rounded font-mono">
                          {club.slug}
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-300">{club.director_name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{club.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{allBranches.filter((b: any) => b.club_id === club.id).length} ta</td>
                    <td className="px-4 py-3"><StatusBadge status={club.status} /></td>
                    <td className="px-4 py-3 text-gray-400">{formatDate(club.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => navigate(`/admin/clubs/${club.id}`)} className="p-1.5 text-gray-500 hover:text-[#00ff88] hover:bg-gray-800 rounded-lg transition-colors"><Eye size={14} /></button>
                        <button onClick={() => openEdit(club)} className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-gray-800 rounded-lg transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteId(club.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-14 text-center text-gray-600">Klublar topilmadi</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-gray-800 text-xs text-gray-600">
            {filtered.length} ta klub
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditClub(null); reset({ name: '', director_name: '', login_id: '', phone: '', password: '', region_id: '', status: 'active' }) }}
        title={isEdit ? 'Klubni tahrirlash' : "Yangi klub qo'shish"}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Klub nomi *"
            placeholder="masalan: Arena Sport"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Rahbar F.I.O *"
            placeholder="Abdullayev Jamshid"
            error={errors.director_name?.message}
            {...register('director_name')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Klub ID (login) *"
              placeholder="masalan: arena1"
              error={errors.login_id?.message}
              disabled={isEdit}
              {...register('login_id')}
            />
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  label="Telefon raqami"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.phone?.message}
                />
              )}
            />
          </div>
          {/* Current password display (edit only) */}
          {isEdit && currentPassword && (
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-300 font-medium">Joriy parol</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  readOnly
                  className="w-full bg-gray-800/50 border border-gray-700 text-gray-300 rounded-lg px-3 pr-10 py-2 text-sm cursor-default"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}
          {/* New password field */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300 font-medium">
              {isEdit ? "Yangi parol (o'zgartirish uchun)" : 'Admin Paroli *'}
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={isEdit ? 'Bo\'sh qoldirsa o\'zgarmaydi' : 'Kirish paroli'}
                {...register('password')}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 pr-10 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Viloyat"
              options={regions.map(r => ({ value: r.id, label: r.name }))}
              placeholder="Tanlang..."
              {...register('region_id')}
            />
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
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-800">
          <Button variant="ghost" onClick={() => { setOpen(false); setEditClub(null); reset({ name: '', director_name: '', login_id: '', phone: '', password: '', region_id: '', status: 'active' }) }}>Bekor qilish</Button>
          <Button loading={saveMutation.isPending} onClick={handleSubmit(d => saveMutation.mutate(d))}>
            ✓ Saqlash
          </Button>
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
