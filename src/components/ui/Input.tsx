import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  suffix?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, icon, suffix, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm text-gray-300 font-medium">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="absolute left-3 text-gray-500 pointer-events-none">{icon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            {...props}
            className={cn(
              'w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed',
              icon && 'pl-9',
              suffix && 'pr-12',
              error && 'border-red-500 focus:ring-red-500',
              className
            )}
          />
          {suffix && (
            <span className="absolute right-3 text-gray-400 text-sm pointer-events-none">{suffix}</span>
          )}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
export default Input
