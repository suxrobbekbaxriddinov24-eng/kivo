export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Naqd pul' },
  { value: 'card', label: 'Karta' },
  { value: 'transfer', label: "O'tkazma" },
] as const

export const PLAN_DURATIONS = [
  { value: 1, label: '1 oy', discountKey: 'm1' },
  { value: 3, label: '3 oy', discountKey: 'm3' },
  { value: 6, label: '6 oy', discountKey: 'm6' },
  { value: 12, label: '12 oy', discountKey: 'm12' },
] as const

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Erkak' },
  { value: 'female', label: 'Ayol' },
] as const

export const ENTITY_STATUS_OPTIONS = [
  { value: 'active', label: 'Faol', color: 'green' },
  { value: 'inactive', label: 'Nofaol', color: 'gray' },
  { value: 'suspended', label: 'Bloklangan', color: 'red' },
] as const

export const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  active: 'Faol',
  expired: 'Muddati tugagan',
  frozen: 'Muzlatilgan',
  cancelled: 'Bekor qilingan',
}

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  club_director: 'Rahbar',
  staff: 'Xodim',
}

export const PLAN_CATEGORY_OPTIONS = [
  { value: 'standart', label: 'Standart' },
  { value: 'premium', label: 'Premium' },
  { value: 'vip', label: 'VIP' },
] as const

export const PRODUCT_CATEGORY_OPTIONS = [
  { value: 'suv', label: 'Suv' },
  { value: 'protein', label: 'Protein' },
  { value: 'bar', label: 'Bar mahsulot' },
  { value: 'aksessuar', label: 'Aksessuar' },
  { value: 'ichimlik', label: 'Ichimlik' },
  { value: 'oziq', label: "Oziq-ovqat" },
] as const

export const PERIOD_OPTIONS = [
  { value: 'today', label: 'Bugun' },
  { value: 'week', label: 'Hafta' },
  { value: 'month', label: 'Oy' },
  { value: 'year', label: 'Yil' },
] as const

export const UZ_REGIONS = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Andijon viloyati",
  "Farg'ona viloyati",
  "Namangan viloyati",
  "Samarqand viloyati",
  "Buxoro viloyati",
  "Qashqadaryo viloyati",
  "Surxondaryo viloyati",
  "Navoiy viloyati",
  "Xorazm viloyati",
  "Jizzax viloyati",
  "Sirdaryo viloyati",
  "Qoraqalpog'iston Respublikasi",
] as const

export const DEFAULT_DISCOUNTS = { m1: 0, m3: 10, m6: 15, m12: 25 }

export const COLORS = {
  primary: '#6366f1',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  chart: ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'],
}
