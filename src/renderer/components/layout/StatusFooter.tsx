import React, { useEffect, useState } from 'react'
import { Clock, FolderOpen, Shield } from 'lucide-react'
import { AppConfig, DashboardSummary } from '@shared/types/domain'

interface StatusFooterProps {
  config: AppConfig
  summary: DashboardSummary
  onOpenFolder: (kind: 'LOGS' | 'DATA') => void
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
  const ntpLabel = !config.ntp.enabled
    ? '시간 동기화 꺼짐'
    : lastNtp
      ? `${lastNtp.serverUsed} (${lastNtp.offsetMs >= 0 ? '+' : ''}${lastNtp.offsetMs}ms)`
      : '동기화 대기'

  return (
    <footer className="h-[26px] shrink-0 bg-[#090d16] border-t border-[#1e293b] px-3 flex items-center justify-between text-[11px] text-slate-400">
      <div className="flex items-center gap-3 min-w-0 overflow-hidden">
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
          <Shield className="w-3 h-3 text-[#38bdf8]" />
          <span className="text-slate-300 font-medium">주기</span>
          {(config.system.checkIntervalMs / 1000).toFixed(1)}초
        </span>
        <span className="text-[#1e293b]">|</span>
        <span className="whitespace-nowrap">
          <span className="text-slate-300 font-medium">부팅실행</span>{' '}
          {summary.bootRegistered ? '등록됨' : '미등록'}
        </span>
        <span className="text-[#1e293b]">|</span>
        <span className="whitespace-nowrap truncate">
          <span className="text-slate-300 font-medium">시간동기화</span> {ntpLabel}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="inline-flex items-center gap-1 text-slate-300 font-mono text-[11px] mr-1">
          <Clock className="w-3 h-3 text-[#38bdf8]" />
          {clockText}
        </span>
        <button
          type="button"
          onClick={() => onOpenFolder('LOGS')}
          className="h-[19px] px-2 rounded-[4px] bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 inline-flex items-center gap-1 text-[10.5px] whitespace-nowrap cursor-pointer"
        >
          <FolderOpen className="w-2.5 h-2.5 text-[#38bdf8]" />
          <span>로그폴더</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenFolder('DATA')}
          className="h-[19px] px-2 rounded-[4px] bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 inline-flex items-center gap-1 text-[10.5px] whitespace-nowrap cursor-pointer"
        >
          <FolderOpen className="w-2.5 h-2.5 text-[#38bdf8]" />
          <span>DB폴더</span>
        </button>
      </div>
    </footer>
  )
}
