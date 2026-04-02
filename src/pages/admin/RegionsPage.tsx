import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin.service'
import { toast } from '@/stores/uiStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus, Trash2 } from 'lucide-react'

export default function RegionsPage() {
  const qc = useQueryClient()
  const [newName, setNewName] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: regions = [] } = useQuery({ queryKey: ['regions'], queryFn: adminService.listRegions })

  const createMutation = useMutation({
    mutationFn: () => adminService.createRegion(newName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regions'] })
      toast.success('Viloyat qo\'shildi')
      setNewName('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: adminService.deleteRegion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regions'] })
      toast.success('O\'chirildi')
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex gap-3">
        <Input placeholder="Viloyat nomi..." value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
        <Button icon={<Plus size={16} />} disabled={!newName.trim()} loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
          Qo'shish
        </Button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl divide-y divide-gray-800">
        {regions.length === 0 ? (
          <p className="text-center text-gray-500 py-10 text-sm">Viloyatlar yo'q</p>
        ) : (
          regions.map((r) => (
            <div key={r.id} className="flex items-center justify-between px-5 py-3">
              <p className="text-white">{r.name}</p>
              <button onClick={() => setDeleteId(r.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending} message="Viloyatni o'chirishni tasdiqlaysizmi?" />
    </div>
  )
}
