import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types/database'

interface Props {
  allowedRoles: UserRole[]
  children: React.ReactNode
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const { profile, isInitialized, isLoading } = useAuthStore()

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    const loginPath = allowedRoles.includes('super_admin') ? '/admin/login' : '/login'
    return <Navigate to={loginPath} replace />
  }

  if (!allowedRoles.includes(profile.role)) {
    const redirect = profile.role === 'super_admin' ? '/admin/dashboard' : '/dashboard'
    return <Navigate to={redirect} replace />
  }

  return <>{children}</>
}
