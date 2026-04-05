import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types/database'

interface Props {
  allowedRoles: UserRole[]
  children: React.ReactNode
}

export default function ProtectedRoute({ allowedRoles, children }: Props) {
  const { profile, isInitialized, isLoading, initError } = useAuthStore()

  // M-5: Show error state instead of hanging forever on init failure
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <p className="text-red-400 text-sm">Ulanishda xatolik yuz berdi</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-950"
            style={{ background: 'linear-gradient(135deg,#00ff88,#00cc6d)' }}
          >
            Qayta urinish
          </button>
        </div>
      </div>
    )
  }

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
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(profile.role)) {
    const redirect = profile.role === 'super_admin' ? '/admin/dashboard' : '/dashboard'
    return <Navigate to={redirect} replace />
  }

  return <>{children}</>
}
