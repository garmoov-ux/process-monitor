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
    <div className="flex-1 min-h-0 flex flex-col px-6 py-4 gap-3">
      <div className="flex items-center justify-between gap-2">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="실행 중인 프로세스명, 창 타이틀, 경로 검색..."
          className="flex-1"
        />
        <PillButton variant="pearl-capsule" size="sm" onClick={onRefresh}>
          <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
          <span>목록 새로고침</span>
        </PillButton>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto border border-[#e0e0e0] rounded-[12px]">
        <table className="w-full text-left border-collapse text-[12px]">
          <thead className="sticky top-0 bg-[#f5f5f7] border-b border-[#e0e0e0]">
            <tr>
              <th className="py-2 px-3 font-semibold whitespace-nowrap">프로세스명 (번호)</th>
              <th className="py-2 px-3 font-semibold whitespace-nowrap">창 타이틀</th>
              <th className="py-2 px-3 font-semibold whitespace-nowrap">실행 파일 경로</th>
              <th className="py-2 px-3 font-semibold whitespace-nowrap text-right">선택</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0e0e0]">
            {runningList.map((proc) => (
              <tr key={proc.pid} className="hover:bg-[#fafafc]">
                <td className="py-2 px-3 whitespace-nowrap font-medium text-[#1d1d1f]">
                  {proc.processName} <span className="text-[#7a7a7a]">({proc.pid})</span>
                </td>
                <td className="py-2 px-3 max-w-[200px] truncate text-[#1d1d1f]">
                  {proc.windowTitle || '-'}
                </td>
                <td
                  className="py-2 px-3 max-w-[280px] truncate text-[#7a7a7a]"
                  title={proc.execPath}
                >
                  {proc.execPath || '권한 제한 또는 시스템 프로세스'}
                </td>
                <td className="py-2 px-3 text-right whitespace-nowrap">
                  <PillButton
                    variant="primary"
                    size="sm"
                    onClick={() => onSelectProcess(proc)}
                  >
                    불러오기
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
