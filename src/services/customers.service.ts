import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types/database'
import { isValidUUID } from '@/lib/utils'

export interface CustomerFilters {
  search?: string
  status?: string
  branch_id?: string
}

export const customersService = {
  async list(clubId: string, filters?: CustomerFilters): Promise<Customer[]> {
    // Use left join (no !inner) so customers without any subscription are included
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase as any)
      .from('customers')
      .select('*, active_subscription:subscriptions(id,plan_name,expires_at,visits_total,visits_used,status,duration_type)')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })

    if (filters?.status) q = q.eq('status', filters.status)
    if (filters?.branch_id) q = q.eq('branch_id', filters.branch_id)
    if (filters?.search) {
      q = q.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
      )
    }

    const { data, error } = await q
    if (error) throw error

    // Normalize: pick the first active, non-expired subscription per customer
    const now = new Date()
    return (data ?? []).map((c: Customer & { active_subscription: unknown }) => {
      const subs = Array.isArray(c.active_subscription) ? c.active_subscription : []
      const activeSub = (subs as Customer['active_subscription'][]).find((s) => {
        if (!s) return false
        if (s.status !== 'active') return false
        if (s.expires_at && new Date(s.expires_at) < now) return false
        return true
      }) ?? null
      return { ...c, active_subscription: activeSub }
    })
  },

  async listAll(clubId: string): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('club_id', clubId)
      .eq('status', 'active')
      .order('first_name')
    if (error) throw error
    return data ?? []
  },

  async get(id: string): Promise<Customer> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(payload: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('customers')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, payload: Partial<Customer>): Promise<Customer> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('customers')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('customers').delete().eq('id', id)
    if (error) throw error
  },

  async checkIn(customerId: string, clubId: string, soldBy: string, subscriptionId?: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('visits').insert({
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('visits')
      .select('*')
      .eq('customer_id', customerId)
      .eq('club_id', clubId)
      .order('checked_in_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return data ?? []
  },
}
