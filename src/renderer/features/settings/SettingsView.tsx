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
    <form onSubmit={(e) => void handleSave(e)} className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <UtilityCard title="시스템 감시 및 Windows 운영 설정">
          <div className="space-y-4 text-[13px]">
            <label className="flex items-center justify-between p-3 rounded-[12px] bg-[#f5f5f7] border border-[#e0e0e0] cursor-pointer">
              <div>
                <div className="font-semibold text-[#1d1d1f]">
                  Windows 부팅 시 자동 실행 (작업 스케줄러 등록)
                </div>
                <div className="text-[11.5px] text-[#7a7a7a]">
                  관리자 권한(UAC 팝업 없음)으로 로그온 즉시 자동 실행합니다. (현재:{' '}
                  {summary.bootRegistered ? '등록됨' : '미등록'})
                </div>
              </div>
              <input
                type="checkbox"
                checked={runOnBoot}
                onChange={(e) => setRunOnBoot(e.target.checked)}
                className="w-4 h-4 accent-[#0066cc]"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-[12px] bg-[#f5f5f7] border border-[#e0e0e0] cursor-pointer">
              <div>
                <div className="font-semibold text-[#1d1d1f]">
                  창 닫기(X) 클릭 시 시스템 트레이로 최소화
                </div>
                <div className="text-[11.5px] text-[#7a7a7a]">
                  실수로 창을 닫아도 백그라운드에서 프로세스 감시를 계속 유지합니다.
                </div>
              </div>
              <input
                type="checkbox"
                checked={minimizeToTray}
                onChange={(e) => setMinimizeToTray(e.target.checked)}
                className="w-4 h-4 accent-[#0066cc]"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-[12px] bg-[#f5f5f7] border border-[#e0e0e0] cursor-pointer">
              <div>
                <div className="font-semibold text-[#1d1d1f]">
                  프로그램 시작 시 트레이 최소화 상태로 구동
                </div>
                <div className="text-[11.5px] text-[#7a7a7a]">
                  무인 현장 PC 부팅 시 메인 화면을 숨기고 트레이 아이콘으로만 시작합니다.
                </div>
              </div>
              <input
                type="checkbox"
                checked={startMinimized}
                onChange={(e) => setStartMinimized(e.target.checked)}
                className="w-4 h-4 accent-[#0066cc]"
              />
            </label>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
                  프로세스 스캔 주기 (밀리초, 기본 2000ms)
                </label>
                <input
                  type="number"
                  min={500}
                  max={60000}
                  step={500}
                  value={checkIntervalMs}
                  onChange={(e) => setCheckIntervalMs(Number(e.target.value))}
                  className="w-full h-[36px] px-3 rounded-[10px] border border-[#e0e0e0] bg-white"
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
                  로그 및 이력 자동 보관 기간 (일)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={logRetentionDays}
                  onChange={(e) => setLogRetentionDays(Number(e.target.value))}
                  className="w-full h-[36px] px-3 rounded-[10px] border border-[#e0e0e0] bg-white"
                />
              </div>
            </div>
          </div>
        </UtilityCard>

        <UtilityCard
          title="다중 NTP 시간 동기화 설정 (1차 -> 2차 -> 3차 Failover)"
          rightAction={
            <PillButton
              type="button"
              variant="secondary-pill"
              size="sm"
              onClick={() => void handleTestNtp()}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingNtp ? 'animate-spin' : ''}`} />
              <span>즉시 동기화 테스트</span>
            </PillButton>
          }
        >
          <div className="space-y-3.5 text-[13px]">
            <label className="flex items-center justify-between p-3 rounded-[12px] bg-[#f5f5f7] border border-[#e0e0e0] cursor-pointer">
              <div>
                <div className="font-semibold text-[#1d1d1f]">다중 NTP 자동 시간 동기화 활성화</div>
                <div className="text-[11.5px] text-[#7a7a7a]">
                  1차 서버 응답 실패 시 즉시 2차, 3차 서버로 자동 전환하여 시스템 시각을 보정합니다.
                </div>
              </div>
              <input
                type="checkbox"
                checked={ntpEnabled}
                onChange={(e) => setNtpEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#0066cc]"
              />
            </label>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
                  1차 시간 서버 주소
                </label>
                <input
                  type="text"
                  value={server1}
                  onChange={(e) => setServer1(e.target.value)}
                  placeholder="time.bora.net"
                  className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
                  2차 예비 서버 주소
                </label>
                <input
                  type="text"
                  value={server2}
                  onChange={(e) => setServer2(e.target.value)}
                  placeholder="time.kriss.re.kr"
                  className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
                  3차 예비 서버 주소
                </label>
                <input
                  type="text"
                  value={server3}
                  onChange={(e) => setServer3(e.target.value)}
                  placeholder="pool.ntp.org"
                  className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1 whitespace-nowrap">
                  동기화 주기 (분)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={syncIntervalMin}
                  onChange={(e) => setSyncIntervalMin(Number(e.target.value))}
                  className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1 whitespace-nowrap">
                  서버 응답 대기시간 (ms)
                </label>
                <input
                  type="number"
                  min={500}
                  max={10000}
                  step={500}
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(Number(e.target.value))}
                  className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1 whitespace-nowrap">
                  시간 급변 허용 한계 (초)
                </label>
                <input
                  type="number"
                  min={60}
                  max={86400}
                  value={maxOffsetLimitSec}
                  onChange={(e) => setMaxOffsetLimitSec(Number(e.target.value))}
                  className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0]"
                />
              </div>
            </div>
          </div>
        </UtilityCard>
      </div>

      <div className="flex justify-end">
        <PillButton type="submit" variant="primary">
          <Save className="w-4 h-4" />
          <span>환경 설정 원자적 저장 및 즉시 적용</span>
        </PillButton>
      </div>
    </form>
  )
}
