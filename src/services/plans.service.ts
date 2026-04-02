/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase'
const db = supabase as any
import type { Plan } from '@/types/database'

export const plansService = {
  async list(clubId: string): Promise<Plan[]> {
    const { data, error } = await db
      .from('plans')
      .select('*')
      .eq('club_id', clubId)
      .order('price')
    if (error) throw error
    return data ?? []
  },

  async create(payload: Omit<Plan, 'id' | 'created_at' | 'updated_at'>): Promise<Plan> {
    const { data, error } = await db.from('plans').insert(payload).select().single()
    if (error) throw error
    return data
  },

  async update(id: string, payload: Partial<Plan>): Promise<Plan> {
    const { data, error } = await db
      .from('plans')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await db.from('plans').delete().eq('id', id)
    if (error) throw error
  },
}
