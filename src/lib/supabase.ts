import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient<Database>(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Admin client with service role — bypasses RLS, used only in super admin panel
export const supabaseAdmin = serviceKey
  ? createClient<Database>(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null
