/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase, supabaseAdmin } from '@/lib/supabase'
const db = supabase as any
const dbAdmin = (supabaseAdmin ?? supabase) as any

import type { Plan } from '@/types/database'

export const plansService = {
  async list(clubId: string): Promise<Plan[]> {
    const { data, error } = await dbAdmin
      .from('plans')
      .select('*')
      .eq('club_id', clubId)
      .order('price')
    if (error) throw error
    return data ?? []
  },

  async create(payload: Omit<Plan, 'id' | 'created_at' | 'updated_at'>): Promise<Plan> {
    const { data, error } = await dbAdmin.from('plans').insert(payload).select().single()
    if (error) throw error
    return data
  },

  async update(id: string, payload: Partial<Plan>, clubId?: string): Promise<Plan> {
    let q = dbAdmin
      .from('plans')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (clubId) q = q.eq('club_id', clubId)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },

  async delete(id: string, clubId?: string): Promise<void> {
    let q = dbAdmin.from('plans').delete().eq('id', id)
    if (clubId) q = q.eq('club_id', clubId)
    const { error } = await q
    if (error) throw error
  },
}
