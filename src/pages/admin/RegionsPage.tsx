import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/services/admin.service'
import { toast } from '@/stores/uiStore'
import Button from '@/components/ui/Button'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Plus, Trash2, MapPin, ChevronRight } from 'lucide-react'
import type { Region } from '@/types/database'

export default function RegionsPage() {
  const qc = useQueryClient()
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
  const [newRegionName, setNewRegionName] = useState('')
  const [newDistrictName, setNewDistrictName] = useState('')
  const [deleteRegionId, setDeleteRegionId] = useState<string | null>(null)
  const [deleteDistrictId, setDeleteDistrictId] = useState<string | null>(null)

  const { data: regions = [] } = useQuery({
    queryKey: ['regions'],
    queryFn: adminService.listRegions,
  })

  const { data: allDistricts = [] } = useQuery({
    queryKey: ['districts'],
    queryFn: () => adminService.listDistricts(),
  })

  const districts = selectedRegion
    ? allDistricts.filter((d) => d.region_id === selectedRegion.id)
    : []

  const getDistrictCount = (regionId: string) =>
    allDistricts.filter((d) => d.region_id === regionId).length

  const createRegionMutation = useMutation({
    mutationFn: () => adminService.createRegion(newRegionName.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regions'] })
      toast.success("Viloyat qo'shildi")
      setNewRegionName('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteRegionMutation = useMutation({
    mutationFn: adminService.deleteRegion,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regions'] })
      if (selectedRegion?.id === deleteRegionId) setSelectedRegion(null)
      toast.success("Viloyat o'chirildi")
      setDeleteRegionId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const createDistrictMutation = useMutation({
    mutationFn: () => adminService.createDistrict(selectedRegion!.id, newDistrictName.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['districts'] })
      toast.success("Tuman qo'shildi")
      setNewDistrictName('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteDistrictMutation = useMutation({
    mutationFn: adminService.deleteDistrict,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['districts'] })
      toast.success("Tuman o'chirildi")
      setDeleteDistrictId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left panel — Viloyatlar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Viloyatlar <span className="text-gray-500 text-sm font-normal">({regions.length})</span></h2>
        </div>

        {/* Add input */}
        <div className="px-4 py-3 border-b border-gray-800 flex gap-2">
          <input
            type="text"
            placeholder="Viloyat nomi..."
            value={newRegionName}
            onChange={(e) => setNewRegionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && newRegionName.trim() && createRegionMutation.mutate()}
            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition"
          />
          <Button
            size="sm"
            icon={<Plus size={14} />}
            disabled={!newRegionName.trim()}
            loading={createRegionMutation.isPending}
            onClick={() => createRegionMutation.mutate()}
          >
            Qo'shish
          </Button>
        </div>

        {/* List */}
        <div className="flex-1 divide-y divide-gray-800 overflow-y-auto">
          {regions.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">Viloyatlar yo'q</p>
          ) : (
            regions.map((r) => {
              const isActive = selectedRegion?.id === r.id
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRegion(isActive ? null : r)}
                  className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-[#00ff88]/10 border-l-2 border-[#00ff88]'
                      : 'hover:bg-gray-800/50 border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin size={14} className={isActive ? 'text-[#00ff88]' : 'text-gray-500'} />
                    <div>
                      <p className={`font-medium text-sm ${isActive ? 'text-[#00ff88]' : 'text-white'}`}>{r.name}</p>
                      <p className="text-xs text-gray-500">{getDistrictCount(r.id)} tuman</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteRegionId(r.id) }}
                      className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                    <ChevronRight size={13} className={isActive ? 'text-[#00ff88]' : 'text-gray-600'} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right panel — Tumanlar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">
            Tumanlar
            {selectedRegion && (
              <span className="ml-2 text-[#00ff88] text-sm font-normal">— {selectedRegion.name}</span>
            )}
            {selectedRegion && (
              <span className="text-gray-500 text-sm font-normal ml-1">({districts.length})</span>
            )}
          </h2>
        </div>

        {!selectedRegion ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 text-gray-600">
            <MapPin size={36} className="mb-3 opacity-30" />
            <p className="text-sm">Viloyat tanlang</p>
            <p className="text-xs mt-1 opacity-60">Tumanlarni ko'rish uchun chap paneldan viloyat tanlang</p>
          </div>
        ) : (
          <>
            {/* Add input */}
            <div className="px-4 py-3 border-b border-gray-800 flex gap-2">
              <input
                type="text"
                placeholder="Tuman nomi..."
                value={newDistrictName}
                onChange={(e) => setNewDistrictName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && newDistrictName.trim() && createDistrictMutation.mutate()}
                className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition"
              />
              <Button
                size="sm"
                icon={<Plus size={14} />}
                disabled={!newDistrictName.trim()}
                loading={createDistrictMutation.isPending}
                onClick={() => createDistrictMutation.mutate()}
              >
                Qo'shish
              </Button>
            </div>

            {/* List */}
            <div className="flex-1 divide-y divide-gray-800 overflow-y-auto">
              {districts.length === 0 ? (
                <p className="text-center text-gray-500 py-10 text-sm">Bu viloyatda tumanlar yo'q</p>
              ) : (
                districts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-800/30 transition-colors">
                    <p className="text-white text-sm">{d.name}</p>
                    <button
                      onClick={() => setDeleteDistrictId(d.id)}
                      className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteRegionId}
        onClose={() => setDeleteRegionId(null)}
        onConfirm={() => deleteRegionId && deleteRegionMutation.mutate(deleteRegionId)}
        loading={deleteRegionMutation.isPending}
        message="Viloyatni o'chirishni tasdiqlaysizmi? Barcha tumanlar ham o'chiriladi."
      />

      <ConfirmDialog
        open={!!deleteDistrictId}
        onClose={() => setDeleteDistrictId(null)}
        onConfirm={() => deleteDistrictId && deleteDistrictMutation.mutate(deleteDistrictId)}
        loading={deleteDistrictMutation.isPending}
        message="Tumanni o'chirishni tasdiqlaysizmi?"
      />
    </div>
  )
}
