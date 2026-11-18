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
import { PillButton } from '../../components/ui/PillButton'

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
        className: 'bg-emerald-500/15 text-[#34d399] border border-emerald-500/30'
      }
    case 'STARTUP_GRACE':
      return {
        label: '구동 유예',
        className: 'bg-sky-500/15 text-[#38bdf8] border border-sky-500/30'
      }
    case 'RESTART_PENDING':
      return {
        label: '재시작 대기',
        className: 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
      }
    case 'HUNG_DETECTED':
      return {
        label: '응답 없음',
        className: 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
      }
    case 'STOPPING':
      return {
        label: '종료 대기',
        className: 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
      }
    case 'CIRCUIT_OPEN':
      return {
        label: '연속실패 차단',
        className: 'bg-rose-500/25 text-rose-200 border border-rose-500/40'
      }
    case 'INVALID_PATH':
      return {
        label: '경로 오류',
        className: 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
      }
    case 'PAUSED':
    default:
      return {
        label: '일시정지',
        className: 'bg-slate-800 text-slate-400 border border-slate-700'
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
    <tr className="hover:bg-[#1e293b]/40">
      <td className="py-2 px-2.5 align-middle whitespace-nowrap">
        <div className="flex flex-col items-start gap-1">
          <span
            className={`px-2 py-0.5 rounded-[5px] text-[10.5px] font-semibold whitespace-nowrap ${badge.className}`}
          >
            {badge.label}
          </span>
          <label className="inline-flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={item.target.enabled}
              onChange={(e) => onToggleTargetEnabled(item.target.id, e.target.checked)}
              className="accent-[#2563eb] cursor-pointer w-3 h-3"
            />
            <span>{item.target.enabled ? '감시켜짐' : '감시꺼짐'}</span>
          </label>
        </div>
      </td>

      <td className="py-2 px-2.5 align-middle max-w-[200px]">
        <div className="font-semibold text-slate-100 truncate">{item.target.name}</div>
        <div className="text-[10.5px] text-slate-400 truncate" title={item.target.execPath}>
          {item.target.execPath}
        </div>
      </td>

      <td className="py-2 px-2.5 align-middle whitespace-nowrap">
        <div className="font-medium text-slate-200">
          {item.target.watchProcessName || item.target.processName}
        </div>
        <div className="text-[10.5px] text-slate-400">번호: {item.pid ?? '미실행'}</div>
      </td>

      <td className="py-2 px-2.5 align-middle max-w-[155px]">
        <div className="text-slate-200 truncate">{item.detectedWindowTitle || '-'}</div>
        <div className="text-[10.5px] text-slate-400 truncate">
          {item.pid
            ? item.responding
              ? '응답 양호'
              : `응답 없음 (${item.consecutiveHungCount}/${item.target.hungThresholdCount})`
            : item.lastMessage}
        </div>
      </td>

      <td className="py-2 px-2.5 align-middle whitespace-nowrap">
        <div className="text-slate-200 font-medium">{formatDuration(item.uptimeSec)}</div>
        <div className="text-[10.5px] text-slate-400">{memText}</div>
      </td>

      <td className="py-2 px-2.5 align-middle whitespace-nowrap">
        <div className="text-slate-200 font-medium">재시작 {item.totalRestartCount}회</div>
        <div className="text-[10.5px] text-[#38bdf8]">
          {item.countdownSec > 0
            ? `카운트: ${item.countdownSec}초`
            : `유예 ${item.target.startupGraceSec}초 / 대기 ${item.target.restartDelaySec}초`}
        </div>
      </td>

      <td className="py-2 px-2.5 align-middle whitespace-nowrap text-right">
        <div className="inline-flex items-center justify-end gap-1">
          {item.state === 'CIRCUIT_OPEN' && (
            <PillButton
              variant="primary"
              size="sm"
              onClick={() => onResetCircuit(item.target.id)}
              title="연속 실패 차단 해제"
            >
              <ShieldAlert className="w-3 h-3" />
              <span>해제</span>
            </PillButton>
          )}

          <PillButton
            variant="pearl-capsule"
            size="sm"
            onClick={() => onControlTarget(item.target.id, 'START')}
            disabled={Boolean(item.pid)}
            title="수동 시작"
          >
            <Play className="w-3 h-3 text-[#34d399]" />
          </PillButton>

          <PillButton
            variant="pearl-capsule"
            size="sm"
            onClick={() => onControlTarget(item.target.id, 'RESTART')}
            title="단계별 종료 후 재시작"
          >
            <RotateCcw className="w-3 h-3 text-[#38bdf8]" />
          </PillButton>

          <PillButton
            variant="pearl-capsule"
            size="sm"
            onClick={() => onControlTarget(item.target.id, 'STOP')}
            disabled={!item.pid}
            title="정상 종료 유도 (미종료 시 강제 종료)"
          >
            <Square className="w-3 h-3 text-rose-400" />
          </PillButton>

          <PillButton
            variant="pearl-capsule"
            size="sm"
            onClick={() => onOpenExeLocation(item.target.execPath)}
            title="실행 파일 폴더 열기"
          >
            <FolderOpen className="w-3 h-3 text-slate-400" />
          </PillButton>

          <PillButton
            variant="pearl-capsule"
            size="sm"
            onClick={() => onEditTarget(item.target)}
            title="대상 설정 수정"
          >
            <Edit3 className="w-3 h-3 text-slate-200" />
          </PillButton>

          <PillButton
            variant="pearl-capsule"
            size="sm"
            onClick={() => onDeleteTarget(item.target.id)}
            title="목록에서 삭제"
          >
            <Trash2 className="w-3 h-3 text-rose-400" />
          </PillButton>
        </div>
      </td>
    </tr>
  )
}
