import React, { useEffect, useState } from 'react'
import { RefreshCw, Save, Sparkles } from 'lucide-react'
import { AppConfig, DashboardSummary } from '@shared/types/domain'
import { UtilityCard } from '../../components/ui/UtilityCard'
import { PillButton } from '../../components/ui/PillButton'

interface SettingsViewProps {
  config: AppConfig
  summary: DashboardSummary
  onSaveConfig: (nextConfig: AppConfig) => Promise<void>
  onSyncNtpNow: () => Promise<unknown>
  onRunCleanupNow: () => Promise<void>
}

interface SegmentOption<T> {
  label: string
  value: T
}

function SegmentedControl<T extends string | number | boolean>({
  options,
  value,
  onChange
}: {
  options: SegmentOption<T>[]
  value: T
  onChange: (val: T) => void
}) {
  return (
    <div className="inline-flex items-center p-0.5 rounded-[8px] bg-[#e2e8f0] gap-0.5 shrink-0">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`h-[26px] px-2.5 rounded-[6px] text-[11.5px] whitespace-nowrap transition-all duration-150 active:scale-95 cursor-pointer select-none ${
              active
                ? 'bg-[#2563eb] text-white font-semibold'
                : 'text-[#334155] hover:text-[#0f172a] font-medium'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

const SCAN_INTERVAL_OPTIONS: SegmentOption<number>[] = [
  { label: '1초', value: 1000 },
  { label: '2초', value: 2000 },
  { label: '3초', value: 3000 },
  { label: '5초', value: 5000 }
]

const RETENTION_OPTIONS: SegmentOption<number>[] = [
  { label: '14일', value: 14 },
  { label: '30일', value: 30 },
  { label: '60일', value: 60 },
  { label: '90일', value: 90 },
  { label: '180일', value: 180 }
]

const BOOL_OPTIONS: SegmentOption<boolean>[] = [
  { label: '사용함', value: true },
  { label: '사용 안 함', value: false }
]

const CLOSE_OPTIONS: SegmentOption<boolean>[] = [
  { label: '트레이 숨김', value: true },
  { label: '완전 종료', value: false }
]

const NTP_SYNC_SEC_PRESETS: SegmentOption<number>[] = [
  { label: '5초', value: 5 },
  { label: '10초', value: 10 },
  { label: '30초', value: 30 },
  { label: '60초', value: 60 }
]

const NTP_TIMEOUT_OPTIONS: SegmentOption<number>[] = [
  { label: '1초', value: 1000 },
  { label: '2초', value: 2000 },
  { label: '3초', value: 3000 },
  { label: '5초', value: 5000 }
]

const inputCls =
  'h-[28px] px-2.5 rounded-[6px] bg-[#ffffff] border border-[#cbd5e1] text-[12px] text-[#0f172a] focus:outline-2 focus:outline-[#2563eb]'

function buildSafeDraft(raw: AppConfig): AppConfig {
  const servers: [string, string, string] = [
    raw?.ntp?.servers?.[0] || 'time.bora.net',
    raw?.ntp?.servers?.[1] || 'time.kriss.re.kr',
    raw?.ntp?.servers?.[2] || 'pool.ntp.org'
  ]
  const ports: [number, number, number] = [
    Number(raw?.ntp?.ports?.[0] || 123),
    Number(raw?.ntp?.ports?.[1] || 123),
    Number(raw?.ntp?.ports?.[2] || 123)
  ]
  const syncIntervalMin = Number(raw?.ntp?.syncIntervalMin || 60)
  const syncIntervalSec =
    raw?.ntp?.syncIntervalSec !== undefined && Number(raw.ntp.syncIntervalSec) >= 1
      ? Number(raw.ntp.syncIntervalSec)
      : syncIntervalMin * 60

  return {
    system: {
      runOnBoot: Boolean(raw?.system?.runOnBoot),
      minimizeToTray: raw?.system?.minimizeToTray !== false,
      startMinimized: Boolean(raw?.system?.startMinimized),
      checkIntervalMs: Number(raw?.system?.checkIntervalMs || 2000),
      logRetentionDays: Number(raw?.system?.logRetentionDays || 30),
      maintenanceMode: Boolean(raw?.system?.maintenanceMode)
    },
    ntp: {
      enabled: raw?.ntp?.enabled !== false,
      syncIntervalMin,
      syncIntervalSec,
      timeoutMs: Number(raw?.ntp?.timeoutMs || 2000),
      maxOffsetLimitSec: Number(raw?.ntp?.maxOffsetLimitSec || 3600),
      servers,
      ports
    },
    targets: Array.isArray(raw?.targets) ? raw.targets : []
  }
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  summary,
  onSaveConfig,
  onSyncNtpNow,
  onRunCleanupNow
}) => {
  const [draft, setDraft] = useState<AppConfig>(() => buildSafeDraft(config))
  const [testingNtp, setTestingNtp] = useState(false)
  const [saving, setSaving] = useState(false)

  // 2초 주기 상태 브로드캐스트로 인해 편집 중인 설정 버튼이 원래 값으로 튕기는 현상 방지
  const configSignature = JSON.stringify({
    system: config?.system,
    ntp: config?.ntp
  })

  useEffect(() => {
    setDraft(buildSafeDraft(config))
  }, [configSignature])

  const updateServer = (idx: 0 | 1 | 2, address: string): void => {
    const nextServers: [string, string, string] = [...draft.ntp.servers] as [string, string, string]
    nextServers[idx] = address
    setDraft((prev) => ({
      ...prev,
      ntp: { ...prev.ntp, servers: nextServers }
    }))
  }

  const updatePort = (idx: 0 | 1 | 2, portVal: number): void => {
    const nextPorts: [number, number, number] = [...draft.ntp.ports] as [number, number, number]
    nextPorts[idx] = Math.min(65535, Math.max(1, Number(portVal) || 123))
    setDraft((prev) => ({
      ...prev,
      ntp: { ...prev.ntp, ports: nextPorts }
    }))
  }

  const setSyncSec = (secVal: number): void => {
    const safeSec = Math.max(1, Math.min(86400, Math.round(Number(secVal) || 60)))
    setDraft((prev) => ({
      ...prev,
      ntp: {
        ...prev.ntp,
        syncIntervalSec: safeSec,
        syncIntervalMin: Math.max(1, Math.ceil(safeSec / 60))
      }
    }))
  }

  const handleSave = async (): Promise<void> => {
    if (saving) return
    setSaving(true)
    try {
      await onSaveConfig(draft)
    } finally {
      setSaving(false)
    }
  }

  const handleTestNtp = async (): Promise<void> => {
    if (testingNtp) return
    setTestingNtp(true)
    try {
      await onSaveConfig(draft)
      await onSyncNtpNow()
    } finally {
      setTestingNtp(false)
    }
  }

  const currentSyncSec = draft.ntp.syncIntervalSec ?? 60

  return (
    <div className="h-full p-3.5 w-full min-h-0 flex flex-col gap-3">
      {/* 상단 설정 저장 액션 바 */}
      <div className="bg-[#ffffff] border border-[#cbd5e1] rounded-[10px] px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <h2 className="text-[15px] font-bold text-[#0f172a] whitespace-nowrap">
            전체 환경 설정 관리
          </h2>
          <span className="text-[12px] text-[#64748b] truncate">
            감시 주기, 부팅 자동 실행, 다중 시간 동기화 서버(주소·포트·초 단위 주기) 및 보관 기간을 관리합니다.
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <PillButton
            type="button"
            variant="pearl-capsule"
            size="sm"
            onClick={() => void onRunCleanupNow()}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>경과 데이터 즉시 정리</span>
          </PillButton>
          <PillButton
            type="button"
            variant="primary"
            size="sm"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? '저장 중...' : '설정 저장'}</span>
          </PillButton>
        </div>
      </div>

      {/* 본문 2단 그리드 */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-3">
        <div className="col-span-6 min-h-0 flex flex-col gap-3">
          <UtilityCard title="프로세스 감시 및 시작 동작 설정" className="shrink-0">
            <div className="rounded-[8px] bg-[#f8fafc] border border-[#cbd5e1] divide-y divide-[#e2e8f0]">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <div className="text-[13px] font-semibold text-[#0f172a]">프로세스 상태 점검 주기</div>
                  <div className="text-[11px] text-[#64748b]">실행 중 프로그램 스냅샷 수집 간격</div>
                </div>
                <SegmentedControl
                  options={SCAN_INTERVAL_OPTIONS}
                  value={draft.system.checkIntervalMs}
                  onChange={(val) =>
                    setDraft((prev) => ({
                      ...prev,
                      system: { ...prev.system, checkIntervalMs: val }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <div className="text-[13px] font-semibold text-[#0f172a]">
                    부팅 시 자동 실행 ({summary.bootRegistered ? '등록됨' : '미등록'})
                  </div>
                  <div className="text-[11px] text-[#64748b]">작업 스케줄러 최고 권한 자동 기동</div>
                </div>
                <SegmentedControl
                  options={BOOL_OPTIONS}
                  value={draft.system.runOnBoot}
                  onChange={(val) =>
                    setDraft((prev) => ({
                      ...prev,
                      system: { ...prev.system, runOnBoot: val }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <div className="text-[13px] font-semibold text-[#0f172a]">창 닫기 버튼 클릭 동작</div>
                  <div className="text-[11px] text-[#64748b]">트레이 우클릭 메뉴에서 완전 종료 가능</div>
                </div>
                <SegmentedControl
                  options={CLOSE_OPTIONS}
                  value={draft.system.minimizeToTray}
                  onChange={(val) =>
                    setDraft((prev) => ({
                      ...prev,
                      system: { ...prev.system, minimizeToTray: val }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <div className="text-[13px] font-semibold text-[#0f172a]">시작 시 트레이 최소화로 구동</div>
                  <div className="text-[11px] text-[#64748b]">무인 현장 부팅 시 창을 숨기고 시작</div>
                </div>
                <SegmentedControl
                  options={BOOL_OPTIONS}
                  value={draft.system.startMinimized}
                  onChange={(val) =>
                    setDraft((prev) => ({
                      ...prev,
                      system: { ...prev.system, startMinimized: val }
                    }))
                  }
                />
              </div>
            </div>
          </UtilityCard>

          <UtilityCard
            title="보관 기간 및 자동 삭제"
            className="flex-1 min-h-0"
            bodyClassName="justify-between"
          >
            <div className="rounded-[8px] bg-[#f8fafc] border border-[#cbd5e1] divide-y divide-[#e2e8f0]">
              <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                <div>
                  <div className="text-[13px] font-semibold text-[#0f172a]">로그 및 내장 데이터 보관 기간</div>
                  <div className="text-[11px] text-[#64748b]">보관 기간 경과 파일 및 이력 자동 정리</div>
                </div>
                <SegmentedControl
                  options={RETENTION_OPTIONS}
                  value={draft.system.logRetentionDays}
                  onChange={(val) =>
                    setDraft((prev) => ({
                      ...prev,
                      system: { ...prev.system, logRetentionDays: val }
                    }))
                  }
                />
              </div>
            </div>

            <div className="text-[11.5px] text-[#64748b] flex items-center justify-between px-1 pt-1">
              <span>보관 기간 경과 데이터는 자동 정리됩니다.</span>
              <span className="font-semibold text-[#2563eb]">우측 상단 [설정 저장] 클릭 시 반영</span>
            </div>
          </UtilityCard>
        </div>

        <div className="col-span-6 min-h-0 flex flex-col gap-3">
          <UtilityCard
            title="다중 시간 동기화 서버 및 포트 설정"
            rightAction={
              <PillButton
                type="button"
                variant="secondary-pill"
                size="sm"
                disabled={testingNtp}
                onClick={() => void handleTestNtp()}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingNtp ? 'animate-spin' : ''}`} />
                <span>{testingNtp ? '동기화 중...' : '즉시 동기화 테스트'}</span>
              </PillButton>
            }
            className="flex-1 min-h-0"
            bodyClassName="justify-between"
          >
            <div className="rounded-[8px] bg-[#f8fafc] border border-[#cbd5e1] divide-y divide-[#e2e8f0]">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <div className="text-[13px] font-semibold text-[#0f172a]">자동 시간 동기화 사용 여부</div>
                  <div className="text-[11px] text-[#64748b]">1차 서버 실패 시 2차, 3차 서버로 자동 전환</div>
                </div>
                <SegmentedControl
                  options={BOOL_OPTIONS}
                  value={draft.ntp.enabled}
                  onChange={(val) =>
                    setDraft((prev) => ({
                      ...prev,
                      ntp: { ...prev.ntp, enabled: val }
                    }))
                  }
                />
              </div>

              {([0, 1, 2] as const).map((idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-[12.5px] font-semibold text-[#0f172a] w-[86px] shrink-0">
                    {idx + 1}차 시간 서버
                  </span>
                  <input
                    type="text"
                    value={draft.ntp.servers[idx]}
                    onChange={(e) => updateServer(idx, e.target.value)}
                    placeholder="시간 서버 도메인 또는 주소"
                    className={`${inputCls} flex-1 min-w-0`}
                  />
                  <span className="text-[11.5px] font-medium text-[#475569] shrink-0">포트</span>
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    value={draft.ntp.ports[idx]}
                    onChange={(e) => updatePort(idx, Number(e.target.value))}
                    className={`${inputCls} w-[68px] text-center shrink-0`}
                  />
                </div>
              ))}

              {/* 자동 동기화 반복 주기: 5초/10초/30초/60초 퀵 버튼 + 초 단위 수동 입력 */}
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[#0f172a] whitespace-nowrap">
                    시간 동기화 주기 (초)
                  </div>
                  <div className="text-[11px] text-[#64748b] whitespace-nowrap">
                    5초 · 10초 · 30초 선택 또는 직접 입력
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <SegmentedControl
                    options={NTP_SYNC_SEC_PRESETS}
                    value={currentSyncSec}
                    onChange={(val) => setSyncSec(val)}
                  />
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={86400}
                      value={currentSyncSec}
                      onChange={(e) => setSyncSec(Number(e.target.value))}
                      title="동기화 주기(초) 직접 수동 입력"
                      className={`${inputCls} w-[64px] text-right font-semibold`}
                    />
                    <span className="text-[11.5px] text-[#475569] font-medium">초</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <div className="text-[13px] font-semibold text-[#0f172a]">서버 응답 대기 시간</div>
                  <div className="text-[11px] text-[#64748b]">초과 시 다음 예비 서버로 즉시 전환</div>
                </div>
                <SegmentedControl
                  options={NTP_TIMEOUT_OPTIONS}
                  value={draft.ntp.timeoutMs}
                  onChange={(val) =>
                    setDraft((prev) => ({
                      ...prev,
                      ntp: { ...prev.ntp, timeoutMs: val }
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <div className="text-[13px] font-semibold text-[#0f172a]">시간 급변 허용 한계 (초)</div>
                  <div className="text-[11px] text-[#64748b]">초과 오차 발생 시 시스템 시각 변경 보류</div>
                </div>
                <div className="inline-flex items-center gap-1">
                  <input
                    type="number"
                    min={60}
                    max={86400}
                    value={draft.ntp.maxOffsetLimitSec}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        ntp: { ...prev.ntp, maxOffsetLimitSec: Number(e.target.value) || 3600 }
                      }))
                    }
                    className={`${inputCls} w-[84px] text-right font-semibold`}
                  />
                  <span className="text-[11.5px] text-[#475569] font-medium">초</span>
                </div>
              </div>
            </div>

            <div className="text-[11.5px] text-[#64748b] px-1 pt-1">
              기본 포트는 123번이며, 동기화 주기는 5초·10초·30초 버튼 클릭 또는 우측 입력란에서 초 단위로 자유롭게 입력할 수 있습니다.
            </div>
          </UtilityCard>
        </div>
      </div>
    </div>
  )
}
