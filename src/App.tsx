import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

import ProtectedRoute from '@/components/shared/ProtectedRoute'
import ClubLayout from '@/components/layout/ClubLayout'
import AdminLayout from '@/components/layout/AdminLayout'
import Toaster from '@/components/ui/Toaster'

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import SetPasswordPage from '@/pages/auth/SetPasswordPage'

// Club pages
import ClubDashboardPage from '@/pages/club/DashboardPage'
import CustomersPage from '@/pages/club/CustomersPage'
import CustomerDetailPage from '@/pages/club/CustomerDetailPage'
import POSPage from '@/pages/club/POSPage'
import InventoryPage from '@/pages/club/InventoryPage'
import FinancePage from '@/pages/club/FinancePage'
import PlansPage from '@/pages/club/PlansPage'
import SettingsPage from '@/pages/club/SettingsPage'

// Admin pages
import AdminDashboardPage from '@/pages/admin/DashboardPage'
import ClubsPage from '@/pages/admin/ClubsPage'
import ClubDetailPage from '@/pages/admin/ClubDetailPage'
import AgentsPage from '@/pages/admin/AgentsPage'
import TariffsPage from '@/pages/admin/TariffsPage'
import RegionsPage from '@/pages/admin/RegionsPage'
import CurrenciesPage from '@/pages/admin/CurrenciesPage'
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage'
import RolesPage from '@/pages/admin/RolesPage'
import CategoriesPage from '@/pages/admin/CategoriesPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function AppRoutes() {
  const { initialize, setSession } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    // Handle invite/password-recovery links
    const hash = window.location.hash
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      navigate('/set-password', { replace: true })
    }

    initialize()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/set-password', { replace: true })
      } else {
        setSession(session)
      }
    })
    return () => subscription.unsubscribe()
  }, [initialize, setSession, navigate])

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />

      {/* Super Admin */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="clubs" element={<ClubsPage />} />
        <Route path="clubs/:clubId" element={<ClubDetailPage />} />
        <Route path="agents" element={<AgentsPage />} />
        <Route path="tariffs" element={<TariffsPage />} />
        <Route path="regions" element={<RegionsPage />} />
        <Route path="currencies" element={<CurrenciesPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* Club panel */}
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['club_director', 'staff']}>
          <ClubLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<ClubDashboardPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/:customerId" element={<CustomerDetailPage />} />
        <Route path="pos" element={<POSPage />} />
        <Route path="inventory" element={
          <ProtectedRoute allowedRoles={['club_director']}>
            <InventoryPage />
          </ProtectedRoute>
        } />
        <Route path="finance" element={
          <ProtectedRoute allowedRoles={['club_director']}>
            <FinancePage />
          </ProtectedRoute>
        } />
        <Route path="plans" element={
          <ProtectedRoute allowedRoles={['club_director']}>
            <PlansPage />
          </ProtectedRoute>
        } />
        <Route path="settings" element={
          <ProtectedRoute allowedRoles={['club_director']}>
            <SettingsPage />
          </ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
