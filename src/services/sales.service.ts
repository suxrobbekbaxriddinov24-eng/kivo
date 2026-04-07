import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { Sale, PaymentMethod } from '@/types/database'
import { startOfDayISO, startOfMonthISO, isValidUUID, roundMoney } from '@/lib/utils'
const dbAdmin = (supabaseAdmin ?? supabase) as any

export interface BarSaleItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  purchase_price: number
}

export interface CreateBarSalePayload {
  club_id: string
  branch_id?: string
  customer_id?: string
  items: BarSaleItem[]
  payment_method: PaymentMethod
  discount_pct: number
  sold_by: string
}

export type FinancePeriod = 'today' | 'week' | 'month' | 'year'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export const salesService = {
  async createBarSale(payload: CreateBarSalePayload): Promise<void> {
    const rows = payload.items.map((item) => {
      const gross = roundMoney(item.unit_price * item.quantity)
      const discount = roundMoney(gross * payload.discount_pct / 100)
      return {
        club_id: payload.club_id,
        branch_id: payload.branch_id ?? null,
        type: 'bar' as const,
        customer_id: payload.customer_id ?? null,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_pct: payload.discount_pct,
        amount: gross - discount,
        purchase_cost: roundMoney(item.purchase_price * item.quantity),
        payment_method: payload.payment_method,
        // Only write a real UUID to the FK column
        sold_by: isValidUUID(payload.sold_by) ? payload.sold_by : null,
      }
    })
    // Validate stock server-side
    for (const item of payload.items) {
      const { data: prod } = await dbAdmin.from('products').select('quantity').eq('id', item.product_id).single()
      if (!prod || prod.quantity < item.quantity) {
        throw new Error(`"${item.product_name}" mahsuloti yetarli emas (${prod?.quantity ?? 0} ta qoldi)`)
      }
    }

    const { error } = await dbAdmin.from('sales').insert(rows)
    if (error) throw error
  },

  async list(clubId: string, period: FinancePeriod = 'month', limit = 200): Promise<Sale[]> {
    const from = periodStart(period)
    const { data, error } = await db
      .from('sales')
      .select('*, customer:customers(first_name,last_name), seller:profiles(full_name)')
      .eq('club_id', clubId)
      .gte('created_at', from)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data ?? []
  },

  async stats(clubId: string): Promise<{
    todayRevenue: number
    monthRevenue: number
    todayCount: number
    activeSubscriptions: number
  }> {
    const today = startOfDayISO()
    const month = startOfMonthISO()
    const now = new Date().toISOString()

    const [todaySales, monthSales, activeSubs] = await Promise.all([
      dbAdmin.from('sales').select('amount').eq('club_id', clubId).gte('created_at', today),
      dbAdmin.from('sales').select('amount').eq('club_id', clubId).gte('created_at', month),
      dbAdmin.from('subscriptions').select('id', { count: 'exact' })
        .eq('club_id', clubId).eq('status', 'active').gt('expires_at', now),
    ])

    const todayRevenue = (todaySales.data ?? []).reduce((s: number, r: { amount: number }) => s + (r.amount ?? 0), 0)
    const monthRevenue = (monthSales.data ?? []).reduce((s: number, r: { amount: number }) => s + (r.amount ?? 0), 0)

    return {
      todayRevenue,
      monthRevenue,
      todayCount: todaySales.data?.length ?? 0,
      activeSubscriptions: activeSubs.count ?? 0,
    }
  },

  async todayVisits(clubId: string): Promise<{ id: string; checked_in_at: string; customer_id: string }[]> {
    const today = startOfDayISO()
    const { data, error } = await dbAdmin
      .from('visits')
      .select('id, checked_in_at, customer_id')
      .eq('club_id', clubId)
      .gte('checked_in_at', today)
      .order('checked_in_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async todayRevenueByType(clubId: string): Promise<{ subscriptions: number; bar: number }> {
    const today = startOfDayISO()
    const { data } = await dbAdmin
      .from('sales')
      .select('amount, type')
      .eq('club_id', clubId)
      .gte('created_at', today)
    const rows = (data ?? []) as { amount: number; type: string }[]
    return {
      subscriptions: rows.filter(r => r.type === 'subscription').reduce((s, r) => s + r.amount, 0),
      bar: rows.filter(r => r.type === 'bar').reduce((s, r) => s + r.amount, 0),
    }
  },
}

function periodStart(period: FinancePeriod): string {
  const now = new Date()
  switch (period) {
    case 'today': return startOfDayISO(now)
    case 'week': {
      const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString()
    }
    case 'month': return startOfMonthISO(now)
    case 'year': {
      const d = new Date(now.getFullYear(), 0, 1); return d.toISOString()
    }
  }
}
