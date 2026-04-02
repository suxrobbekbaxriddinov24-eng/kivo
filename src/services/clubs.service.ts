/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase'
import type { Club, Branch } from '@/types/database'

const db = supabase as any

export const clubsService = {
  async list(): Promise<Club[]> {
    const { data, error } = await db
      .from('clubs')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async get(id: string): Promise<Club> {
    const { data, error } = await db.from('clubs').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },

  async create(payload: Omit<Club, 'id' | 'created_at' | 'updated_at'>): Promise<Club> {
    const { data, error } = await db.from('clubs').insert(payload).select().single()
    if (error) throw error
    return data
  },

  async update(id: string, payload: Partial<Club>): Promise<Club> {
    const { data, error } = await db
      .from('clubs')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await db.from('clubs').delete().eq('id', id)
    if (error) throw error
  },

  async branches(clubId: string): Promise<Branch[]> {
    const { data, error } = await db
      .from('branches')
      .select('*')
      .eq('club_id', clubId)
      .order('name')
    if (error) throw error
    return data ?? []
  },

  async createBranch(payload: Omit<Branch, 'id' | 'created_at' | 'updated_at'>): Promise<Branch> {
    const { data, error } = await db.from('branches').insert(payload).select().single()
    if (error) throw error
    return data
  },

  async updateBranch(id: string, payload: Partial<Branch>): Promise<Branch> {
    const { data, error } = await db
      .from('branches')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteBranch(id: string): Promise<void> {
    const { error } = await db.from('branches').delete().eq('id', id)
    if (error) throw error
  },

  async stats(): Promise<{ total: number; active: number; newThisMonth: number }> {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const [all, active, newThisMonth] = await Promise.all([
      supabase.from('clubs').select('id', { count: 'exact' }),
      supabase.from('clubs').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('clubs').select('id', { count: 'exact' }).gte('created_at', monthStart),
    ])
    return {
      total: all.count ?? 0,
      active: active.count ?? 0,
      newThisMonth: newThisMonth.count ?? 0,
    }
  },
}
