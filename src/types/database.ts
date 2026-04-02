// Auto-generated types matching Supabase schema.
// Run: npx supabase gen types typescript --project-id <id> > src/types/database.ts
// For now, this is a manually maintained type file.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type UserRole = 'super_admin' | 'club_director' | 'staff'
export type EntityStatus = 'active' | 'inactive' | 'suspended'
export type SaleType = 'subscription' | 'bar'
export type PaymentMethod = 'cash' | 'card' | 'transfer'
export type PlanDurationType = 'daily' | 'visit_based'
export type SubscriptionStatus = 'active' | 'expired' | 'frozen' | 'cancelled'

export interface Profile {
  id: string
  role: UserRole
  club_id: string | null
  branch_id: string | null
  full_name: string
  phone: string | null
  avatar_url: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
}

export interface Club {
  id: string
  name: string
  slug: string | null
  director_name: string | null
  phone: string | null
  email: string | null
  address: string | null
  region_id: string | null
  district_id: string | null
  tariff_id: string | null
  tariff_expires_at: string | null
  logo_url: string | null
  status: EntityStatus
  settings: ClubSettings
  created_at: string
  updated_at: string
}

export interface ClubSettings {
  currency: string
  timezone: string
  discounts: Record<string, number>
  locker_count: number
  gym_name?: string
}

export interface Branch {
  id: string
  club_id: string
  name: string
  address: string | null
  phone: string | null
  manager: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
}

export interface Region {
  id: string
  name: string
  created_at: string
}

export interface District {
  id: string
  region_id: string
  name: string
  created_at: string
}

export interface Currency {
  id: string
  code: string
  name: string
  symbol: string
  is_default: boolean
  rate: number
  created_at: string
  updated_at: string
}

export interface PlatformTariff {
  id: string
  name: string
  price: number
  period_days: number
  features: string[]
  status: EntityStatus
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  user_id: string | null
  full_name: string
  phone: string | null
  username: string
  region_id: string | null
  district_id: string | null
  schedule: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  club_id: string
  name: string
  price: number
  duration_type: PlanDurationType
  duration_value: number
  category: string | null
  amenities: string[]
  time_restricted: boolean
  start_time: string | null
  end_time: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  club_id: string
  branch_id: string | null
  first_name: string
  last_name: string | null
  phone: string | null
  photo_url: string | null
  gender: 'male' | 'female' | 'other' | null
  birth_date: string | null
  address: string | null
  locker_number: number | null
  notes: string | null
  status: EntityStatus
  created_at: string
  updated_at: string
  // Joined
  active_subscription?: Subscription | null
}

export interface Subscription {
  id: string
  club_id: string
  customer_id: string
  plan_id: string
  plan_name: string
  plan_price: number
  duration_type: PlanDurationType
  duration_value: number
  discount_pct: number
  amount_paid: number
  payment_method: PaymentMethod
  starts_at: string
  expires_at: string | null
  visits_total: number | null
  visits_used: number
  status: SubscriptionStatus
  sold_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Visit {
  id: string
  club_id: string
  branch_id: string | null
  customer_id: string
  subscription_id: string | null
  checked_in_at: string
  checked_out_at: string | null
  checked_in_by: string | null
  notes: string | null
  // Joined
  customer?: Pick<Customer, 'first_name' | 'last_name' | 'photo_url'>
}

export interface ProductCategory {
  id: string
  club_id: string
  name: string
  created_at: string
}

export interface Product {
  id: string
  club_id: string
  category_id: string | null
  name: string
  barcode: string | null
  image_url: string | null
  sell_price: number
  purchase_price: number
  quantity: number
  low_stock_alert: number
  status: EntityStatus
  created_at: string
  updated_at: string
  // Joined
  category?: ProductCategory | null
}

export interface Sale {
  id: string
  club_id: string
  branch_id: string | null
  type: SaleType
  customer_id: string | null
  subscription_id: string | null
  product_id: string | null
  product_name: string | null
  quantity: number
  unit_price: number
  discount_pct: number
  amount: number
  purchase_cost: number
  payment_method: PaymentMethod
  sold_by: string | null
  notes: string | null
  created_at: string
  // Joined
  customer?: Pick<Customer, 'first_name' | 'last_name'> | null
  seller?: Pick<Profile, 'full_name'> | null
}

export interface Notification {
  id: string
  club_id: string
  user_id: string | null
  type: string
  title: string
  body: string | null
  read: boolean
  metadata: Json
  created_at: string
}

type TableDef<T> = { Row: T; Insert: Partial<T>; Update: Partial<T> }

// Supabase DB generic type for createClient<Database>
export interface Database {
  public: {
    Tables: {
      profiles: TableDef<Profile>
      clubs: TableDef<Club>
      branches: TableDef<Branch>
      regions: TableDef<Region>
      districts: TableDef<District>
      currencies: TableDef<Currency>
      platform_tariffs: TableDef<PlatformTariff>
      agents: TableDef<Agent>
      plans: TableDef<Plan>
      customers: TableDef<Customer>
      subscriptions: TableDef<Subscription>
      visits: TableDef<Visit>
      product_categories: TableDef<ProductCategory>
      products: TableDef<Product>
      sales: TableDef<Sale>
      notifications: TableDef<Notification>
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Views: Record<string, any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Functions: Record<string, any>
    Enums: {
      user_role: UserRole
      entity_status: EntityStatus
      sale_type: SaleType
      payment_method: PaymentMethod
      plan_duration_type: PlanDurationType
      subscription_status: SubscriptionStatus
    }
  }
}
