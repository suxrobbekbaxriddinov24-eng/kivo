import { supabase, supabaseAdmin } from '@/lib/supabase'
import type { Subscription, PaymentMethod, Plan } from '@/types/database'
import { isValidUUID, roundMoney } from '@/lib/utils'
import { addDays } from 'date-fns'
const dbAdmin = (supabaseAdmin ?? supabase) as any

export interface CreateSubscriptionPayload {
  club_id: string
  customer_id: string
  plan: Plan
  duration_months: number
  discount_pct: number
  amount_paid: number
  payment_method: PaymentMethod
  sold_by: string
  notes?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export const subscriptionsService = {
  async create(payload: CreateSubscriptionPayload): Promise<Subscription> {
    const { plan, duration_months, ...rest } = payload
    const starts_at = new Date()
    const expires_at = plan.duration_type === 'daily'
      ? addDays(starts_at, plan.duration_value * duration_months)
      : null

    // Use Math.round to avoid floating point errors in money fields
    const amount_paid = roundMoney(rest.amount_paid)

    const { data: sub, error: subErr } = await dbAdmin
      .from('subscriptions')
      .insert({
        club_id: rest.club_id,
        customer_id: rest.customer_id,
        plan_id: plan.id,
        plan_name: plan.name,
        plan_price: plan.price,
        duration_type: plan.duration_type,
        duration_value: plan.duration_value * duration_months,
        discount_pct: rest.discount_pct,
        amount_paid,
        payment_method: rest.payment_method,
        starts_at: starts_at.toISOString(),
        expires_at: expires_at?.toISOString() ?? null,
        visits_total: plan.duration_type === 'visit_based' ? plan.duration_value * duration_months : null,
        visits_used: 0,
        status: 'active',
        // Only write a real UUID to the FK column
        sold_by: isValidUUID(rest.sold_by) ? rest.sold_by : null,
        notes: rest.notes ?? null,
      })
      .select()
      .single()
    if (subErr) throw subErr

    // Record sale
    await dbAdmin.from('sales').insert({
      club_id: rest.club_id,
      type: 'subscription',
      customer_id: rest.customer_id,
      subscription_id: sub.id,
      quantity: 1,
      unit_price: plan.price,
      discount_pct: rest.discount_pct,
      amount: amount_paid,
      purchase_cost: 0,
      payment_method: rest.payment_method,
      sold_by: isValidUUID(rest.sold_by) ? rest.sold_by : null,
    })

    return sub
  },

  async listForCustomer(customerId: string): Promise<Subscription[]> {
    const { data, error } = await db
      .from('subscriptions')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  async freeze(id: string): Promise<void> {
    const { error } = await dbAdmin
      .from('subscriptions')
      .update({ status: 'frozen', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async cancel(id: string): Promise<void> {
    const { error } = await dbAdmin
      .from('subscriptions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  },

  async expireStale(clubId: string): Promise<void> {
    const now = new Date().toISOString()
    await dbAdmin
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('club_id', clubId)
      .eq('status', 'active')
      .lt('expires_at', now)
  },
}
