/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase'
import type { Agent, Region, District, Currency, PlatformTariff } from '@/types/database'

const db = supabase as any

export const adminService = {
  // Regions
  async listRegions(): Promise<Region[]> {
    const { data, error } = await db.from('regions').select('*').order('name')
    if (error) throw error
    return data ?? []
  },
  async createRegion(name: string): Promise<Region> {
    const { data, error } = await db.from('regions').insert({ name }).select().single()
    if (error) throw error
    return data
  },
  async deleteRegion(id: string): Promise<void> {
    const { error } = await db.from('regions').delete().eq('id', id)
    if (error) throw error
  },

  // Districts
  async listDistricts(regionId?: string): Promise<District[]> {
    let q = db.from('districts').select('*').order('name')
    if (regionId) q = q.eq('region_id', regionId)
    const { data, error } = await q
    if (error) throw error
    return data ?? []
  },
  async createDistrict(regionId: string, name: string): Promise<District> {
    const { data, error } = await db
      .from('districts').insert({ region_id: regionId, name }).select().single()
    if (error) throw error
    return data
  },
  async deleteDistrict(id: string): Promise<void> {
    const { error } = await db.from('districts').delete().eq('id', id)
    if (error) throw error
  },

  // Currencies
  async listCurrencies(): Promise<Currency[]> {
    const { data, error } = await db.from('currencies').select('*').order('code')
    if (error) throw error
    return data ?? []
  },
  async createCurrency(payload: Omit<Currency, 'id' | 'created_at' | 'updated_at'>): Promise<Currency> {
    const { data, error } = await db.from('currencies').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async updateCurrency(id: string, payload: Partial<Currency>): Promise<Currency> {
    const { data, error } = await db
      .from('currencies').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deleteCurrency(id: string): Promise<void> {
    const { error } = await db.from('currencies').delete().eq('id', id)
    if (error) throw error
  },

  // Tariffs
  async listTariffs(): Promise<PlatformTariff[]> {
    const { data, error } = await db.from('platform_tariffs').select('*').order('price')
    if (error) throw error
    return data ?? []
  },
  async createTariff(payload: Omit<PlatformTariff, 'id' | 'created_at' | 'updated_at'>): Promise<PlatformTariff> {
    const { data, error } = await db.from('platform_tariffs').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async updateTariff(id: string, payload: Partial<PlatformTariff>): Promise<PlatformTariff> {
    const { data, error } = await db
      .from('platform_tariffs').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deleteTariff(id: string): Promise<void> {
    const { error } = await db.from('platform_tariffs').delete().eq('id', id)
    if (error) throw error
  },

  // Agents
  async listAgents(): Promise<Agent[]> {
    const { data, error } = await db.from('agents').select('*').order('full_name')
    if (error) throw error
    return data ?? []
  },
  async createAgent(payload: Omit<Agent, 'id' | 'created_at' | 'updated_at'>): Promise<Agent> {
    const { data, error } = await db.from('agents').insert(payload).select().single()
    if (error) throw error
    return data
  },
  async updateAgent(id: string, payload: Partial<Agent>): Promise<Agent> {
    const { data, error } = await db
      .from('agents').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  async deleteAgent(id: string): Promise<void> {
    const { error } = await db.from('agents').delete().eq('id', id)
    if (error) throw error
  },
}
