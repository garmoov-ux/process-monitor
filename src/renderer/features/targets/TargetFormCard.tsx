import React from 'react'
import { FolderSearch, Plus, Save } from 'lucide-react'
import { WindowStyleOption } from '@shared/types/domain'
import { UtilityCard } from '../../components/ui/UtilityCard'
import { PillButton } from '../../components/ui/PillButton'
import { TargetFormValues } from './TargetManualFormTab'

interface TargetFormCardProps {
  values: TargetFormValues
  editingId: string | null
  errorMsg: string | null
  onChange: <K extends keyof TargetFormValues>(key: K, val: TargetFormValues[K]) => void
  onPickExe: () => void
  onPickWorkDir: () => void
  onResetNew: () => void
  onSubmit: (e: React.FormEvent) => void
}

const inputCls =
  'w-full h-[27px] px-2 rounded-[6px] bg-[#090d16] border border-[#334155] text-[11.5px] text-slate-100 focus:border-[#38bdf8] focus:outline-none'

export const TargetFormCard: React.FC<TargetFormCardProps> = ({
  values,
  editingId,
  errorMsg,
  onChange,
  onPickExe,
  onPickWorkDir,
  onResetNew,
  onSubmit
}) => {
  return (
    <UtilityCard
      title={editingId ? `감시 대상 수정 (${values.name || values.processName})` : '감시 프로세스 등록 · 수정'}
      rightAction={
        editingId ? (
          <PillButton variant="pearl-capsule" size="sm" onClick={onResetNew}>
            <Plus className="w-3 h-3" />
            <span>신규 등록 전환</span>
          </PillButton>
        ) : undefined
      }
      className="h-full min-h-0"
      bodyClassName="overflow-y-auto pr-0.5"
    >
      <form onSubmit={onSubmit} className="space-y-2 text-[11px] flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          {errorMsg && (
            <div className="p-2 rounded-[6px] bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px]">
              {errorMsg}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold">실행 파일 경로 [필수]</label>
              <span className="text-[10px] text-[#38bdf8]">우측 목록 클릭 시 자동 입력</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={values.execPath}
                onChange={(e) => onChange('execPath', e.target.value)}
                placeholder="우측에서 선택하거나 [파일 찾기] 클릭"
                className={inputCls}
              />
              <PillButton type="button" variant="secondary-pill" size="sm" onClick={onPickExe}>
                <FolderSearch className="w-3 h-3" />
                <span>파일 찾기</span>
              </PillButton>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">프로그램 표시 이름</label>
              <input
                type="text"
                value={values.name}
                onChange={(e) => onChange('name', e.target.value)}
                placeholder="예: 메인 제어기"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">감시 프로세스명</label>
              <input
                type="text"
                value={values.processName}
                onChange={(e) => onChange('processName', e.target.value)}
                placeholder="예: MainApp.exe"
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">실행 인자 (선택)</label>
              <input
                type="text"
                value={values.args}
                onChange={(e) => onChange('args', e.target.value)}
                placeholder="실행 옵션 입력"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">작업 폴더</label>
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={values.workDir}
                  onChange={(e) => onChange('workDir', e.target.value)}
                  placeholder="실행 파일 폴더 자동 지정"
                  className={inputCls}
                />
                <PillButton type="button" variant="pearl-capsule" size="sm" onClick={onPickWorkDir}>
                  변경
                </PillButton>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">창 제목 (보조 표시)</label>
              <input
                type="text"
                value={values.windowTitle}
                onChange={(e) => onChange('windowTitle', e.target.value)}
                placeholder="프로그램 창 제목"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">실행 시 창 표시 방식</label>
              <select
                value={values.windowStyle}
                onChange={(e) => onChange('windowStyle', e.target.value as WindowStyleOption)}
                className={inputCls}
              >
                <option value="normal">기본 창으로 실행</option>
                <option value="minimized">최소화 상태로 실행</option>
                <option value="hidden">백그라운드 숨김 실행</option>
              </select>
            </div>
          </div>

          <div className="p-2 rounded-[7px] bg-[#090d16] border border-[#1e293b] grid grid-cols-3 gap-2">
            <div>
              <label className="block text-slate-400 mb-0.5 whitespace-nowrap">재시작 대기(초)</label>
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
              <label className="block text-slate-400 mb-0.5 whitespace-nowrap">초기 구동 유예(초)</label>
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
              <label className="block text-slate-400 mb-0.5 whitespace-nowrap">정상 종료 대기(초)</label>
              <input
                type="number"
                min={1}
                max={120}
                value={values.gracefulTimeoutSec}
                onChange={(e) => onChange('gracefulTimeoutSec', Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>

          <div className="p-2 rounded-[7px] bg-[#090d16] border border-[#1e293b] grid grid-cols-3 gap-2">
            <div>
              <label className="block text-slate-400 mb-0.5 whitespace-nowrap">응답없음 연속(회)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={values.hungThresholdCount}
                onChange={(e) => onChange('hungThresholdCount', Number(e.target.value))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-0.5 whitespace-nowrap">실패 판정 시간(초)</label>
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
              <label className="block text-slate-400 mb-0.5 whitespace-nowrap">최대 재시작(회)</label>
              <input
                type="number"
                min={1}
                max={50}
                value={values.maxRetriesInWindow}
                onChange={(e) => onChange('maxRetriesInWindow', Number(e.target.value))}
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-1 pt-0.5">
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
              <span>저장 즉시 감시 시작</span>
            </label>
          </div>
        </div>

        <PillButton type="submit" variant="primary" size="md" className="w-full mt-1">
          <Save className="w-3.5 h-3.5" />
          <span>{editingId ? '선택 대상 설정 수정 저장' : '감시 대상 목록에 추가'}</span>
        </PillButton>
      </form>
    </UtilityCard>
  )
}
