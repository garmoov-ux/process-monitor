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
      className={`h-[30px] px-3.5 rounded-full text-[12.5px] whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition-transform duration-150 active:scale-95 cursor-pointer select-none ${
        selected
          ? 'bg-[#0066cc] text-white font-semibold border border-[#0066cc]'
          : 'bg-[#fafafc] text-[#1d1d1f] font-medium border border-[#e0e0e0]'
      }`}
    >
      {children ?? (
        <>
          <span>{label}</span>
          {count !== undefined && (
            <span className={`text-[11px] ${selected ? 'text-white/90' : 'text-[#7a7a7a]'}`}>
              {count.toLocaleString()}
            </span>
          )}
        </>
      )}
    </button>
  )
}
