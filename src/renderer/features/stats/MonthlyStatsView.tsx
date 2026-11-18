import React from 'react'
import {
  DailyProcessStat,
  DashboardSummary,
  ProcessRuntimeStatus
} from '@shared/types/domain'
import { UtilityCard } from '../../components/ui/UtilityCard'

interface MonthlyStatsViewProps {
  summary: DashboardSummary
  processes: ProcessRuntimeStatus[]
  dailyStats: DailyProcessStat[]
}

export const MonthlyStatsView: React.FC<MonthlyStatsViewProps> = ({
  summary,
  processes,
  dailyStats
}) => {
  const totalNtp = summary.ntpSuccessCount + summary.ntpFailCount
  const ntpRate =
    totalNtp > 0 ? ((summary.ntpSuccessCount / totalNtp) * 100).toFixed(1) : '100.0'

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5">
      <div className="grid grid-cols-3 gap-2.5 shrink-0">
        <UtilityCard title="평균 가동률 요약">
          <div className="flex items-baseline justify-between">
            <span className="text-[22px] font-bold text-[#38bdf8] tracking-[-0.02em]">
              {dailyStats.length > 0
                ? `${(
                    dailyStats.reduce((acc, s) => acc + s.uptimePercent, 0) / dailyStats.length
                  ).toFixed(1)}%`
                : '100.0%'}
            </span>
            <span className="text-[11px] text-slate-400">최근 30일 기준</span>
          </div>
        </UtilityCard>

        <UtilityCard title="누적 자동 재시작 총계">
          <div className="flex items-baseline justify-between">
            <span className="text-[22px] font-bold text-slate-100 tracking-[-0.02em]">
              {processes.reduce((acc, p) => acc + p.totalRestartCount, 0)}회
            </span>
            <span className="text-[11px] text-slate-400">
              등록 {processes.length}개 합산
            </span>
          </div>
        </UtilityCard>

        <UtilityCard title="시간 동기화(NTP) 성공률">
          <div className="flex items-baseline justify-between">
            <span className="text-[22px] font-bold text-[#34d399] tracking-[-0.02em]">
              {ntpRate}%
            </span>
            <span className="text-[11px] text-slate-400">
              성공 {summary.ntpSuccessCount} / 실패 {summary.ntpFailCount}
            </span>
          </div>
        </UtilityCard>
      </div>

      <UtilityCard title="일자별·프로세스별 가동률(Uptime %) 및 재시작 통계" className="flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto border border-[#1e293b] rounded-[8px] bg-[#0b0f19]/60">
          <table className="w-full text-left border-collapse text-[11.5px]">
            <thead className="sticky top-0 bg-[#111827] border-b border-[#1e293b] text-slate-300">
              <tr>
                <th className="py-2 px-2.5 font-semibold whitespace-nowrap">집계 일자</th>
                <th className="py-2 px-2.5 font-semibold whitespace-nowrap">프로그램명</th>
                <th className="py-2 px-2.5 font-semibold whitespace-nowrap">가동률 (%)</th>
                <th className="py-2 px-2.5 font-semibold whitespace-nowrap">가동률 그래프</th>
                <th className="py-2 px-2.5 font-semibold whitespace-nowrap">재시작 횟수</th>
                <th className="py-2 px-2.5 font-semibold whitespace-nowrap">응답 없음</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/70">
              {dailyStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    집계된 일별 가동률 통계 데이터가 아직 없습니다.
                  </td>
                </tr>
              ) : (
                dailyStats.map((stat) => (
                  <tr key={`${stat.statDate}_${stat.targetId}`} className="hover:bg-[#1e293b]/40">
                    <td className="py-1.5 px-2.5 whitespace-nowrap text-slate-400">
                      {stat.statDate}
                    </td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap font-semibold text-slate-200">
                      {stat.targetName}
                    </td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap font-semibold text-[#38bdf8]">
                      {stat.uptimePercent.toFixed(2)}%
                    </td>
                    <td className="py-1.5 px-2.5 w-[220px]">
                      <div className="w-full h-2 rounded-full bg-[#1e293b] overflow-hidden">
                        <div
                          className="h-full bg-[#2563eb] rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, stat.uptimePercent))}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap text-slate-200">
                      {stat.restartCount}회
                    </td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap text-slate-400">
                      {stat.hungCount}회
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </UtilityCard>
    </div>
  )
}
