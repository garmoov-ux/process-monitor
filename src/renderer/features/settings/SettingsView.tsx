import React, { useEffect, useState } from 'react'
import { RefreshCw, Save } from 'lucide-react'
import { AppConfig, DashboardSummary } from '@shared/types/domain'
import { UtilityCard } from '../../components/ui/UtilityCard'
import { PillButton } from '../../components/ui/PillButton'

interface SettingsViewProps {
  config: AppConfig
  summary: DashboardSummary
  onSaveConfig: (nextConfig: AppConfig) => Promise<void>
  onSyncNtpNow: () => Promise<void>
}

const inputCls =
  'w-full h-[30px] px-2.5 rounded-[6px] bg-[#0b0f19] border border-[#334155] text-[12px] text-slate-100 focus:border-[#38bdf8] focus:outline-none'

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  summary,
  onSaveConfig,
  onSyncNtpNow
}) => {
  const [runOnBoot, setRunOnBoot] = useState(config.system.runOnBoot)
  const [minimizeToTray, setMinimizeToTray] = useState(config.system.minimizeToTray)
  const [startMinimized, setStartMinimized] = useState(config.system.startMinimized)
  const [checkIntervalMs, setCheckIntervalMs] = useState(config.system.checkIntervalMs)
  const [logRetentionDays, setLogRetentionDays] = useState(config.system.logRetentionDays)

  const [ntpEnabled, setNtpEnabled] = useState(config.ntp.enabled)
  const [syncIntervalMin, setSyncIntervalMin] = useState(config.ntp.syncIntervalMin)
  const [timeoutMs, setTimeoutMs] = useState(config.ntp.timeoutMs)
  const [maxOffsetLimitSec, setMaxOffsetLimitSec] = useState(config.ntp.maxOffsetLimitSec)
  const [server1, setServer1] = useState(config.ntp.servers[0])
  const [server2, setServer2] = useState(config.ntp.servers[1])
  const [server3, setServer3] = useState(config.ntp.servers[2])
  const [testingNtp, setTestingNtp] = useState(false)

  useEffect(() => {
    setRunOnBoot(config.system.runOnBoot)
    setMinimizeToTray(config.system.minimizeToTray)
    setStartMinimized(config.system.startMinimized)
    setCheckIntervalMs(config.system.checkIntervalMs)
    setLogRetentionDays(config.system.logRetentionDays)
    setNtpEnabled(config.ntp.enabled)
    setSyncIntervalMin(config.ntp.syncIntervalMin)
    setTimeoutMs(config.ntp.timeoutMs)
    setMaxOffsetLimitSec(config.ntp.maxOffsetLimitSec)
    setServer1(config.ntp.servers[0])
    setServer2(config.ntp.servers[1])
    setServer3(config.ntp.servers[2])
  }, [config])

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    await onSaveConfig({
      ...config,
      system: {
        ...config.system,
        runOnBoot,
        minimizeToTray,
        startMinimized,
        checkIntervalMs,
        logRetentionDays
      },
      ntp: {
        enabled: ntpEnabled,
        syncIntervalMin,
        timeoutMs,
        maxOffsetLimitSec,
        servers: [server1.trim(), server2.trim(), server3.trim()]
      }
    })
  }

  const handleTestNtp = async (): Promise<void> => {
    setTestingNtp(true)
    try {
      await onSyncNtpNow()
    } finally {
      setTestingNtp(false)
    }
  }

  return (
    <form onSubmit={(e) => void handleSave(e)} className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto">
      <div className="grid grid-cols-2 gap-3">
        <UtilityCard title="시스템 감시 및 Windows 운영 설정">
          <div className="space-y-2.5 text-[12px]">
            <label className="flex items-center justify-between p-2.5 rounded-[8px] bg-[#0b0f19] border border-[#1e293b] cursor-pointer">
              <div>
                <div className="font-semibold text-slate-200">
                  Windows 부팅 시 자동 실행 (작업 스케줄러)
                </div>
                <div className="text-[10.5px] text-slate-400">
                  관리자 권한(UAC 팝업 없음)으로 자동 기동 ({summary.bootRegistered ? '등록됨' : '미등록'})
                </div>
              </div>
              <input
                type="checkbox"
                checked={runOnBoot}
                onChange={(e) => setRunOnBoot(e.target.checked)}
                className="w-4 h-4 accent-[#2563eb]"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-[8px] bg-[#0b0f19] border border-[#1e293b] cursor-pointer">
              <div>
                <div className="font-semibold text-slate-200">
                  창 닫기(X) 시 시스템 트레이로 숨김
                </div>
                <div className="text-[10.5px] text-slate-400">
                  백그라운드 상주하며 24시간 프로세스 감시를 유지합니다.
                </div>
              </div>
              <input
                type="checkbox"
                checked={minimizeToTray}
                onChange={(e) => setMinimizeToTray(e.target.checked)}
                className="w-4 h-4 accent-[#2563eb]"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-[8px] bg-[#0b0f19] border border-[#1e293b] cursor-pointer">
              <div>
                <div className="font-semibold text-slate-200">
                  시작 시 트레이 최소화 상태로 구동
                </div>
                <div className="text-[10.5px] text-slate-400">
                  무인 현장 PC 부팅 시 창을 띄우지 않고 트레이로만 시작합니다.
                </div>
              </div>
              <input
                type="checkbox"
                checked={startMinimized}
                onChange={(e) => setStartMinimized(e.target.checked)}
                className="w-4 h-4 accent-[#2563eb]"
              />
            </label>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  프로세스 스캔 주기 (ms)
                </label>
                <input
                  type="number"
                  min={500}
                  max={60000}
                  step={500}
                  value={checkIntervalMs}
                  onChange={(e) => setCheckIntervalMs(Number(e.target.value))}
                  className={inputCls}
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  로그/이력 보관 기간 (일)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={logRetentionDays}
                  onChange={(e) => setLogRetentionDays(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </UtilityCard>

        <UtilityCard
          title="다중 NTP 시간 동기화 (1차 -> 2차 -> 3차)"
          rightAction={
            <PillButton
              type="button"
              variant="secondary-pill"
              size="sm"
              onClick={() => void handleTestNtp()}
            >
              <RefreshCw className={`w-3 h-3 ${testingNtp ? 'animate-spin' : ''}`} />
              <span>즉시 동기화 테스트</span>
            </PillButton>
          }
        >
          <div className="space-y-2.5 text-[12px]">
            <label className="flex items-center justify-between p-2.5 rounded-[8px] bg-[#0b0f19] border border-[#1e293b] cursor-pointer">
              <div>
                <div className="font-semibold text-slate-200">다중 NTP 시간 동기화 사용</div>
                <div className="text-[10.5px] text-slate-400">
                  1차 서버 타임아웃 시 즉시 2차, 3차 서버로 Failover 쿼리를 수행합니다.
                </div>
              </div>
              <input
                type="checkbox"
                checked={ntpEnabled}
                onChange={(e) => setNtpEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#2563eb]"
              />
            </label>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  1차 시간 서버
                </label>
                <input
                  type="text"
                  value={server1}
                  onChange={(e) => setServer1(e.target.value)}
                  placeholder="time.bora.net"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  2차 예비 서버
                </label>
                <input
                  type="text"
                  value={server2}
                  onChange={(e) => setServer2(e.target.value)}
                  placeholder="time.kriss.re.kr"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  3차 예비 서버
                </label>
                <input
                  type="text"
                  value={server3}
                  onChange={(e) => setServer3(e.target.value)}
                  placeholder="pool.ntp.org"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1 whitespace-nowrap">
                  동기화 주기 (분)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={syncIntervalMin}
                  onChange={(e) => setSyncIntervalMin(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1 whitespace-nowrap">
                  응답 대기시간 (ms)
                </label>
                <input
                  type="number"
                  min={500}
                  max={10000}
                  step={500}
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1 whitespace-nowrap">
                  오차 허용 한계 (초)
                </label>
                <input
                  type="number"
                  min={60}
                  max={86400}
                  value={maxOffsetLimitSec}
                  onChange={(e) => setMaxOffsetLimitSec(Number(e.target.value))}
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        </UtilityCard>
      </div>

      <div className="flex justify-end">
        <PillButton type="submit" variant="primary">
          <Save className="w-3.5 h-3.5" />
          <span>환경 설정 저장 및 즉시 적용</span>
        </PillButton>
      </div>
    </form>
  )
}
