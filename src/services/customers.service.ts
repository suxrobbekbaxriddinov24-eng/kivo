import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { Customer } from '@/types/database'
import { isValidUUID } from '@/lib/utils'
const dbAdmin = (supabaseAdmin ?? supabase) as any

export interface CustomerFilters {
  search?: string
  status?: string
  branch_id?: string
}

export const customersService = {
  async list(clubId: string, filters?: CustomerFilters): Promise<Customer[]> {
    let q = dbAdmin
      .from('customers')
      .select(`
        *,
        active_subscription:subscriptions(
          id, plan_name, expires_at, starts_at, duration_value, visits_total, visits_used, status, duration_type
        )
      `)
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (filters?.status) q = q.eq('status', filters.status)
    if (filters?.branch_id) q = q.eq('branch_id', filters.branch_id)
    const safe = (filters?.search ?? '').replace(/[%_,.()']/g, ' ').trim()
    if (safe) {
      q = q.or(
        `first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,phone.ilike.%${safe}%`
      )
    }

    const { data, error } = await q
    if (error) throw error

    // Normalize: pick the most recent active & non-expired subscription
    const now = new Date()
    return (data ?? []).map((c: Customer & { active_subscription: unknown }) => {
      const subs = Array.isArray(c.active_subscription) ? c.active_subscription : []
      // Sort descending by id so the newest subscription wins
      const sorted = [...(subs as Customer['active_subscription'][])].sort((a, b) =>
        ((b as any)?.id ?? '').localeCompare((a as any)?.id ?? '')
      )
      const activeSub = sorted.find((s) => {
        if (!s) return false
        if (s.status !== 'active') return false
        if (s.expires_at && new Date(s.expires_at) < now) return false
        return true
      }) ?? null
      return { ...c, active_subscription: activeSub }
    })
  },

  async listAll(clubId: string): Promise<Customer[]> {
    const { data, error } = await dbAdmin
      .from('customers')
      .select('*')
      .eq('club_id', clubId)
      .eq('status', 'active')
      .order('first_name')
    if (error) throw error
    return data ?? []
  },

  async get(id: string, clubId?: string): Promise<Customer> {
    let q = dbAdmin
      .from('customers')
      .select('*')
      .eq('id', id)
    if (clubId) q = q.eq('club_id', clubId)
    const { data, error } = await q.single()
    if (error) throw error
    return data
  },

  async create(payload: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    const { data, error } = await dbAdmin
      .from('customers')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, payload: Partial<Customer>): Promise<Customer> {
    const { data, error } = await dbAdmin
      .from('customers')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string, clubId?: string): Promise<void> {
    let q = dbAdmin.from('customers').delete().eq('id', id)
    if (clubId) q = q.eq('club_id', clubId)
    const { error } = await q
    if (error) throw error
  },

  async checkIn(customerId: string, clubId: string, soldBy: string, subscriptionId?: string): Promise<void> {
    const { error } = await dbAdmin.from('visits').insert({
      customer_id: customerId,
      club_id: clubId,
      subscription_id: subscriptionId ?? null,
      // Only write a real UUID to the FK column — custom session IDs are not valid UUIDs
      checked_in_by: isValidUUID(soldBy) ? soldBy : null,
      checked_in_at: new Date().toISOString(),
    })
    if (error) throw error
  },

  async visits(customerId: string, clubId: string) {
    const { data, error } = await dbAdmin
      .from('visits')
      .select('*')
      .eq('customer_id', customerId)
      .eq('club_id', clubId)
      .order('checked_in_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return data ?? []
  },

  /** Returns all open (not yet checked-out) visits for today across the whole club */
  async listOpenVisitsToday(clubId: string): Promise<{ id: string; customer_id: string }[]> {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const { data } = await dbAdmin
      .from('visits')
      .select('id, customer_id')
      .eq('club_id', clubId)
      .gte('checked_in_at', startOfDay.toISOString())
      .is('checked_out_at', null)
    return data ?? []
  },

  /** Set checked_out_at on an open visit */
  async checkOut(visitId: string): Promise<void> {
    const { error } = await dbAdmin
      .from('visits')
      .update({ checked_out_at: new Date().toISOString() })
      .eq('id', visitId)
    if (error) throw error
  },
}
