import { forwardRef, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Phone } from 'lucide-react'

interface Props {
  label?: string
  error?: string
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

// Format: 90 123 45 67  (9 digits max)
function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 2) return digits
  if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`
  if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`
}

function stripPhone(formatted: string): string {
  return formatted.replace(/\D/g, '')
}

const PhoneInput = forwardRef<HTMLInputElement, Props>(
  ({ label, error, value = '', onChange, placeholder = '90 123 45 67', className, disabled }, ref) => {
    const inputId = label ? label.toLowerCase().replace(/\s/g, '-') : 'phone'

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      const digits = raw.replace(/\D/g, '').slice(0, 9)
      const formatted = formatPhone(digits)
      onChange?.(formatted)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, arrows, home, end
      const allowed = ['Backspace','Delete','Tab','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End']
      if (allowed.includes(e.key)) return
      // Block non-digit keys
      if (!/^\d$/.test(e.key)) e.preventDefault()
    }

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm text-gray-300 font-medium">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <Phone size={14} className="absolute left-3 text-gray-500 pointer-events-none" />
          <input
            ref={ref}
            id={inputId}
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88]/40 transition disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/40',
              className
            )}
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
PhoneInput.displayName = 'PhoneInput'
export default PhoneInput
export { formatPhone, stripPhone }
