import React, { useMemo, useState } from 'react'
import {
  DashboardSummary,
  ProcessRuntimeStatus,
  ProcessTargetConfig
} from '@shared/types/domain'
import { UtilityCard } from '../../components/ui/UtilityCard'
import { OptionChip } from '../../components/ui/OptionChip'
import { SearchInput } from '../../components/ui/SearchInput'
import { PillButton } from '../../components/ui/PillButton'
import { DashboardHeroTile } from './DashboardHeroTile'
import { ProcessStatusRow } from './ProcessStatusRow'

interface DashboardViewProps {
  summary: DashboardSummary
  processes: ProcessRuntimeStatus[]
  onOpenAddModal: () => void
  onEditTarget: (target: ProcessTargetConfig) => void
  onDeleteTarget: (targetId: string) => void
  onToggleTargetEnabled: (targetId: string, enabled: boolean) => void
  onControlTarget: (targetId: string, command: 'START' | 'STOP' | 'RESTART') => void
  onResetCircuit: (targetId: string) => void
  onSyncNtpNow: () => void
  onOpenExeLocation: (execPath: string) => void
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  processes,
  onOpenAddModal,
  onEditTarget,
  onDeleteTarget,
  onToggleTargetEnabled,
  onControlTarget,
  onResetCircuit,
  onSyncNtpNow,
  onOpenExeLocation
}) => {
  const [filterState, setFilterState] = useState<'ALL' | 'RUNNING' | 'PENDING' | 'ISSUE' | 'PAUSED'>('ALL')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return processes.filter((p) => {
      if (filterState === 'RUNNING' && p.state !== 'RUNNING') return false
      if (
        filterState === 'PENDING' &&
        p.state !== 'STARTUP_GRACE' &&
        p.state !== 'RESTART_PENDING' &&
        p.state !== 'STOPPING'
      )
        return false
      if (
        filterState === 'ISSUE' &&
        p.state !== 'HUNG_DETECTED' &&
        p.state !== 'CIRCUIT_OPEN' &&
        p.state !== 'INVALID_PATH'
      )
        return false
      if (filterState === 'PAUSED' && p.state !== 'PAUSED') return false

      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchName = p.target.name.toLowerCase().includes(q)
        const matchProc = p.target.processName.toLowerCase().includes(q)
        const matchPath = p.target.execPath.toLowerCase().includes(q)
        const matchTitle = (p.detectedWindowTitle || '').toLowerCase().includes(q)
        return matchName || matchProc || matchPath || matchTitle
      }
      return true
    })
  }, [processes, filterState, search])

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <DashboardHeroTile
        summary={summary}
        onOpenAddModal={onOpenAddModal}
        onSyncNtpNow={onSyncNtpNow}
      />

      <UtilityCard
        title="등록 프로세스 실시간 상태 및 개별 제어"
        rightAction={
          <div className="flex items-center gap-2">
            <OptionChip
              label="전체"
              count={summary.totalTargets}
              selected={filterState === 'ALL'}
              onClick={() => setFilterState('ALL')}
            />
            <OptionChip
              label="정상 가동"
              count={summary.runningCount}
              selected={filterState === 'RUNNING'}
              onClick={() => setFilterState('RUNNING')}
            />
            <OptionChip
              label="유예/대기"
              count={summary.graceOrPendingCount}
              selected={filterState === 'PENDING'}
              onClick={() => setFilterState('PENDING')}
            />
            <OptionChip
              label="장애/차단"
              count={summary.issueOrCircuitCount}
              selected={filterState === 'ISSUE'}
              onClick={() => setFilterState('ISSUE')}
            />
            <OptionChip
              label="일시정지"
              count={summary.pausedCount}
              selected={filterState === 'PAUSED'}
              onClick={() => setFilterState('PAUSED')}
            />
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="프로그램명, 프로세스명, 창 타이틀 검색..."
              className="w-[250px]"
            />
          </div>
        }
        className="flex-1 min-h-0"
      >
        <div className="flex-1 min-h-0 overflow-y-auto border border-[#e0e0e0] rounded-[14px]">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead className="sticky top-0 bg-[#f5f5f7] border-b border-[#e0e0e0] text-[#1d1d1f] z-10">
              <tr>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">감시 상태</th>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">프로그램명 / 실행 경로</th>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">프로세스명 (번호)</th>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">창 타이틀 / 응답 상태</th>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">가동 시간 / 메모리</th>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">타이머 / 재시작 횟수</th>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap text-right">개별 제어</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#7a7a7a]">
                    <p className="text-[14px] font-medium text-[#1d1d1f] mb-1">
                      표시할 감시 대상 프로세스가 없습니다.
                    </p>
                    <p className="text-[12.5px] mb-4">
                      우측 상단의 [+ 감시 대상 프로그램 추가] 버튼을 눌러 실행 중인 프로그램을 선택하거나 실행 파일을 등록하세요.
                    </p>
                    <PillButton variant="primary" size="sm" onClick={onOpenAddModal}>
                      + 첫 감시 프로세스 등록하기
                    </PillButton>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <ProcessStatusRow
                    key={item.target.id}
                    item={item}
                    onEditTarget={onEditTarget}
                    onDeleteTarget={onDeleteTarget}
                    onToggleTargetEnabled={onToggleTargetEnabled}
                    onControlTarget={onControlTarget}
                    onResetCircuit={onResetCircuit}
                    onOpenExeLocation={onOpenExeLocation}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </UtilityCard>
    </div>
  )
}
