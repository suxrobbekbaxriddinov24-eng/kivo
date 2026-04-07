/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase, supabaseAdmin } from '@/lib/supabase'
const db = supabase as any
const dbAdmin = (supabaseAdmin ?? supabase) as any
import type { Product, ProductCategory } from '@/types/database'

export const productsService = {
  async list(clubId: string): Promise<Product[]> {
    const { data, error } = await dbAdmin
      .from('products')
      .select('*, category:product_categories(id, name)')
      .eq('club_id', clubId)
      .order('name')
    if (error) throw error
    return data ?? []
  },

  async create(payload: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'category'>): Promise<Product> {
    const { data, error } = await dbAdmin.from('products').insert(payload).select().single()
    if (error) throw error
    return data
  },

  async update(id: string, payload: Partial<Product>): Promise<Product> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { category: _cat, ...rest } = payload as Product & { category?: unknown }
    const { data, error } = await dbAdmin
      .from('products')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await dbAdmin.from('products').delete().eq('id', id)
    if (error) throw error
  },

  async listCategories(clubId: string): Promise<ProductCategory[]> {
    const { data, error } = await dbAdmin
      .from('product_categories')
      .select('*')
      .eq('club_id', clubId)
      .order('name')
    if (error) throw error
    return data ?? []
  },

  async createCategory(clubId: string, name: string, icon?: string): Promise<ProductCategory> {
    const { data, error } = await dbAdmin
      .from('product_categories')
      .insert({ club_id: clubId, name, ...(icon ? { icon } : {}) })
      .select()
      .single()
    if (error) throw error
    return data
  },
}
