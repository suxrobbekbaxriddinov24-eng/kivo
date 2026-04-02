import { useAuthStore } from '@/stores/authStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clubsService } from '@/services/clubs.service'
import { toast } from '@/stores/uiStore'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import type { ClubSettings } from '@/types/database'

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  discountM1: z.coerce.number().min(0).max(100),
  discountM3: z.coerce.number().min(0).max(100),
  discountM6: z.coerce.number().min(0).max(100),
  discountM12: z.coerce.number().min(0).max(100),
})
type FormData = z.infer<typeof schema>

export default function SettingsPage() {
  const { profile } = useAuthStore()
  const clubId = profile?.club_id!
  const qc = useQueryClient()

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: () => clubsService.get(clubId),
    enabled: !!clubId,
  })

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  })

  useEffect(() => {
    if (!club) return
    const d = club.settings?.discounts ?? {}
    reset({
      name: club.name,
      phone: club.phone ?? '',
      address: club.address ?? '',
      discountM1: d.m1 ?? 0,
      discountM3: d.m3 ?? 10,
      discountM6: d.m6 ?? 15,
      discountM12: d.m12 ?? 25,
    })
  }, [club, reset])

  const saveMutation = useMutation({
    mutationFn: (data: FormData) => {
      const settings: ClubSettings = {
        ...(club?.settings ?? { currency: 'UZS', timezone: 'Asia/Tashkent', locker_count: 50 }),
        discounts: {
          m1: data.discountM1,
          m3: data.discountM3,
          m6: data.discountM6,
          m12: data.discountM12,
        },
      }
      return clubsService.update(clubId, {
        name: data.name,
        phone: data.phone || null,
        address: data.address || null,
        settings,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['club', clubId] })
      toast.success('Sozlamalar saqlandi')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Club info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-5">Klub ma'lumotlari</h2>
        <div className="space-y-4">
          <Input label="Klub nomi *" error={errors.name?.message} {...register('name')} />
          <Input label="Telefon" {...register('phone')} />
          <Input label="Manzil" {...register('address')} />
        </div>
      </div>

      {/* Discount settings */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-white font-semibold mb-5">Chegirma sozlamalari</h2>
        <div className="space-y-3">
          {[
            { label: '1 oylik abonement', key: 'discountM1' as const },
            { label: '3 oylik abonement', key: 'discountM3' as const },
            { label: '6 oylik abonement', key: 'discountM6' as const },
            { label: '12 oylik abonement', key: 'discountM12' as const },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4">
              <label className="text-sm text-gray-300 flex-1">{item.label}</label>
              <Input
                type="number"
                min={0}
                max={100}
                suffix="%"
                className="w-24"
                {...register(item.key)}
              />
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={handleSubmit((d) => saveMutation.mutate(d))}
        loading={saveMutation.isPending}
        disabled={!isDirty}
        className="w-full"
      >
        Saqlash
      </Button>
    </div>
  )
}
