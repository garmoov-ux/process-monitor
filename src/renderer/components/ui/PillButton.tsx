import React from 'react'

export type PillButtonVariant = 'primary' | 'secondary-pill' | 'dark-utility' | 'pearl-capsule'

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: PillButtonVariant
  size?: 'sm' | 'md'
  children: React.ReactNode
}

export const PillButton: React.FC<PillButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center gap-1 font-medium whitespace-nowrap shrink-0 transition-all duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#38bdf8] disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none'

  const sizeClass =
    size === 'sm'
      ? 'h-[26px] px-2.5 text-[11.5px] leading-none rounded-[6px]'
      : 'h-[30px] px-3.5 text-[12px] leading-none rounded-[7px]'

  const variantMap: Record<PillButtonVariant, string> = {
    primary: 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white border border-[#3b82f6]/40',
    'secondary-pill':
      'bg-[#1e293b] hover:bg-[#334155] text-[#38bdf8] border border-[#38bdf8]/40',
    'dark-utility': 'bg-[#0f172a] hover:bg-[#1e293b] text-slate-200 border border-[#334155]',
    'pearl-capsule':
      'bg-[#1e293b]/90 hover:bg-[#334155] text-slate-200 border border-[#334155]'
  }

  return (
    <button className={`${base} ${sizeClass} ${variantMap[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
