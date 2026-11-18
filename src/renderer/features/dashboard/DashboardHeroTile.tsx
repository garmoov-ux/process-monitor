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
  const roundedOffset = lastNtp ? Math.round(lastNtp.offsetMs) : 0

  return (
    <section className="grid grid-cols-5 gap-2.5 shrink-0">
      {/* 1번째 카드: 다크 강조 타일 (atoj / systemcheck 스타일) */}
      <div className="bg-[#0f172a] text-white border border-[#1e293b] rounded-[10px] px-3.5 py-2.5 flex items-center justify-between">
        <div>
          <span className="text-[12px] font-medium text-slate-300 whitespace-nowrap block">
            정상 가동
          </span>
          <span className="text-[10.5px] text-[#34d399] font-medium">가동률 {uptimeRate}%</span>
        </div>
        <span className="text-[21px] font-bold tracking-[-0.02em] text-[#38bdf8] whitespace-nowrap">
          {summary.runningCount.toLocaleString()}
          <span className="text-[11.5px] font-normal text-slate-400 ml-0.5">개</span>
        </span>
      </div>

      {/* 2번째 카드: 화이트 타일 */}
      <div className="bg-[#ffffff] border border-[#cbd5e1] rounded-[10px] px-3.5 py-2.5 flex items-center justify-between">
        <div>
          <span className="text-[12px] font-medium text-[#475569] whitespace-nowrap block">
            전체 등록 대상
          </span>
          <span className="text-[10.5px] text-[#64748b]">일시정지 {summary.pausedCount}개</span>
        </div>
        <span className="text-[21px] font-bold tracking-[-0.02em] text-[#0f172a] whitespace-nowrap">
          {summary.totalTargets.toLocaleString()}
          <span className="text-[11.5px] font-normal text-[#64748b] ml-0.5">개</span>
        </span>
      </div>

      {/* 3번째 카드: 화이트 타일 */}
      <div className="bg-[#ffffff] border border-[#cbd5e1] rounded-[10px] px-3.5 py-2.5 flex items-center justify-between">
        <div>
          <span className="text-[12px] font-medium text-[#475569] whitespace-nowrap block">
            유예 · 재시작 대기
          </span>
          <span className="text-[10.5px] text-[#64748b]">자동 복구 진행</span>
        </div>
        <span className="text-[21px] font-bold tracking-[-0.02em] text-[#2563eb] whitespace-nowrap">
          {summary.graceOrPendingCount.toLocaleString()}
          <span className="text-[11.5px] font-normal text-[#64748b] ml-0.5">개</span>
        </span>
      </div>

      {/* 4번째 카드: 화이트 타일 */}
      <div className="bg-[#ffffff] border border-[#cbd5e1] rounded-[10px] px-3.5 py-2.5 flex items-center justify-between">
        <div>
          <span className="text-[12px] font-medium text-[#475569] whitespace-nowrap block">
            장애 · 연속실패 차단
          </span>
          <span className="text-[10.5px] text-[#64748b]">응답없음·경로오류</span>
        </div>
        <span
          className={`text-[21px] font-bold tracking-[-0.02em] whitespace-nowrap ${
            summary.issueOrCircuitCount > 0 ? 'text-[#e11d48]' : 'text-[#0f172a]'
          }`}
        >
          {summary.issueOrCircuitCount.toLocaleString()}
          <span className="text-[11.5px] font-normal text-[#64748b] ml-0.5">개</span>
        </span>
      </div>

      {/* 5번째 카드: 시간 동기화 오차 (너비 겹침 방지 레이아웃) */}
      <div className="bg-[#ffffff] border border-[#cbd5e1] rounded-[10px] px-3 py-2.5 flex items-center justify-between gap-1.5 min-w-0">
        <div className="min-w-0">
          <span className="text-[12px] font-medium text-[#475569] whitespace-nowrap block">
            시간 동기화
          </span>
          <span
            className="text-[10.5px] text-[#64748b] truncate block"
            title={lastNtp ? lastNtp.serverUsed : undefined}
          >
            {lastNtp ? lastNtp.serverUsed : `성공 ${summary.ntpSuccessCount}건`}
          </span>
        </div>
        <div className="shrink-0 text-right">
          {lastNtp ? (
            <span className="inline-flex items-baseline px-2 py-0.5 rounded-[6px] bg-[#eff6ff] border border-[#bfdbfe] text-[#2563eb] font-bold text-[13.5px] whitespace-nowrap">
              {roundedOffset >= 0 ? `+${roundedOffset}` : roundedOffset}
              <span className="text-[10px] font-semibold text-[#64748b] ml-0.5">밀리초</span>
            </span>
          ) : (
            <span className="text-[13px] font-semibold text-[#64748b] whitespace-nowrap">
              대기
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
