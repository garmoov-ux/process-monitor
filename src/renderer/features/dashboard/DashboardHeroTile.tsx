import React from 'react'
import { DashboardSummary } from '@shared/types/domain'

interface DashboardHeroTileProps {
  summary: DashboardSummary
  onOpenAddModal: () => void
  onSyncNtpNow: () => void
}

export const DashboardHeroTile: React.FC<DashboardHeroTileProps> = ({ summary }) => {
  const lastNtp = summary.lastNtpSync
  const uptimeRate =
    summary.totalTargets > 0
      ? Math.round((summary.runningCount / summary.totalTargets) * 1000) / 10
      : 100

  return (
    <section className="grid grid-cols-5 gap-2 shrink-0">
      <div className="bg-[#111827] border border-[#1e293b] rounded-[9px] px-3 py-2 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap block">
            정상 가동
          </span>
          <span className="text-[10px] text-[#34d399] font-medium">가동률 {uptimeRate}%</span>
        </div>
        <span className="text-[19px] font-bold tracking-[-0.02em] text-[#34d399] whitespace-nowrap">
          {summary.runningCount}
          <span className="text-[11px] font-normal text-slate-400 ml-0.5">개</span>
        </span>
      </div>

      <div className="bg-[#111827] border border-[#1e293b] rounded-[9px] px-3 py-2 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap block">
            등록 프로세스
          </span>
          <span className="text-[10px] text-slate-500">
            일시정지 {summary.pausedCount}개
          </span>
        </div>
        <span className="text-[19px] font-bold tracking-[-0.02em] text-slate-100 whitespace-nowrap">
          {summary.totalTargets}
          <span className="text-[11px] font-normal text-slate-400 ml-0.5">개</span>
        </span>
      </div>

      <div className="bg-[#111827] border border-[#1e293b] rounded-[9px] px-3 py-2 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap block">
            유예 / 재시작 대기
          </span>
          <span className="text-[10px] text-[#38bdf8]">카운트다운</span>
        </div>
        <span className="text-[19px] font-bold tracking-[-0.02em] text-[#38bdf8] whitespace-nowrap">
          {summary.graceOrPendingCount}
          <span className="text-[11px] font-normal text-slate-400 ml-0.5">개</span>
        </span>
      </div>

      <div className="bg-[#111827] border border-[#1e293b] rounded-[9px] px-3 py-2 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap block">
            장애 / 연속실패 차단
          </span>
          <span className="text-[10px] text-slate-500">응답없음·경로오류</span>
        </div>
        <span
          className={`text-[19px] font-bold tracking-[-0.02em] whitespace-nowrap ${
            summary.issueOrCircuitCount > 0 ? 'text-rose-400' : 'text-slate-300'
          }`}
        >
          {summary.issueOrCircuitCount}
          <span className="text-[11px] font-normal text-slate-400 ml-0.5">개</span>
        </span>
      </div>

      <div className="bg-[#111827] border border-[#1e293b] rounded-[9px] px-3 py-2 flex items-center justify-between min-w-0">
        <div className="min-w-0">
          <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap block">
            시간 동기화 오차
          </span>
          <span className="text-[10px] text-slate-500 truncate block">
            {lastNtp ? lastNtp.serverUsed : `성공 ${summary.ntpSuccessCount}건`}
          </span>
        </div>
        <span className="text-[14px] font-bold tracking-[-0.02em] text-[#38bdf8] whitespace-nowrap ml-1">
          {lastNtp
            ? `${lastNtp.offsetMs >= 0 ? '+' : ''}${lastNtp.offsetMs}밀리초`
            : '대기'}
        </span>
      </div>
    </section>
  )
}
