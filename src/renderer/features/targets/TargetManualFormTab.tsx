import React from 'react'
import { FolderSearch } from 'lucide-react'
import { WindowStyleOption } from '@shared/types/domain'
import { PillButton } from '../../components/ui/PillButton'

export interface TargetFormValues {
  name: string
  processName: string
  watchProcessName: string
  windowTitle: string
  execPath: string
  args: string
  workDir: string
  windowStyle: WindowStyleOption
  enabled: boolean
  restartDelaySec: number
  startupGraceSec: number
  gracefulTimeoutSec: number
  checkNotResponding: boolean
  hungThresholdCount: number
  maxRetriesInWindow: number
  retryWindowSec: number
}

interface TargetManualFormTabProps {
  values: TargetFormValues
  errorMsg: string | null
  onChange: <K extends keyof TargetFormValues>(key: K, val: TargetFormValues[K]) => void
  onPickExe: () => void
  onPickWorkDir: () => void
  onCancel: () => void
  onSubmit: (e: React.FormEvent) => void
}

export const TargetManualFormTab: React.FC<TargetManualFormTabProps> = ({
  values,
  errorMsg,
  onChange,
  onPickExe,
  onPickWorkDir,
  onCancel,
  onSubmit
}) => {
  return (
    <form onSubmit={onSubmit} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
      {errorMsg && (
        <div className="p-3 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px]">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
            프로그램 표시 이름
          </label>
          <input
            type="text"
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="예: 메인 제어 프로그램"
            className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px]"
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
            기본 프로세스명 (식별자 보조)
          </label>
          <input
            type="text"
            value={values.processName}
            onChange={(e) => onChange('processName', e.target.value)}
            placeholder="예: MainController.exe"
            className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px]"
          />
        </div>
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
          실행 파일 전체 경로 (.exe) [필수 식별자]
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={values.execPath}
            onChange={(e) => onChange('execPath', e.target.value)}
            placeholder="C:\App\Controller\MainController.exe"
            className="flex-1 h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px]"
          />
          <PillButton type="button" variant="pearl-capsule" size="sm" onClick={onPickExe}>
            <FolderSearch className="w-3.5 h-3.5 text-[#0066cc]" />
            <span>파일 찾아보기</span>
          </PillButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
            실행 옵션 (Arguments)
          </label>
          <input
            type="text"
            value={values.args}
            onChange={(e) => onChange('args', e.target.value)}
            placeholder="예: --mode=production"
            className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px]"
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
            작업 폴더 (Working Directory)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={values.workDir}
              onChange={(e) => onChange('workDir', e.target.value)}
              placeholder="C:\App\Controller"
              className="flex-1 h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px]"
            />
            <PillButton type="button" variant="pearl-capsule" size="sm" onClick={onPickWorkDir}>
              폴더 선택
            </PillButton>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
            창 타이틀 (UI 보조 표시용)
          </label>
          <input
            type="text"
            value={values.windowTitle}
            onChange={(e) => onChange('windowTitle', e.target.value)}
            placeholder="예: MainController v1.0"
            className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px]"
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
            런처 감시 대상 프로세스명 (선택)
          </label>
          <input
            type="text"
            value={values.watchProcessName}
            onChange={(e) => onChange('watchProcessName', e.target.value)}
            placeholder="런처 사용 시 실제 프로세스명"
            className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px]"
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
            실행 시 창 표시 모드
          </label>
          <select
            value={values.windowStyle}
            onChange={(e) => onChange('windowStyle', e.target.value as WindowStyleOption)}
            className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px] bg-white"
          >
            <option value="normal">기본 창으로 실행</option>
            <option value="minimized">최소화 상태로 실행</option>
            <option value="hidden">백그라운드 숨김 실행</option>
          </select>
        </div>
      </div>

      <div className="p-3.5 rounded-[14px] bg-[#f5f5f7] border border-[#e0e0e0] grid grid-cols-4 gap-3">
        <div>
          <label className="block text-[11.5px] font-semibold text-[#1d1d1f] mb-1 whitespace-nowrap">
            재시작 대기 시간(초)
          </label>
          <input
            type="number"
            min={1}
            max={600}
            value={values.restartDelaySec}
            onChange={(e) => onChange('restartDelaySec', Number(e.target.value))}
            className="w-full h-[32px] px-2.5 rounded-[8px] border border-[#e0e0e0] bg-white text-[12.5px]"
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-semibold text-[#1d1d1f] mb-1 whitespace-nowrap">
            초기 구동 유예 시간(초)
          </label>
          <input
            type="number"
            min={1}
            max={600}
            value={values.startupGraceSec}
            onChange={(e) => onChange('startupGraceSec', Number(e.target.value))}
            className="w-full h-[32px] px-2.5 rounded-[8px] border border-[#e0e0e0] bg-white text-[12.5px]"
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-semibold text-[#1d1d1f] mb-1 whitespace-nowrap">
            정상 종료 유예 시간(초)
          </label>
          <input
            type="number"
            min={1}
            max={120}
            value={values.gracefulTimeoutSec}
            onChange={(e) => onChange('gracefulTimeoutSec', Number(e.target.value))}
            className="w-full h-[32px] px-2.5 rounded-[8px] border border-[#e0e0e0] bg-white text-[12.5px]"
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-semibold text-[#1d1d1f] mb-1 whitespace-nowrap">
            응답 없음 연속 감지 횟수
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={values.hungThresholdCount}
            onChange={(e) => onChange('hungThresholdCount', Number(e.target.value))}
            className="w-full h-[32px] px-2.5 rounded-[8px] border border-[#e0e0e0] bg-white text-[12.5px]"
          />
        </div>
      </div>

      <div className="p-3.5 rounded-[14px] bg-[#f5f5f7] border border-[#e0e0e0] grid grid-cols-3 gap-3 items-center">
        <div>
          <label className="block text-[11.5px] font-semibold text-[#1d1d1f] mb-1 whitespace-nowrap">
            연속 실패 판정 시간 창(초)
          </label>
          <input
            type="number"
            min={10}
            max={3600}
            value={values.retryWindowSec}
            onChange={(e) => onChange('retryWindowSec', Number(e.target.value))}
            className="w-full h-[32px] px-2.5 rounded-[8px] border border-[#e0e0e0] bg-white text-[12.5px]"
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-semibold text-[#1d1d1f] mb-1 whitespace-nowrap">
            시간 창 내 최대 허용 재시작(회)
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={values.maxRetriesInWindow}
            onChange={(e) => onChange('maxRetriesInWindow', Number(e.target.value))}
            className="w-full h-[32px] px-2.5 rounded-[8px] border border-[#e0e0e0] bg-white text-[12.5px]"
          />
        </div>
        <div className="flex flex-col gap-1.5 pt-2">
          <label className="inline-flex items-center gap-2 text-[12px] text-[#1d1d1f] cursor-pointer">
            <input
              type="checkbox"
              checked={values.checkNotResponding}
              onChange={(e) => onChange('checkNotResponding', e.target.checked)}
              className="accent-[#0066cc]"
            />
            <span>응답 없음(멈춤) 감지 시 강제 재시작</span>
          </label>
          <label className="inline-flex items-center gap-2 text-[12px] text-[#1d1d1f] cursor-pointer">
            <input
              type="checkbox"
              checked={values.enabled}
              onChange={(e) => onChange('enabled', e.target.checked)}
              className="accent-[#0066cc]"
            />
            <span>저장 즉시 자동 감시 활성화</span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e0e0e0]">
        <PillButton type="button" variant="pearl-capsule" onClick={onCancel}>
          취소
        </PillButton>
        <PillButton type="submit" variant="primary">
          감시 대상 저장하기
        </PillButton>
      </div>
    </form>
  )
}
