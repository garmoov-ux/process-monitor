import React, { useMemo, useState } from 'react'
import {
  Edit3,
  FolderOpen,
  Play,
  RotateCcw,
  ShieldAlert,
  Square,
  Trash2
} from 'lucide-react'
import {
  DashboardSummary,
  ProcessRuntimeStatus,
  ProcessTargetConfig,
  ProcessTargetState
} from '@shared/types/domain'
import { UtilityCard } from '../../components/ui/UtilityCard'
import { OptionChip } from '../../components/ui/OptionChip'
import { SearchInput } from '../../components/ui/SearchInput'
import { PillButton } from '../../components/ui/PillButton'
import { DashboardHeroTile } from './DashboardHeroTile'

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

function getStateBadgeMeta(state: ProcessTargetState): { label: string; className: string } {
  switch (state) {
    case 'RUNNING':
      return {
        label: '정상 가동',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      }
    case 'STARTUP_GRACE':
      return {
        label: '구동 유예 중',
        className: 'bg-blue-50 text-[#0066cc] border border-blue-200'
      }
    case 'RESTART_PENDING':
      return {
        label: '재시작 대기',
        className: 'bg-amber-50 text-amber-700 border border-amber-200'
      }
    case 'HUNG_DETECTED':
      return {
        label: '응답 없음 감지',
        className: 'bg-rose-50 text-rose-700 border border-rose-200'
      }
    case 'STOPPING':
      return {
        label: '종료 처리 중',
        className: 'bg-slate-100 text-slate-700 border border-slate-300'
      }
    case 'CIRCUIT_OPEN':
      return {
        label: '연속 실패 차단',
        className: 'bg-rose-100 text-rose-800 border border-rose-300'
      }
    case 'INVALID_PATH':
      return {
        label: '경로 오류',
        className: 'bg-rose-50 text-rose-700 border border-rose-200'
      }
    case 'PAUSED':
    default:
      return {
        label: '감시 일시정지',
        className: 'bg-[#f5f5f7] text-[#7a7a7a] border border-[#e0e0e0]'
      }
  }
}

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '-'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}시간 ${m}분 ${s}초`
  if (m > 0) return `${m}분 ${s}초`
  return `${s}초`
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
                filtered.map((item) => {
                  const badge = getStateBadgeMeta(item.state)
                  const memMb = item.memoryKb > 0 ? `${(item.memoryKb / 1024).toFixed(1)} MB` : '-'

                  return (
                    <tr key={item.target.id} className="hover:bg-[#fafafc]">
                      <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold whitespace-nowrap ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                          <label className="inline-flex items-center gap-1.5 text-[11px] text-[#7a7a7a] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.target.enabled}
                              onChange={(e) =>
                                onToggleTargetEnabled(item.target.id, e.target.checked)
                              }
                              className="accent-[#0066cc] cursor-pointer"
                            />
                            <span>{item.target.enabled ? '자동 감시 켜짐' : '자동 감시 꺼짐'}</span>
                          </label>
                        </div>
                      </td>

                      <td className="py-3 px-3.5 align-middle max-w-[290px]">
                        <div className="font-semibold text-[#1d1d1f] truncate">
                          {item.target.name}
                        </div>
                        <div
                          className="text-[11.5px] text-[#7a7a7a] truncate mt-0.5"
                          title={item.target.execPath}
                        >
                          {item.target.execPath}
                        </div>
                        {item.target.args && (
                          <div className="text-[11px] text-[#0066cc] truncate">
                            인자: {item.target.args}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                        <div className="font-medium text-[#1d1d1f]">
                          {item.target.watchProcessName || item.target.processName}
                        </div>
                        <div className="text-[11.5px] text-[#7a7a7a]">
                          프로세스 번호: {item.pid ?? '미실행'}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 align-middle max-w-[210px]">
                        <div className="text-[#1d1d1f] truncate">
                          {item.detectedWindowTitle || '창 타이틀 없음'}
                        </div>
                        <div className="text-[11.5px] text-[#7a7a7a] whitespace-nowrap">
                          {item.pid
                            ? item.responding
                              ? '응답 상태: 양호'
                              : `응답 없음 (${item.consecutiveHungCount}/${item.target.hungThresholdCount}회)`
                            : item.lastMessage}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                        <div className="text-[#1d1d1f] font-medium">
                          {formatDuration(item.uptimeSec)}
                        </div>
                        <div className="text-[11.5px] text-[#7a7a7a]">메모리: {memMb}</div>
                      </td>

                      <td className="py-3 px-3.5 align-middle whitespace-nowrap">
                        <div className="text-[#1d1d1f] font-medium">
                          누적 재시작: {item.totalRestartCount}회
                        </div>
                        <div className="text-[11.5px] text-[#0066cc]">
                          {item.countdownSec > 0
                            ? `대기 카운트다운: ${item.countdownSec}초`
                            : `유예 ${item.target.startupGraceSec}초 / 대기 ${item.target.restartDelaySec}초`}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 align-middle whitespace-nowrap text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {item.state === 'CIRCUIT_OPEN' && (
                            <PillButton
                              variant="primary"
                              size="sm"
                              onClick={() => onResetCircuit(item.target.id)}
                              title="연속 실패 차단 해제"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>차단 해제</span>
                            </PillButton>
                          )}

                          <PillButton
                            variant="pearl-capsule"
                            size="sm"
                            onClick={() => onControlTarget(item.target.id, 'START')}
                            disabled={Boolean(item.pid)}
                            title="수동 실행"
                          >
                            <Play className="w-3.5 h-3.5 text-[#0066cc]" />
                            <span>시작</span>
                          </PillButton>

                          <PillButton
                            variant="pearl-capsule"
                            size="sm"
                            onClick={() => onControlTarget(item.target.id, 'RESTART')}
                            title="단계별 종료 후 재실행"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-[#0066cc]" />
                            <span>재시작</span>
                          </PillButton>

                          <PillButton
                            variant="pearl-capsule"
                            size="sm"
                            onClick={() => onControlTarget(item.target.id, 'STOP')}
                            disabled={!item.pid}
                            title="정상 종료 유도 (미종료 시 강제 종료)"
                          >
                            <Square className="w-3.5 h-3.5 text-rose-600" />
                            <span>종료</span>
                          </PillButton>

                          <PillButton
                            variant="pearl-capsule"
                            size="sm"
                            onClick={() => onOpenExeLocation(item.target.execPath)}
                            title="실행 파일 위치 열기"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-[#7a7a7a]" />
                          </PillButton>

                          <PillButton
                            variant="pearl-capsule"
                            size="sm"
                            onClick={() => onEditTarget(item.target)}
                            title="설정 편집"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#1d1d1f]" />
                          </PillButton>

                          <PillButton
                            variant="pearl-capsule"
                            size="sm"
                            onClick={() => onDeleteTarget(item.target.id)}
                            title="목록에서 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          </PillButton>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </UtilityCard>
    </div>
  )
}
