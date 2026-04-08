/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase, supabaseAdmin } from '@/lib/supabase'
const db = supabase as any
const dbAdmin = (supabaseAdmin ?? supabase) as any
import type { Product, ProductCategory } from '@/types/database'

export const productsService = {
  async list(clubId: string): Promise<Product[]> {
    const { data, error } = await dbAdmin
      .from('products')
      .select('id, name, club_id, category_id, sell_price, purchase_price, quantity, low_stock_alert, barcode, image_url, status, created_at, updated_at, category:product_categories(id, name)')
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

  async update(id: string, payload: Partial<Product>, clubId?: string): Promise<Product> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { category: _cat, ...rest } = payload as Product & { category?: unknown }
    let q = dbAdmin
      .from('products')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (clubId) q = q.eq('club_id', clubId)
    const { data, error } = await q.select().single()
    if (error) throw error
    return data
  },

  async delete(id: string, clubId?: string): Promise<void> {
    let q = dbAdmin.from('products').delete().eq('id', id)
    if (clubId) q = q.eq('club_id', clubId)
    const { error } = await q
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

  async createCategory(clubId: string, name: string): Promise<ProductCategory> {
    const { data, error } = await dbAdmin
      .from('product_categories')
      .insert({ club_id: clubId, name })
      .select()
      .single()
    if (error) throw error
    return data
  },
}
