import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/stores/uiStore'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Mail, Lock } from 'lucide-react'

const schema = z.object({
  email: z.string().email("To'g'ri email kiriting"),
  password: z.string().min(6, 'Kamida 6 ta belgi'),
})
type Form = z.infer<typeof schema>

export default function LoginPage() {
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Form) => {
    setServerError('')
    try {
      await login(data.email, data.password)
      const profile = useAuthStore.getState().profile
      if (profile?.role === 'super_admin') {
        navigate('/admin/dashboard', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
      toast.success("Xush kelibsiz!")
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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Kivo</h1>
          <p className="text-gray-400 mt-1">Fitness boshqaruv tizimi</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-5">Tizimga kirish</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="email@example.com"
              icon={<Mail size={16} />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Parol"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={16} />}
              error={errors.password?.message}
              {...register('password')}
            />

            {serverError && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {serverError}
              </p>
            )}

            <Button type="submit" className="w-full" loading={isLoading}>
              Kirish
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Kivo &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
