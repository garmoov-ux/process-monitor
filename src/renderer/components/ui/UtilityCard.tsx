import React from 'react'

interface UtilityCardProps {
  title?: string
  badge?: React.ReactNode
  rightAction?: React.ReactNode
  dark?: boolean
  className?: string
  bodyClassName?: string
  children: React.ReactNode
}

export const UtilityCard: React.FC<UtilityCardProps> = ({
  title,
  badge,
  rightAction,
  dark = false,
  className = '',
  bodyClassName = '',
  children
}) => {
  const surfaceClass = dark
    ? 'bg-[#272729] text-white border border-[#3a3a3c]'
    : 'bg-[#ffffff] text-[#1d1d1f] border border-[#e0e0e0]'

  return (
    <section className={`rounded-[18px] p-5 flex flex-col min-h-0 ${surfaceClass} ${className}`}>
      {(title || rightAction) && (
        <header className="flex items-center justify-between gap-3 mb-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {title && (
              <h3 className="text-[15px] font-semibold tracking-[-0.015em] whitespace-nowrap">
                {title}
              </h3>
            )}
            {badge}
          </div>
          {rightAction && <div className="shrink-0 flex items-center gap-2">{rightAction}</div>}
        </header>
      )}
      <div className={`flex-1 min-h-0 flex flex-col ${bodyClassName}`}>{children}</div>
    </section>
  )
}
