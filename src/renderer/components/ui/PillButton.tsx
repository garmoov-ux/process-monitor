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
    'inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap shrink-0 transition-all duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none'

  const sizeClass =
    size === 'sm'
      ? 'h-[28px] px-2.5 text-[12px] leading-none rounded-[6px]'
      : 'h-[32px] px-3.5 text-[12.5px] leading-none rounded-[7px]'

  const variantMap: Record<PillButtonVariant, string> = {
    primary: 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white',
    'secondary-pill':
      'bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#93c5fd]',
    'dark-utility': 'bg-[#0f172a] hover:bg-[#1e293b] text-white',
    'pearl-capsule':
      'bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#334155] border border-[#cbd5e1]'
  }

  return (
    <button className={`${base} ${sizeClass} ${variantMap[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
