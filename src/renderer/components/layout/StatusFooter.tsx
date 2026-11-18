import React from 'react'
import { FolderOpen, Shield, RefreshCw } from 'lucide-react'
import { AppConfig, DashboardSummary } from '@shared/types/domain'

interface StatusFooterProps {
  config: AppConfig
  summary: DashboardSummary
  onSyncNtpNow: () => void
  onOpenFolder: (kind: 'LOGS' | 'DATA') => void
}

export const StatusFooter: React.FC<StatusFooterProps> = ({
  config,
  summary,
  onSyncNtpNow,
  onOpenFolder
}) => {
  const lastNtp = summary.lastNtpSync
  const ntpLabel = !config.ntp.enabled
    ? '시간 동기화 비활성'
    : lastNtp
      ? `${lastNtp.serverUsed} (${lastNtp.offsetMs >= 0 ? '+' : ''}${lastNtp.offsetMs}ms)`
      : '동기화 대기 중'

  return (
    <footer className="h-[36px] shrink-0 bg-[#ffffff] border-t border-[#e0e0e0] px-5 flex items-center justify-between text-[12px] text-[#7a7a7a]">
      <div className="flex items-center gap-4 min-w-0 overflow-hidden">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <Shield className="w-3.5 h-3.5 text-[#0066cc]" />
          <strong className="text-[#1d1d1f] font-medium">감시 주기:</strong>
          {(config.system.checkIntervalMs / 1000).toFixed(1)}초
        </span>
        <span className="text-[#e0e0e0]">|</span>
        <span className="whitespace-nowrap">
          <strong className="text-[#1d1d1f] font-medium">부팅 자동 실행:</strong>{' '}
          {summary.bootRegistered ? '등록됨(작업 스케줄러)' : '미등록'}
        </span>
        <span className="text-[#e0e0e0]">|</span>
        <span className="whitespace-nowrap truncate">
          <strong className="text-[#1d1d1f] font-medium">최근 시간 동기화:</strong> {ntpLabel}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onSyncNtpNow}
          className="h-[24px] px-2.5 rounded-full bg-[#fafafc] border border-[#e0e0e0] text-[#1d1d1f] inline-flex items-center gap-1 text-[11.5px] font-medium whitespace-nowrap transition-transform duration-150 active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3 text-[#0066cc]" />
          <span>즉시 시간 동기화</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenFolder('LOGS')}
          className="h-[24px] px-2.5 rounded-full bg-[#fafafc] border border-[#e0e0e0] text-[#1d1d1f] inline-flex items-center gap-1 text-[11.5px] font-medium whitespace-nowrap transition-transform duration-150 active:scale-95 cursor-pointer"
        >
          <FolderOpen className="w-3 h-3 text-[#0066cc]" />
          <span>로그 폴더 열기</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenFolder('DATA')}
          className="h-[24px] px-2.5 rounded-full bg-[#fafafc] border border-[#e0e0e0] text-[#1d1d1f] inline-flex items-center gap-1 text-[11.5px] font-medium whitespace-nowrap transition-transform duration-150 active:scale-95 cursor-pointer"
        >
          <FolderOpen className="w-3 h-3 text-[#0066cc]" />
          <span>내장 DB 폴더 열기</span>
        </button>
      </div>
    </footer>
  )
}
