import React from 'react'
import { RefreshCw } from 'lucide-react'
import { RunningProcessSnapshot } from '@shared/types/domain'
import { PillButton } from '../../components/ui/PillButton'
import { SearchInput } from '../../components/ui/SearchInput'

interface RunningProcessPickerTabProps {
  runningList: RunningProcessSnapshot[]
  scanning: boolean
  searchQuery: string
  onSearchChange: (q: string) => void
  onRefresh: () => void
  onSelectProcess: (proc: RunningProcessSnapshot) => void
}

export const RunningProcessPickerTab: React.FC<RunningProcessPickerTabProps> = ({
  runningList,
  scanning,
  searchQuery,
  onSearchChange,
  onRefresh,
  onSelectProcess
}) => {
  return (
    <div className="flex-1 min-h-0 flex flex-col px-4 py-3 gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="실행 중인 프로세스명, 창 타이틀, 경로 검색..."
          className="flex-1"
        />
        <PillButton variant="pearl-capsule" size="sm" onClick={onRefresh}>
          <RefreshCw className={`w-3 h-3 text-[#38bdf8] ${scanning ? 'animate-spin' : ''}`} />
          <span>새로고침</span>
        </PillButton>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto border border-[#1e293b] rounded-[8px] bg-[#0b0f19]">
        <table className="w-full text-left border-collapse text-[11.5px]">
          <thead className="sticky top-0 bg-[#111827] border-b border-[#1e293b] text-slate-300">
            <tr>
              <th className="py-1.5 px-2.5 font-semibold whitespace-nowrap">프로세스명 (번호)</th>
              <th className="py-1.5 px-2.5 font-semibold whitespace-nowrap">창 타이틀</th>
              <th className="py-1.5 px-2.5 font-semibold whitespace-nowrap">실행 파일 경로</th>
              <th className="py-1.5 px-2.5 font-semibold whitespace-nowrap text-right">선택</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]/70">
            {runningList.map((proc) => (
              <tr key={proc.pid} className="hover:bg-[#1e293b]/40">
                <td className="py-1.5 px-2.5 whitespace-nowrap font-medium text-slate-200">
                  {proc.processName} <span className="text-slate-500">({proc.pid})</span>
                </td>
                <td className="py-1.5 px-2.5 max-w-[180px] truncate text-slate-300">
                  {proc.windowTitle || '-'}
                </td>
                <td
                  className="py-1.5 px-2.5 max-w-[260px] truncate text-slate-400"
                  title={proc.execPath}
                >
                  {proc.execPath || '권한 제한 또는 시스템 프로세스'}
                </td>
                <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                  <PillButton
                    variant="primary"
                    size="sm"
                    onClick={() => onSelectProcess(proc)}
                  >
                    선택
                  </PillButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
