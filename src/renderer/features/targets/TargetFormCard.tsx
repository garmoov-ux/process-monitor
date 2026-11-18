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
  'w-full h-[28px] px-2.5 rounded-[7px] bg-[#f8fafc] border border-[#cbd5e1] text-[12px] text-[#0f172a] focus:bg-[#ffffff] focus:outline-2 focus:outline-[#2563eb]'

const PERIODIC_PRESETS = [
  { label: '30초', sec: 30 },
  { label: '10분', sec: 600 },
  { label: '1시간', sec: 3600 },
  { label: '6시간', sec: 21600 }
]

function formatSecLabel(sec: number): string {
  if (!sec || sec <= 0) return '0초'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const parts: string[] = []
  if (h > 0) parts.push(`${h}시간`)
  if (m > 0) parts.push(`${m}분`)
  if (s > 0 || parts.length === 0) parts.push(`${s}초`)
  return parts.join(' ')
}

function MiniSegment({
  value,
  onChange,
  trueLabel = '사용함',
  falseLabel = '사용 안 함'
}: {
  value: boolean
  onChange: (val: boolean) => void
  trueLabel?: string
  falseLabel?: string
}) {
  return (
    <div className="inline-flex items-center p-0.5 rounded-[7px] bg-[#e2e8f0] gap-0.5 shrink-0">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`h-[22px] px-2.5 rounded-[5px] text-[11px] whitespace-nowrap transition-all duration-150 cursor-pointer ${
          value ? 'bg-[#2563eb] text-white font-semibold' : 'text-[#334155] font-medium'
        }`}
      >
        {trueLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`h-[22px] px-2.5 rounded-[5px] text-[11px] whitespace-nowrap transition-all duration-150 cursor-pointer ${
          !value ? 'bg-[#2563eb] text-white font-semibold' : 'text-[#334155] font-medium'
        }`}
      >
        {falseLabel}
      </button>
    </div>
  )
}

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
      title={
        editingId
          ? `감시 대상 수정 (${values.name || values.processName})`
          : '감시 프로세스 등록 · 수정'
      }
      rightAction={
        editingId ? (
          <PillButton variant="pearl-capsule" size="sm" onClick={onResetNew}>
            <Plus className="w-3 h-3" />
            <span>신규 전환</span>
          </PillButton>
        ) : undefined
      }
      className="h-full min-h-0"
      bodyClassName="overflow-y-auto pr-0.5"
    >
      <form
        onSubmit={onSubmit}
        className="space-y-2 text-[11.5px] flex-1 flex flex-col justify-between"
      >
        <div className="space-y-1.5">
          {errorMsg && (
            <div className="p-2 rounded-[7px] bg-[#ffe4e6] border border-[#fecdd3] text-[#be123c] text-[11.5px] font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-0.5">
              <label className="text-[#334155] font-semibold">실행 파일 경로 [필수]</label>
              <span className="text-[10.5px] text-[#2563eb] font-semibold">
                우측 목록 클릭 시 자동 입력
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={values.execPath}
                onChange={(e) => onChange('execPath', e.target.value)}
                placeholder="우측 목록에서 선택하거나 [파일 찾기] 클릭"
                className={inputCls}
              />
              <PillButton type="button" variant="secondary-pill" size="sm" onClick={onPickExe}>
                <FolderSearch className="w-3.5 h-3.5" />
                <span>파일 찾기</span>
              </PillButton>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[#334155] font-semibold mb-0.5">프로그램 표시 이름</label>
              <input
                type="text"
                value={values.name}
                onChange={(e) => onChange('name', e.target.value)}
                placeholder="예: 메인 제어기"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[#334155] font-semibold mb-0.5">감시 프로세스명</label>
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
              <label className="block text-[#334155] font-semibold mb-0.5">실행 인자 (선택)</label>
              <input
                type="text"
                value={values.args}
                onChange={(e) => onChange('args', e.target.value)}
                placeholder="실행 옵션 입력"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[#334155] font-semibold mb-0.5">작업 폴더</label>
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
              <label className="block text-[#334155] font-semibold mb-0.5">창 제목 (보조 표시)</label>
              <input
                type="text"
                value={values.windowTitle}
                onChange={(e) => onChange('windowTitle', e.target.value)}
                placeholder="프로그램 창 제목"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[#334155] font-semibold mb-0.5">실행 시 창 표시 방식</label>
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

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[#475569] font-semibold mb-0.5 whitespace-nowrap">
                재시작 대기(초)
              </label>
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
              <label className="block text-[#475569] font-semibold mb-0.5 whitespace-nowrap">
                초기 구동 유예(초)
              </label>
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
              <label className="block text-[#475569] font-semibold mb-0.5 whitespace-nowrap">
                정상 종료 대기(초)
              </label>
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

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[#475569] font-semibold mb-0.5 whitespace-nowrap">
                응답없음 연속(회)
              </label>
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
              <label className="block text-[#475569] font-semibold mb-0.5 whitespace-nowrap">
                실패 판정 창(초)
              </label>
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
              <label className="block text-[#475569] font-semibold mb-0.5 whitespace-nowrap">
                최대 재시작(회)
              </label>
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

          <div className="rounded-[8px] bg-[#f8fafc] border border-[#cbd5e1] divide-y divide-[#e2e8f0]">
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <span className="text-[11.5px] font-semibold text-[#0f172a]">
                응답 없음 감지 시 강제 재시작
              </span>
              <MiniSegment
                value={values.checkNotResponding}
                onChange={(val) => onChange('checkNotResponding', val)}
              />
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11.5px] font-semibold text-[#0f172a]">
                  주기적 자동 재시작
                </span>
                {values.periodicRestartEnabled && (
                  <span className="text-[10.5px] text-[#2563eb] font-bold">
                    ({formatSecLabel(values.periodicRestartIntervalSec)}마다)
                  </span>
                )}
              </div>
              <MiniSegment
                value={values.periodicRestartEnabled}
                onChange={(val) => onChange('periodicRestartEnabled', val)}
              />
            </div>
            {values.periodicRestartEnabled && (
              <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-[#eff6ff]/60">
                <div className="inline-flex items-center p-0.5 rounded-[7px] bg-[#e2e8f0] gap-0.5 shrink-0">
                  {PERIODIC_PRESETS.map((preset) => {
                    const active = values.periodicRestartIntervalSec === preset.sec
                    return (
                      <button
                        key={preset.sec}
                        type="button"
                        onClick={() => onChange('periodicRestartIntervalSec', preset.sec)}
                        className={`h-[22px] px-2 rounded-[5px] text-[10.5px] whitespace-nowrap cursor-pointer ${
                          active
                            ? 'bg-[#2563eb] text-white font-semibold'
                            : 'text-[#334155] hover:text-[#0f172a] font-medium'
                        }`}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
                <div className="inline-flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={5}
                    max={604800}
                    value={values.periodicRestartIntervalSec}
                    onChange={(e) =>
                      onChange('periodicRestartIntervalSec', Math.max(5, Number(e.target.value) || 5))
                    }
                    className="w-[68px] h-[24px] px-2 rounded-[6px] bg-[#ffffff] border border-[#cbd5e1] text-[11.5px] text-right font-semibold text-[#0f172a] focus:outline-2 focus:outline-[#2563eb]"
                  />
                  <span className="text-[11px] font-semibold text-[#334155]">초</span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <span className="text-[11.5px] font-semibold text-[#0f172a]">
                등록 후 자동 감시 상태
              </span>
              <MiniSegment
                value={values.enabled}
                onChange={(val) => onChange('enabled', val)}
                trueLabel="감시 켜짐"
                falseLabel="일시정지"
              />
            </div>
          </div>
        </div>

        <PillButton type="submit" variant="primary" size="sm" className="w-full mt-1">
          <Save className="w-3.5 h-3.5" />
          <span>{editingId ? '선택 대상 설정 수정 저장' : '감시 대상 목록에 추가'}</span>
        </PillButton>
      </form>
    </UtilityCard>
  )
}
