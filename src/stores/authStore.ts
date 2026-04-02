import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types/database'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean

  // Computed helpers
  role: UserRole | null
  clubId: string | null
  branchId: string | null
  isSuperAdmin: boolean
  isDirector: boolean
  isStaff: boolean

  // Actions
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setSession: (session: Session | null) => Promise<void>
  refreshProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: false,
  isInitialized: false,

  get role() { return get().profile?.role ?? null },
  get clubId() { return get().profile?.club_id ?? null },
  get branchId() { return get().profile?.branch_id ?? null },
  get isSuperAdmin() { return get().profile?.role === 'super_admin' },
  get isDirector() { return get().profile?.role === 'club_director' },
  get isStaff() { return get().profile?.role === 'staff' },

  initialize: async () => {
    set({ isLoading: true })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        set({ session, user: session.user, profile })
      }
    } finally {
      set({ isLoading: false, isInitialized: true })
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data.session) throw new Error('No session returned')

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.session.user.id)
        .single()
      if (profileError) throw profileError

      set({ session: data.session, user: data.session.user, profile })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null })
  },

  setSession: async (session) => {
    if (session?.user) {
      set({ session, user: session.user })
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      set({ profile })
    } else {
      set({ session: null, user: null, profile: null })
    }
  },

  refreshProfile: async () => {
    const userId = get().user?.id
    if (!userId) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (profile) set({ profile })
  },
}))
