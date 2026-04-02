import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { uz } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format number as UZS: 1 250 000 so'm */
export function formatCurrency(amount: number, currency = 'UZS'): string {
  return (
    new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(amount) +
    ` ${currency}`
  )
}

/** Format date as DD.MM.YYYY */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return format(d, 'dd.MM.yyyy')
}

/** Format datetime as DD.MM.YYYY HH:mm */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return format(d, 'dd.MM.yyyy HH:mm')
}

/** Human-readable relative time in Uzbek */
export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return `Kecha ${format(d, 'HH:mm')}`
  return formatDistanceToNow(d, { addSuffix: true, locale: uz })
}

/** Format Uzbek phone number */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10)}`
  }
  if (digits.length === 9) {
    return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)}-${digits.slice(5, 7)}-${digits.slice(7)}`
  }
  return phone
}

/** Days until a date (negative = expired) */
export function daysUntil(date: string | Date | null | undefined): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

/** Truncate string to N chars */
export function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + '…' : str
}

/** Generate initials from a full name */
export function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Start of day as ISO string */
export function startOfDayISO(date = new Date()): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Start of month as ISO string */
export function startOfMonthISO(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), 1)
  return d.toISOString()
}
