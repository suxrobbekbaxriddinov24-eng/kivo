import { cn } from '@/lib/utils'
import type { SelectHTMLAttributes } from 'react'
import { forwardRef } from 'react'

export interface Option { value: string; label: string }

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Option[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-sm text-gray-300 font-medium">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          {...props}
          className={cn(
            'w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed appearance-none',
            error && 'border-red-500 focus:ring-red-500',
            className
          )}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'
export default Select
