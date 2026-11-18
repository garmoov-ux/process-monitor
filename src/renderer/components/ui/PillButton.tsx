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
    'inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap shrink-0 transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0071e3] disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none'

  const sizeClass =
    size === 'sm'
      ? 'h-[30px] px-3.5 text-[12.5px] leading-none'
      : 'h-[36px] px-4 text-[13px] leading-none'

  const variantMap: Record<PillButtonVariant, string> = {
    primary: 'bg-[#0066cc] text-white rounded-full',
    'secondary-pill':
      'bg-[#ffffff] text-[#0066cc] border border-[#0066cc] rounded-full',
    'dark-utility': 'bg-[#272729] text-white rounded-full',
    'pearl-capsule':
      'bg-[#fafafc] text-[#1d1d1f] border border-[#e0e0e0] rounded-full'
  }

  return (
    <button className={`${base} ${sizeClass} ${variantMap[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
