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
  className = '',
  bodyClassName = '',
  children
}) => {
  return (
    <section
      className={`rounded-[10px] p-3 bg-[#111827] text-slate-100 border border-[#1e293b] flex flex-col min-h-0 ${className}`}
    >
      {(title || rightAction) && (
        <header className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {title && (
              <h3 className="text-[13px] font-semibold tracking-[-0.015em] text-slate-100 whitespace-nowrap">
                {title}
              </h3>
            )}
            {badge}
          </div>
          {rightAction && <div className="shrink-0 flex items-center gap-1.5">{rightAction}</div>}
        </header>
      )}
      <div className={`flex-1 min-h-0 flex flex-col ${bodyClassName}`}>{children}</div>
    </section>
  )
}
