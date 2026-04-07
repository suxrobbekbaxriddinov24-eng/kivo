import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types/database'

// Legacy fallback: used only when supabaseAdmin is not available
const CUSTOM_SESSION_KEY = 'kivo_custom_session'

interface CustomSession {
  clubId: string
  branchId: string | null
  fullName: string
  role: 'club_director' | 'staff'
  loginId: string
}

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

/** Email used for Supabase Auth for club directors — never shown to users */
export function directorEmail(slug: string): string {
  return `${slug.toLowerCase().trim()}@kivo.internal`
}

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean
  initError: boolean

  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  customLogin: (loginId: string, password: string, role: 'club_director' | 'staff') => Promise<void>
  logout: () => Promise<void>
  setSession: (session: Session | null) => Promise<void>
  refreshProfile: () => Promise<void>
}

// NOTE: Do NOT add getter-style properties (get role() { return get().profile?.role })
// to the Zustand state object. Zustand's Object.assign merges lose property descriptors
// after the first set() call, so getters become stale. Use the selector functions below
// or access profile.role directly in components.

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: false,
  isInitialized: false,
  initError: false,

  initialize: async () => {
    set({ isLoading: true, initError: false })
    try {
      // 1. Check legacy custom session (Rahbar/Xodim without Supabase Auth)
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

      // 2. Check Supabase session (Super Admin + migrated Directors)
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        set({ session, user: session.user, profile })
      }
    } catch {
      set({ initError: true })
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile, error: profileError } = await (supabase as any)
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

  // Club Director login — uses real Supabase Auth with auto-migration from legacy system
  customLogin: async (loginId: string, password: string, role: 'club_director' | 'staff') => {
    set({ isLoading: true })
    try {
      if (role === 'club_director') {
        const email = directorEmail(loginId)

        // Step 1: Try real Supabase Auth login (works for already-migrated directors)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

        if (signInData?.session) {
          // Real auth session — fetch profile
          const client = supabaseAdmin ?? (supabase as any)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let { data: profile } = await (supabase as any)
            .from('profiles')
            .select('*')
            .eq('id', signInData.session.user.id)
            .single()

          // If club_id is missing on profile, look it up by slug and patch it
          if (profile && !profile.club_id) {
            const { data: club } = await client
              .from('clubs')
              .select('id, name')
              .eq('slug', loginId.toLowerCase().trim())
              .single()
            if (club) {
              await client.from('profiles').update({ club_id: club.id, role: 'club_director' }).eq('id', profile.id)
              profile = { ...profile, club_id: club.id, role: 'club_director' }
            }
          }

          set({ session: signInData.session, user: signInData.session.user, profile })
          return
        }

        // Step 2: Supabase Auth failed — try legacy password check + auto-migrate
        const client = supabaseAdmin ?? (supabase as any)
        const { data: club, error: clubError } = await client
          .from('clubs')
          .select('id, name, slug, settings, status')
          .eq('slug', loginId.toLowerCase().trim())
          .single()

        if (clubError || !club) throw new Error('Login ID topilmadi')
        if (club.status !== 'active') throw new Error('Bu klub bloklangan yoki nofaol')

        const storedPwd = club.settings?.director_password
        if (!storedPwd) {
          // No legacy password either — re-throw the original Supabase Auth error
          throw new Error(signInError?.message?.includes('Invalid') ? "Login yoki parol noto'g'ri" : (signInError?.message ?? "Login yoki parol noto'g'ri"))
        }
        if (storedPwd !== password) throw new Error("Login yoki parol noto'g'ri")

        // Legacy password matched — attempt auto-migration to Supabase Auth
        if (supabaseAdmin) {
          try {
            const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
            })

            if (!createError && authUser?.user) {
              // Create/upsert profile for the new auth user
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabaseAdmin as any).from('profiles').upsert({
                id: authUser.user.id,
                role: 'club_director',
                club_id: club.id,
                branch_id: null,
                full_name: club.name,
                phone: null,
                avatar_url: null,
                status: 'active',
              })

              // Sign in with the newly created Supabase Auth user
              const { data: newSession } = await supabase.auth.signInWithPassword({ email, password })
              if (newSession?.session) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: profile } = await (supabase as any)
                  .from('profiles')
                  .select('*')
                  .eq('id', newSession.session.user.id)
                  .single()
                set({ session: newSession.session, user: newSession.session.user, profile })
                return
              }
            }
          } catch {
            // Auto-migration failed — fall through to legacy custom session
          }
        }

        // Final fallback: legacy custom session (when supabaseAdmin unavailable)
        const cs: CustomSession = {
          clubId: club.id,
          branchId: null,
          fullName: club.name,
          role: 'club_director',
          loginId,
        }
        localStorage.setItem(CUSTOM_SESSION_KEY, JSON.stringify(cs))
        set({ profile: buildFakeProfile(cs) })

      } else {
        // Staff: authenticate via agents table (username + settings.password)
        const client = supabaseAdmin ?? (supabase as any)
        const { data: agent, error: agentError } = await client
          .from('agents')
          .select('*')
          .eq('username', loginId.toLowerCase().trim())
          .single()

        if (agentError || !agent) throw new Error("Login yoki parol noto'g'ri")
        if (agent.status !== 'active') throw new Error('Bu xodim bloklangan yoki nofaol')

        const storedPwd = agent.settings?.password
        if (!storedPwd) throw new Error("Parol o'rnatilmagan. Admin bilan bog'laning")
        if (storedPwd !== password) throw new Error("Login yoki parol noto'g'ri")

        // Build a fake profile for the staff member
        const cs: CustomSession = {
          clubId: agent.club_id ?? '',
          branchId: null,
          fullName: agent.full_name,
          role: 'staff',
          loginId: agent.username,
        }
        localStorage.setItem(CUSTOM_SESSION_KEY, JSON.stringify(cs))
        set({ profile: buildFakeProfile(cs) })
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
    // Don't override legacy custom session with Supabase auth state changes
    if (localStorage.getItem(CUSTOM_SESSION_KEY)) return

    if (session?.user) {
      set({ session, user: session.user })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
      set({ profile })
    } else {
      // Only clear profile if this is a real Supabase session (not a legacy custom one)
      if (!get().profile || get().profile?.id?.startsWith('custom_')) return
      set({ session: null, user: null, profile: null })
    }
  },

  refreshProfile: async () => {
    const userId = get().user?.id
    if (!userId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (profile) set({ profile })
  },
}))

/** Computed selectors — use these in components instead of destructuring */
export const selectRole = (s: ReturnType<typeof useAuthStore.getState>): ReturnType<typeof useAuthStore.getState>['profile'] extends null ? null : UserRole | null =>
  s.profile?.role ?? null
export const selectClubId = (s: ReturnType<typeof useAuthStore.getState>): string | null => s.profile?.club_id ?? null
export const selectIsDirector = (s: ReturnType<typeof useAuthStore.getState>): boolean => s.profile?.role === 'club_director'
export const selectIsStaff = (s: ReturnType<typeof useAuthStore.getState>): boolean => s.profile?.role === 'staff'
export const selectIsSuperAdmin = (s: ReturnType<typeof useAuthStore.getState>): boolean => s.profile?.role === 'super_admin'
