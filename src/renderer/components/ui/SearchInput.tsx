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
  placeholder = '검색어를 입력하세요...',
  className = ''
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-3.5 h-3.5 text-[#7a7a7a] absolute left-3.5 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-[32px] pl-9 pr-3.5 rounded-full bg-[#ffffff] text-[#1d1d1f] text-[12.5px] border border-[#e0e0e0] focus:outline-2 focus:outline-[#0071e3] placeholder:text-[#7a7a7a]"
      />
    </div>
  )
}
