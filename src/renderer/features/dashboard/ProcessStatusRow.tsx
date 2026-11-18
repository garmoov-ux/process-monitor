import React from 'react'
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
  ProcessRuntimeStatus,
  ProcessTargetConfig,
  ProcessTargetState
} from '@shared/types/domain'

interface ProcessStatusRowProps {
  item: ProcessRuntimeStatus
  onEditTarget: (target: ProcessTargetConfig) => void
  onDeleteTarget: (targetId: string) => void
  onToggleTargetEnabled: (targetId: string, enabled: boolean) => void
  onControlTarget: (targetId: string, command: 'START' | 'STOP' | 'RESTART') => void
  onResetCircuit: (targetId: string) => void
  onOpenExeLocation: (execPath: string) => void
}

function getStateBadgeMeta(state: ProcessTargetState): { label: string; className: string } {
  switch (state) {
    case 'RUNNING':
      return {
        label: '정상 가동',
        className: 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
      }
    case 'STARTUP_GRACE':
      return {
        label: '구동 유예',
        className: 'bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]'
      }
    case 'RESTART_PENDING':
      return {
        label: '재시작 대기',
        className: 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
      }
    case 'HUNG_DETECTED':
      return {
        label: '응답 없음',
        className: 'bg-[#ffe4e6] text-[#be123c] border border-[#fecdd3]'
      }
    case 'STOPPING':
      return {
        label: '종료 대기',
        className: 'bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1]'
      }
    case 'CIRCUIT_OPEN':
      return {
        label: '연속실패 차단',
        className: 'bg-[#ffe4e6] text-[#be123c] border border-[#fda4af]'
      }
    case 'INVALID_PATH':
      return {
        label: '경로 오류',
        className: 'bg-[#ffe4e6] text-[#be123c] border border-[#fecdd3]'
      }
    case 'PAUSED':
    default:
      return {
        label: '일시정지',
        className: 'bg-[#f1f5f9] text-[#64748b] border border-[#cbd5e1]'
      }
  }
}

function formatDuration(sec: number): string {
  if (!sec || sec <= 0) return '-'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${h}시간 ${m}분`
  if (m > 0) return `${m}분 ${s}초`
  return `${s}초`
}

const iconBtnCls =
  'w-[24px] h-[24px] rounded-[5px] bg-[#f8fafc] hover:bg-[#e2e8f0] border border-[#cbd5e1] text-[#334155] inline-flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none'

export const ProcessStatusRow: React.FC<ProcessStatusRowProps> = ({
  item,
  onEditTarget,
  onDeleteTarget,
  onToggleTargetEnabled,
  onControlTarget,
  onResetCircuit,
  onOpenExeLocation
}) => {
  const badge = getStateBadgeMeta(item.state)
  const memText = item.memoryKb > 0 ? `${(item.memoryKb / 1024).toFixed(1)} 메가` : '-'

  return (
    <tr className="hover:bg-[#f8fafc] transition-colors">
      <td className="py-2 px-3 align-middle whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded-[5px] text-[11px] font-bold whitespace-nowrap ${badge.className}`}
          >
            {badge.label}
          </span>
          <button
            type="button"
            onClick={() => onToggleTargetEnabled(item.target.id, !item.target.enabled)}
            title={item.target.enabled ? '클릭 시 개별 감시 일시정지' : '클릭 시 개별 감시 시작'}
            className={`h-[20px] px-1.5 rounded-[4px] text-[10px] font-semibold border cursor-pointer transition-colors ${
              item.target.enabled
                ? 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]'
                : 'bg-[#f1f5f9] text-[#64748b] border-[#cbd5e1]'
            }`}
          >
            {item.target.enabled ? '감시중' : '꺼짐'}
          </button>
        </div>
      </td>

      <td className="py-2 px-3 align-middle truncate">
        <div className="font-bold text-[#0f172a] truncate" title={item.target.name}>
          {item.target.name}
        </div>
        <div className="text-[11px] text-[#64748b] truncate" title={item.target.execPath}>
          {item.target.execPath}
        </div>
      </td>

      <td className="py-2 px-3 align-middle truncate">
        <div className="font-semibold text-[#334155] truncate">
          {item.target.watchProcessName || item.target.processName}
        </div>
        <div className="text-[11px] text-[#64748b]">번호: {item.pid ?? '미실행'}</div>
      </td>

      <td className="py-2 px-3 align-middle truncate">
        <div className="text-[#334155] font-medium truncate">
          {item.detectedWindowTitle || '-'}
        </div>
        <div className="text-[11px] text-[#64748b] truncate">
          {item.pid
            ? item.responding
              ? '응답 양호'
              : `응답 없음 (${item.consecutiveHungCount}/${item.target.hungThresholdCount})`
            : item.lastMessage}
        </div>
      </td>

      <td className="py-2 px-3 align-middle whitespace-nowrap">
        <div className="text-[#0f172a] font-semibold">{formatDuration(item.uptimeSec)}</div>
        <div className="text-[11px] text-[#64748b]">{memText}</div>
      </td>

      <td className="py-2 px-3 align-middle truncate">
        <div className="text-[#0f172a] font-semibold truncate">재시작 {item.totalRestartCount}회</div>
        <div className="text-[11px] text-[#2563eb] font-medium truncate">
          {item.countdownSec > 0
            ? `카운트: ${item.countdownSec}초`
            : item.target.periodicRestartEnabled && item.periodicRemainingSec != null
              ? `주기: ${formatDuration(item.periodicRemainingSec)} 후`
              : item.target.periodicRestartEnabled
                ? `주기: ${formatDuration(item.target.periodicRestartIntervalSec ?? 3600)}`
                : `유예 ${item.target.startupGraceSec}초 · 대기 ${item.target.restartDelaySec}초`}
        </div>
      </td>

      <td className="py-2 px-3 align-middle whitespace-nowrap text-right">
        <div className="inline-flex items-center justify-end gap-1">
          {item.state === 'CIRCUIT_OPEN' && (
            <button
              type="button"
              onClick={() => onResetCircuit(item.target.id)}
              title="연속 실패 차단 해제"
              className="h-[24px] px-2 rounded-[5px] bg-[#2563eb] text-white text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>해제</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onControlTarget(item.target.id, 'START')}
            disabled={Boolean(item.pid)}
            title="수동 시작"
            className={iconBtnCls}
          >
            <Play className="w-3 h-3 text-[#059669]" />
          </button>

          <button
            type="button"
            onClick={() => onControlTarget(item.target.id, 'RESTART')}
            title="단계별 종료 후 재시작"
            className={iconBtnCls}
          >
            <RotateCcw className="w-3 h-3 text-[#2563eb]" />
          </button>

          <button
            type="button"
            onClick={() => onControlTarget(item.target.id, 'STOP')}
            disabled={!item.pid}
            title="정상 종료 유도 (미종료 시 강제 종료)"
            className={iconBtnCls}
          >
            <Square className="w-3 h-3 text-[#e11d48]" />
          </button>

          <button
            type="button"
            onClick={() => onOpenExeLocation(item.target.execPath)}
            title="실행 파일 폴더 열기"
            className={iconBtnCls}
          >
            <FolderOpen className="w-3 h-3 text-[#475569]" />
          </button>

          <button
            type="button"
            onClick={() => onEditTarget(item.target)}
            title="대상 설정 수정"
            className={iconBtnCls}
          >
            <Edit3 className="w-3 h-3 text-[#0f172a]" />
          </button>

          <button
            type="button"
            onClick={() => onDeleteTarget(item.target.id)}
            title="목록에서 삭제"
            className={iconBtnCls}
          >
            <Trash2 className="w-3 h-3 text-[#e11d48]" />
          </button>
        </div>
      </td>
    </tr>
  )
}
