import { useState } from 'react'
import { FolderOpen, Plus, Search, Pencil, Trash2 } from 'lucide-react'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'

interface Category {
  id: string
  name: string
  icon: string
  description: string
  status: 'active' | 'inactive'
  clubs: number
}

// Empty for now — categories will be added by admin
const INITIAL: Category[] = []

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(INITIAL)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🏋️')
  const [desc, setDesc] = useState('')

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = () => {
    if (!name.trim()) return
    const newCat: Category = {
      id: Date.now().toString(),
      name: name.trim(),
      icon,
      description: desc.trim(),
      status: 'active',
      clubs: 0,
    }
    setCategories((prev) => [...prev, newCat])
    setName(''); setIcon('🏋️'); setDesc('')
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Kategoriyalar</h2>
          <p className="text-sm text-gray-400 mt-0.5">Klub turlari va kategoriyalarini boshqaring</p>
        </div>
        <Button onClick={() => setShowModal(true)} icon={<Plus size={15} />}>
          Yangi kategoriya
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Kategoriya nomi..."
            className="bg-gray-900 border border-gray-800 text-white text-sm rounded-lg pl-9 pr-4 py-2 placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition w-64"
          />
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center">
          <FolderOpen size={48} className="mx-auto text-gray-700 mb-4" />
          <p className="text-gray-400 font-medium">Kategoriyalar topilmadi</p>
          <p className="text-gray-600 text-sm mt-1 mb-5">Hali hech qanday kategoriya qo'shilmagan</p>
          <Button onClick={() => setShowModal(true)} icon={<Plus size={15} />}>
            Yangi kategoriya
          </Button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">№</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Kategoriya</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Klublar soni</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Holat</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((cat, i) => (
                <tr key={cat.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat.icon}</span>
                      <div>
                        <p className="text-white font-medium">{cat.name}</p>
                        {cat.description && <p className="text-xs text-gray-500">{cat.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{cat.clubs} ta</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                      Faol
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 text-gray-500 hover:text-[#00ff88] transition-colors rounded">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-gray-800 text-xs text-gray-500">
            {filtered.length} ta kategoriya
          </div>
        </div>
      )}

      {/* Add modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Yangi kategoriya" size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)}>Bekor qilish</Button>
            <Button onClick={handleAdd} disabled={!name.trim()}>Saqlash</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Kategoriya nomi *"
            placeholder="masalan: Sport zallari"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Icon (emoji)"
            placeholder="🏋️"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-300 font-medium">Tavsif</label>
            <textarea
              placeholder="Qisqacha tavsif..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
