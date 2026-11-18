import React, { useEffect, useState } from 'react'
import { Clock, FolderOpen, Shield } from 'lucide-react'
import { AppConfig, DashboardSummary } from '@shared/types/domain'

interface StatusFooterProps {
  config: AppConfig
  summary: DashboardSummary
  onOpenFolder: (kind: 'LOGS' | 'DATA' | 'CONFIG') => void
}

export const StatusFooter: React.FC<StatusFooterProps> = ({
  config,
  summary,
  onOpenFolder
}) => {
  const [clockText, setClockText] = useState<string>(() => new Date().toLocaleTimeString('ko-KR'))

  useEffect(() => {
    const timer = setInterval(() => {
      setClockText(new Date().toLocaleTimeString('ko-KR'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const lastNtp = summary.lastNtpSync
  const roundedOffset = lastNtp ? Math.round(lastNtp.offsetMs) : 0
  const ntpLabel = !config.ntp.enabled
    ? '시간 동기화 꺼짐'
    : lastNtp
      ? `${lastNtp.serverUsed} (${roundedOffset >= 0 ? '+' : ''}${roundedOffset}밀리초)`
      : '동기화 대기'

  return (
    <footer className="h-[28px] shrink-0 bg-[#ffffff] border-t border-[#cbd5e1] px-3.5 flex items-center justify-between text-[11.5px] text-[#64748b]">
      <div className="flex items-center gap-3 min-w-0 overflow-hidden">
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Shield className="w-3.5 h-3.5 text-[#2563eb]" />
          <strong className="text-[#0f172a] font-semibold">감시 주기:</strong>
          {(config.system.checkIntervalMs / 1000).toFixed(1)}초
        </span>
        <span className="text-[#cbd5e1]">|</span>
        <span className="whitespace-nowrap">
          <strong className="text-[#0f172a] font-semibold">부팅 자동 실행:</strong>{' '}
          {summary.bootRegistered ? '등록됨' : '미등록'}
        </span>
        <span className="text-[#cbd5e1]">|</span>
        <span className="whitespace-nowrap truncate">
          <strong className="text-[#0f172a] font-semibold">시간 동기화:</strong> {ntpLabel}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="inline-flex items-center gap-1 text-[#0f172a] font-semibold text-[11.5px] mr-1">
          <Clock className="w-3 h-3 text-[#2563eb]" />
          {clockText}
        </span>
        <button
          type="button"
          onClick={() => onOpenFolder('LOGS')}
          className="h-[21px] px-2 rounded-[5px] bg-[#f8fafc] hover:bg-[#e2e8f0] border border-[#cbd5e1] text-[#334155] inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap cursor-pointer"
        >
          <FolderOpen className="w-3 h-3 text-[#2563eb]" />
          <span>로그 폴더</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenFolder('DATA')}
          className="h-[21px] px-2 rounded-[5px] bg-[#f8fafc] hover:bg-[#e2e8f0] border border-[#cbd5e1] text-[#334155] inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap cursor-pointer"
        >
          <FolderOpen className="w-3 h-3 text-[#2563eb]" />
          <span>데이터 폴더</span>
        </button>
      </div>
    </footer>
  )
}
