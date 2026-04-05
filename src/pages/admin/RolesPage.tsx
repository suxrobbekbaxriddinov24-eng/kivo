import { ShieldCheck, Eye } from 'lucide-react'

const SYSTEM_ROLES = [
  {
    name: 'Super Admin',
    description: 'Barcha tizim sozlamalari, foydalanuvchilarni boshqarish, klublar, filiallar, moliya, agentlar, tariflar va rollarni to\'liq nazorat qilish huquqiga ega',
    users: 1,
    icon: <ShieldCheck size={20} className="text-[#00ff88]" />,
  },
  {
    name: 'Kuzatuvchi (Viewer)',
    description: 'Boshqaruv paneli hisobotlari va ommaviy ma\'lumotlar ro\'yxatiga faqat ko\'rish huquqi. Hech qanday o\'zgartirish, yaratish yoki o\'chirish imkoniyati yo\'q',
    users: 0,
    icon: <Eye size={20} className="text-blue-400" />,
  },
]

const MODULES = [
  { name: 'Klublar',      desc: 'Klublar ro\'yxati va tafsilotlari',       icon: '🏢' },
  { name: 'Agentlar',     desc: 'Yangi agentlar qo\'shish va boshqarish',   icon: '👥' },
  { name: 'Statistika',   desc: 'Umumiy hisobotlar va tahlillar',           icon: '📊' },
  { name: 'Hududlar',     desc: 'Hududiy bo\'linmalar va manzillar',        icon: '🗺️' },
  { name: 'Moliya',       desc: 'To\'lovlar va moliyaviy oqimlar',          icon: '💰' },
  { name: 'Tariflar',     desc: 'Tarif rejalari va narxlar',                icon: '🏷️' },
  { name: 'Sozlamalar',   desc: 'Tizim konfiguratsiyasi',                   icon: '⚙️' },
]

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Rollarni boshqarish</h2>
        <p className="text-sm text-gray-400 mt-0.5">Foydalanuvchi rollari va huquqlarini boshqaring</p>
      </div>

      {/* System roles */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <ShieldCheck size={15} className="text-[#00ff88]" /> Tizim rollari
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SYSTEM_ROLES.map((role) => (
            <div key={role.name} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center">
                  {role.icon}
                </div>
                <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded-full">O'zgarmas</span>
              </div>
              <p className="text-white font-semibold mb-1">{role.name}</p>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">{role.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <span className="text-xs text-gray-500">{role.users} Foydalanuvchi biriktirilgan</span>
                <button className="text-xs text-[#00ff88] hover:text-[#00cc6d] transition-colors">Tafsilotlar</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom roles */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-400">Maxsus rollar</h3>
          <input
            placeholder="Rollarni qidirish..."
            className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-1.5 placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition w-48"
          />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Rol nomi</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Tavsif</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Huquqlar soni</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">So'nggi o'zgarish</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Amallar</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-600">
                    <ShieldCheck size={40} className="opacity-30" />
                    <p className="font-medium text-gray-500">Maxsus rollar topilmadi</p>
                    <p className="text-xs">Yangi rol yaratish uchun yuqoridagi tugmani bosing</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Module permissions reference */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Tizim modullari ({MODULES.length} ta)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODULES.map((m) => (
            <div key={m.name} className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
              <span className="text-lg">{m.icon}</span>
              <div>
                <p className="text-sm text-white font-medium">{m.name}</p>
                <p className="text-xs text-gray-500">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
