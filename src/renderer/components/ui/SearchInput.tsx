import React from 'react'
import { Search } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = '검색...',
  className = ''
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-3 h-3 text-slate-400 absolute left-2.5 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-[26px] pl-7 pr-2.5 rounded-[6px] bg-[#0f172a] text-slate-100 text-[11.5px] border border-[#334155] focus:border-[#38bdf8] focus:outline-none placeholder:text-slate-500"
      />
    </div>
  )
}
