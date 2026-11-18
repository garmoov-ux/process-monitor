import React from 'react'

interface OptionChipProps {
  label?: string
  count?: number
  selected?: boolean
  onClick?: () => void
  children?: React.ReactNode
}

export const OptionChip: React.FC<OptionChipProps> = ({
  label,
  count,
  selected = false,
  onClick,
  children
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-[25px] px-2.5 rounded-[6px] text-[11px] whitespace-nowrap shrink-0 inline-flex items-center gap-1 transition-all duration-150 active:scale-95 cursor-pointer select-none ${
        selected
          ? 'bg-[#2563eb] text-white font-semibold border border-[#3b82f6]'
          : 'bg-[#1e293b]/80 hover:bg-[#334155] text-slate-300 font-medium border border-[#334155]'
      }`}
    >
      {children ?? (
        <>
          <span>{label}</span>
          {count !== undefined && (
            <span className={`text-[10.5px] ${selected ? 'text-blue-100' : 'text-slate-400'}`}>
              {count.toLocaleString()}
            </span>
          )}
        </>
      )}
    </button>
  )
}
