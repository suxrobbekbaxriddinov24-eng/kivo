/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase'
const db = supabase as any
import type { Customer } from '@/types/database'

export interface CustomerFilters {
  search?: string
  status?: string
  branch_id?: string
}

export const customersService = {
  async list(clubId: string, filters?: CustomerFilters): Promise<Customer[]> {
    let q = supabase
      .from('customers')
      .select('*, active_subscription:subscriptions!inner(id,plan_name,expires_at,visits_total,visits_used,status,duration_type)')
      .eq('club_id', clubId)
      .eq('subscriptions.status', 'active')
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
    return data ?? []
  },

  async listAll(clubId: string): Promise<Customer[]> {
    const { data, error } = await db
      .from('customers')
      .select('*')
      .eq('club_id', clubId)
      .eq('status', 'active')
      .order('first_name')
    if (error) throw error
    return data ?? []
  },

  async get(id: string): Promise<Customer> {
    const { data, error } = await db
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(payload: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Promise<Customer> {
    const { data, error } = await db
      .from('customers')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id: string, payload: Partial<Customer>): Promise<Customer> {
    const { data, error } = await db
      .from('customers')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await db.from('customers').delete().eq('id', id)
    if (error) throw error
  },

  async checkIn(customerId: string, clubId: string, soldBy: string, subscriptionId?: string): Promise<void> {
    const { error } = await db.from('visits').insert({
      customer_id: customerId,
      club_id: clubId,
      subscription_id: subscriptionId ?? null,
      checked_in_by: soldBy,
      checked_in_at: new Date().toISOString(),
    })
    if (error) throw error
  },

  async visits(customerId: string, clubId: string) {
    const { data, error } = await db
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
