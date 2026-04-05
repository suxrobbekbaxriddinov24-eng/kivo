import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/uiStore'
import { Mail, Lock, Eye, EyeOff, Dumbbell, UserCog, Users, ShieldCheck } from 'lucide-react'

const schema = z.object({
  identifier: z.string().min(1, "Login kiritilishi shart"),
  password: z.string().min(6, 'Kamida 6 ta belgi'),
})
type Form = z.infer<typeof schema>

type LoginType = 'rahbar' | 'xodim' | 'superadmin'

const tabs: { id: LoginType; label: string; icon: React.ReactNode }[] = [
  { id: 'rahbar',     label: 'Rahbar',      icon: <UserCog size={18} /> },
  { id: 'xodim',      label: 'Xodim',       icon: <Users size={18} /> },
  { id: 'superadmin', label: 'Super Admin', icon: <ShieldCheck size={18} /> },
]

export default function LoginPage() {
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<LoginType>('rahbar')

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const REQUIRED_ROLE: Record<LoginType, string> = {
    rahbar:     'club_director',
    xodim:      'staff',
    superadmin: 'super_admin',
  }

  const TAB_LABEL: Record<LoginType, string> = {
    rahbar:     'Rahbar',
    xodim:      'Xodim',
    superadmin: 'Super Admin',
  }

  const onSubmit = async (data: Form) => {
    setServerError('')
    try {
      // Rahbar/Xodim use Klub ID → convert to @kivo.uz email
      // Super Admin uses real email directly
      const email = activeTab === 'superadmin'
        ? data.identifier
        : `${data.identifier.toLowerCase().trim()}@kivo.uz`
      await login(email, data.password)
      const profile = useAuthStore.getState().profile

      // Enforce tab ↔ role match
      if (profile?.role !== REQUIRED_ROLE[activeTab]) {
        // Wrong role for selected tab — log out and show error
        await useAuthStore.getState().logout()
        setServerError(`Bu kirish turi faqat "${TAB_LABEL[activeTab]}" uchun. Iltimos to'g'ri tabni tanlang.`)
        return
      }

      toast.success("Xush kelibsiz!")
      if (profile.role === 'super_admin') {
        navigate('/admin/dashboard', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xatolik yuz berdi'
      if (msg.includes('Invalid login') || msg.includes('credentials')) {
        setServerError("Login yoki parol noto'g'ri")
      } else {
        setServerError(msg)
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: 'linear-gradient(135deg, #00ff88 0%, #00cc6d 100%)' }}>
            <Dumbbell size={22} className="text-gray-950" />
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-tight">Kivo Club</p>
            <p className="text-xs font-semibold tracking-widest" style={{ color: '#00ff88' }}>
              BOSHQARUV TIZIMI
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h1 className="text-xl font-bold text-white mb-1">Xush kelibsiz!</h1>
          <p className="text-sm text-gray-400 mb-5">Tizimga kirish uchun parolingizni kiriting.</p>

          {/* Tabs */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Kirish turi</p>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setActiveTab(tab.id); setServerError('') }}
                  className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'border-[#00ff88] text-[#00ff88] bg-[#00ff88]/10'
                      : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Identifier */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {activeTab === 'superadmin' ? 'Email' : 'Klub ID (Login)'}
              </label>
              <div className="relative flex items-center">
                <Mail size={15} className="absolute left-3 text-gray-500 pointer-events-none" />
                <input
                  type={activeTab === 'superadmin' ? 'email' : 'text'}
                  placeholder={activeTab === 'superadmin' ? 'email@example.com' : 'masalan: arena1'}
                  {...register('identifier')}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-3 py-2.5 text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/50 transition"
                />
              </div>
              {errors.identifier && <p className="text-xs text-red-400">{errors.identifier.message}</p>}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Parol</label>
              <div className="relative flex items-center">
                <Lock size={15} className="absolute left-3 text-gray-500 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Parolni kiriting..."
                  {...register('password')}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-10 py-2.5 text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            {serverError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl font-bold text-gray-950 text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: isLoading ? '#00cc6d' : 'linear-gradient(135deg, #00ff88 0%, #00cc6d 100%)' }}
            >
              {isLoading ? 'Kirish...' : 'Kirish'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-700 mt-5">
          Kivo &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
