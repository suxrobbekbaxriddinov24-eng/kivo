import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types/database'

const CUSTOM_SESSION_KEY = 'kivo_custom_session'

interface CustomSession {
  clubId: string
  branchId: string | null
  fullName: string
  role: 'club_director' | 'staff'
  loginId: string
}

// Build a fake Profile object from a custom session
function buildFakeProfile(cs: CustomSession): Profile {
  return {
    id: `custom_${cs.loginId}`,
    role: cs.role,
    club_id: cs.clubId,
    branch_id: cs.branchId,
    full_name: cs.fullName,
    phone: null,
    avatar_url: null,
    status: 'active',
    created_at: '',
    updated_at: '',
  }
}

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean

  role: UserRole | null
  clubId: string | null
  branchId: string | null
  isSuperAdmin: boolean
  isDirector: boolean
  isStaff: boolean

  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  customLogin: (loginId: string, password: string, role: 'club_director' | 'staff') => Promise<void>
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
      // 1. Check custom session (Rahbar/Xodim) first
      const raw = localStorage.getItem(CUSTOM_SESSION_KEY)
      if (raw) {
        try {
          const cs: CustomSession = JSON.parse(raw)
          set({ profile: buildFakeProfile(cs) })
          return
        } catch {
          localStorage.removeItem(CUSTOM_SESSION_KEY)
        }
      }

      // 2. Check Supabase session (Super Admin)
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

  // Super Admin login via Supabase Auth
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

  // Rahbar / Xodim login — checks DB directly, no Supabase Auth needed
  customLogin: async (loginId: string, password: string, role: 'club_director' | 'staff') => {
    set({ isLoading: true })
    try {
      if (role === 'club_director') {
        const { data: clubs, error } = await (supabase as any)
          .from('clubs')
          .select('id, name, slug, settings, status')
          .eq('slug', loginId.toLowerCase().trim())
          .single()

        if (error || !clubs) throw new Error("Login ID topilmadi")
        if (clubs.status !== 'active') throw new Error("Bu klub bloklangan yoki nofaol")

        const storedPwd = clubs.settings?.director_password
        if (!storedPwd) throw new Error("Parol o'rnatilmagan. Super admindan so'rang.")
        if (storedPwd !== password) throw new Error("Login yoki parol noto'g'ri")

        const cs: CustomSession = {
          clubId: clubs.id,
          branchId: null,
          fullName: clubs.name,
          role: 'club_director',
          loginId,
        }
        localStorage.setItem(CUSTOM_SESSION_KEY, JSON.stringify(cs))
        set({ profile: buildFakeProfile(cs) })

      } else {
        // Staff: check branches table (future use)
        throw new Error("Xodim login hali ishga tushirilmagan")
      }
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    localStorage.removeItem(CUSTOM_SESSION_KEY)
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
