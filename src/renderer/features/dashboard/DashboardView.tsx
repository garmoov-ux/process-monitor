import React, { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
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
    <div className="flex-1 min-h-0 flex flex-col gap-2.5">
      <DashboardHeroTile
        summary={summary}
        onOpenAddModal={onOpenAddModal}
        onSyncNtpNow={onSyncNtpNow}
      />

      <UtilityCard
        title="감시 프로세스 목록"
        badge={
          summary.maintenanceMode ? (
            <span className="px-2 py-0.5 rounded-[5px] bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10.5px] font-medium">
              전체 점검 모드 (자동 복구 일시정지)
            </span>
          ) : undefined
        }
        rightAction={
          <div className="flex items-center gap-1.5">
            <OptionChip
              label="전체"
              count={summary.totalTargets}
              selected={filterState === 'ALL'}
              onClick={() => setFilterState('ALL')}
            />
            <OptionChip
              label="정상"
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
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="프로세스 검색..."
              className="w-[165px]"
            />
            <PillButton variant="primary" size="sm" onClick={onOpenAddModal}>
              <Plus className="w-3.5 h-3.5" />
              <span>등록</span>
            </PillButton>
          </div>
        }
        className="flex-1 min-h-0"
      >
        <div className="flex-1 min-h-0 overflow-y-auto border border-[#1e293b] rounded-[8px] bg-[#0b0f19]/60">
          <table className="w-full text-left border-collapse text-[11.5px]">
            <thead className="sticky top-0 bg-[#111827] border-b border-[#1e293b] text-slate-300 z-10">
              <tr>
                <th className="py-2 px-2.5 font-semibold whitespace-nowrap">상태</th>
                <th className="py-2 px-2.5 font-semibold whitespace-nowrap">프로그램명 / 경로</th>
                <th className="py-2 px-2.5 font-semibold whitespace-nowrap">프로세스 (번호)</th>
                <th className="py-2 px-2.5 font-semibold whitespace-nowrap">창 타이틀 / 응답</th>
                <th className="py-2 px-2.5 font-semibold whitespace-nowrap">가동 / 메모리</th>
                <th className="py-2 px-2.5 font-semibold whitespace-nowrap">재시작 / 타이머</th>
                <th className="py-2 px-2.5 font-semibold whitespace-nowrap text-right">제어</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/70">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    <p className="text-[13px] font-medium text-slate-200 mb-1">
                      등록된 감시 대상 프로세스가 없습니다.
                    </p>
                    <p className="text-[11.5px] text-slate-500 mb-3">
                      우측 상단 [등록] 또는 좌측 사이드바의 [대상추가] 버튼을 눌러 프로세스를 추가하세요.
                    </p>
                    <PillButton variant="primary" size="sm" onClick={onOpenAddModal}>
                      + 감시 프로세스 추가
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
