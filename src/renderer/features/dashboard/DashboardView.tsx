import React, { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  DashboardSummary,
  ProcessRuntimeStatus,
  ProcessTargetConfig
} from '@shared/types/domain'
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
    <div className="h-full p-3.5 w-full flex flex-col gap-3 min-h-0">
      <DashboardHeroTile
        summary={summary}
        onOpenAddModal={onOpenAddModal}
        onSyncNtpNow={onSyncNtpNow}
      />

      {/* 방법 A: 카드 안의 카드 느낌을 없앤 단일 테두리 테이블 시트 */}
      <section className="flex-1 min-h-0 bg-[#ffffff] border border-[#cbd5e1] rounded-[10px] overflow-hidden flex flex-col">
        <div className="px-3.5 py-2.5 border-b border-[#cbd5e1] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-[14.5px] font-bold text-[#0f172a] whitespace-nowrap">
              감시 프로세스 목록 및 실시간 제어
            </h2>
            <span className="text-[12px] text-[#64748b] whitespace-nowrap">
              표시 <strong className="text-[#0f172a]">{filtered.length}</strong>개
            </span>
            {summary.maintenanceMode && (
              <span className="px-2 py-0.5 rounded-[5px] bg-[#fef3c7] text-[#b45309] border border-[#fde68a] text-[11px] font-semibold whitespace-nowrap">
                전체 점검 모드 (자동 복구 일시정지)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
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
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="프로그램명 · 프로세스명 검색"
              className="w-[185px]"
            />
            <PillButton variant="primary" size="sm" onClick={onOpenAddModal}>
              <Plus className="w-3.5 h-3.5" />
              <span>대상 등록</span>
            </PillButton>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full table-fixed text-left border-collapse text-[12.5px]">
            <thead className="sticky top-0 bg-[#f1f5f9] border-b border-[#cbd5e1] text-[12px] font-semibold text-[#334155] z-10">
              <tr>
                <th className="w-[14%] py-2 px-3 whitespace-nowrap">상태 · 자동감시</th>
                <th className="w-[23%] py-2 px-3 whitespace-nowrap">프로그램명 · 실행 경로</th>
                <th className="w-[14%] py-2 px-3 whitespace-nowrap">프로세스 (번호)</th>
                <th className="w-[15%] py-2 px-3 whitespace-nowrap">창 제목 · 응답</th>
                <th className="w-[11%] py-2 px-3 whitespace-nowrap">가동 · 메모리</th>
                <th className="w-[11%] py-2 px-3 whitespace-nowrap">재시작 · 타이머</th>
                <th className="w-[12%] py-2 px-3 whitespace-nowrap text-right">개별 제어</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0] bg-[#ffffff]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#64748b]">
                    <p className="text-[13.5px] font-semibold text-[#0f172a] mb-1">
                      등록된 감시 대상 프로세스가 없습니다.
                    </p>
                    <p className="text-[12px] text-[#64748b] mb-3.5">
                      우측 상단 [대상 등록] 또는 좌측 사이드바의 [대상] 메뉴에서 실행 중인 프로그램을 선택해 바로 등록할 수 있습니다.
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
      </section>
    </div>
  )
}
