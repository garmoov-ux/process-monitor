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

const inputCls =
  'w-full h-[28px] px-2.5 rounded-[6px] bg-[#0b0f19] border border-[#334155] text-[12px] text-slate-100 focus:border-[#38bdf8] focus:outline-none'

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
    <form onSubmit={onSubmit} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3 text-[11.5px]">
      {errorMsg && (
        <div className="p-2.5 rounded-[7px] bg-rose-500/15 border border-rose-500/30 text-rose-300">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-slate-300 font-medium mb-1">프로그램 표시 이름</label>
          <input
            type="text"
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="예: 메인 제어 프로그램"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-slate-300 font-medium mb-1">기본 프로세스명 (식별자)</label>
          <input
            type="text"
            value={values.processName}
            onChange={(e) => onChange('processName', e.target.value)}
            placeholder="예: MainController.exe"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="block text-slate-300 font-medium mb-1">
          실행 파일 전체 경로 (.exe) [필수]
        </label>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={values.execPath}
            onChange={(e) => onChange('execPath', e.target.value)}
            placeholder="C:\App\Controller\MainController.exe"
            className={inputCls}
          />
          <PillButton type="button" variant="pearl-capsule" size="sm" onClick={onPickExe}>
            <FolderSearch className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>파일선택</span>
          </PillButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="block text-slate-300 font-medium mb-1">실행 옵션 (인자)</label>
          <input
            type="text"
            value={values.args}
            onChange={(e) => onChange('args', e.target.value)}
            placeholder="예: --mode=production"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-slate-300 font-medium mb-1">작업 폴더</label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={values.workDir}
              onChange={(e) => onChange('workDir', e.target.value)}
              placeholder="C:\App\Controller"
              className={inputCls}
            />
            <PillButton type="button" variant="pearl-capsule" size="sm" onClick={onPickWorkDir}>
              폴더선택
            </PillButton>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <div>
          <label className="block text-slate-300 font-medium mb-1">창 타이틀 (보조 표시)</label>
          <input
            type="text"
            value={values.windowTitle}
            onChange={(e) => onChange('windowTitle', e.target.value)}
            placeholder="예: MainController v1.0"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-slate-300 font-medium mb-1">런처 실제 프로세스명 (선택)</label>
          <input
            type="text"
            value={values.watchProcessName}
            onChange={(e) => onChange('watchProcessName', e.target.value)}
            placeholder="런처 사용 시 입력"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-slate-300 font-medium mb-1">창 표시 모드</label>
          <select
            value={values.windowStyle}
            onChange={(e) => onChange('windowStyle', e.target.value as WindowStyleOption)}
            className={inputCls}
          >
            <option value="normal">기본 창 실행</option>
            <option value="minimized">최소화 실행</option>
            <option value="hidden">백그라운드 숨김</option>
          </select>
        </div>
      </div>

      <div className="p-2.5 rounded-[8px] bg-[#090d16] border border-[#1e293b] grid grid-cols-4 gap-2.5">
        <div>
          <label className="block text-slate-400 mb-1 whitespace-nowrap">재시작 대기(초)</label>
          <input
            type="number"
            min={1}
            max={600}
            value={values.restartDelaySec}
            onChange={(e) => onChange('restartDelaySec', Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1 whitespace-nowrap">초기 구동 유예(초)</label>
          <input
            type="number"
            min={1}
            max={600}
            value={values.startupGraceSec}
            onChange={(e) => onChange('startupGraceSec', Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1 whitespace-nowrap">정상 종료 유예(초)</label>
          <input
            type="number"
            min={1}
            max={120}
            value={values.gracefulTimeoutSec}
            onChange={(e) => onChange('gracefulTimeoutSec', Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1 whitespace-nowrap">응답없음 연속 횟수</label>
          <input
            type="number"
            min={1}
            max={30}
            value={values.hungThresholdCount}
            onChange={(e) => onChange('hungThresholdCount', Number(e.target.value))}
            className={inputCls}
          />
        </div>
      </div>

      <div className="p-2.5 rounded-[8px] bg-[#090d16] border border-[#1e293b] grid grid-cols-3 gap-2.5 items-center">
        <div>
          <label className="block text-slate-400 mb-1 whitespace-nowrap">연속실패 판정 창(초)</label>
          <input
            type="number"
            min={10}
            max={3600}
            value={values.retryWindowSec}
            onChange={(e) => onChange('retryWindowSec', Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-slate-400 mb-1 whitespace-nowrap">최대 허용 재시작(회)</label>
          <input
            type="number"
            min={1}
            max={50}
            value={values.maxRetriesInWindow}
            onChange={(e) => onChange('maxRetriesInWindow', Number(e.target.value))}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1 pt-1">
          <label className="inline-flex items-center gap-1.5 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={values.checkNotResponding}
              onChange={(e) => onChange('checkNotResponding', e.target.checked)}
              className="accent-[#2563eb]"
            />
            <span>응답 없음 감지 시 재시작</span>
          </label>
          <label className="inline-flex items-center gap-1.5 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={values.enabled}
              onChange={(e) => onChange('enabled', e.target.checked)}
              className="accent-[#2563eb]"
            />
            <span>저장 즉시 자동 감시</span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e293b]">
        <PillButton type="button" variant="pearl-capsule" size="sm" onClick={onCancel}>
          취소
        </PillButton>
        <PillButton type="submit" variant="primary" size="sm">
          저장하기
        </PillButton>
      </div>
    </form>
  )
}
