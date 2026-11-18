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
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4 shrink-0">
        <UtilityCard title="프로세스 평균 가동률 요약">
          <div className="flex items-baseline justify-between">
            <span className="text-[28px] font-bold text-[#0066cc] tracking-[-0.02em]">
              {dailyStats.length > 0
                ? `${(
                    dailyStats.reduce((acc, s) => acc + s.uptimePercent, 0) / dailyStats.length
                  ).toFixed(1)}%`
                : '100.0%'}
            </span>
            <span className="text-[12px] text-[#7a7a7a]">최근 30일 샘플링 기준</span>
          </div>
        </UtilityCard>

        <UtilityCard title="누적 자동 재시작 총계">
          <div className="flex items-baseline justify-between">
            <span className="text-[28px] font-bold text-[#1d1d1f] tracking-[-0.02em]">
              {processes.reduce((acc, p) => acc + p.totalRestartCount, 0)}회
            </span>
            <span className="text-[12px] text-[#7a7a7a]">
              등록 프로세스 {processes.length}개 합산
            </span>
          </div>
        </UtilityCard>

        <UtilityCard title="다중 시간 동기화(NTP) 성공률">
          <div className="flex items-baseline justify-between">
            <span className="text-[28px] font-bold text-emerald-600 tracking-[-0.02em]">
              {ntpRate}%
            </span>
            <span className="text-[12px] text-[#7a7a7a]">
              성공 {summary.ntpSuccessCount}건 / 실패 {summary.ntpFailCount}건
            </span>
          </div>
        </UtilityCard>
      </div>

      <UtilityCard title="일자별·프로세스별 가동률(Uptime %) 및 재시작 통계" className="flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto border border-[#e0e0e0] rounded-[14px]">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead className="sticky top-0 bg-[#f5f5f7] border-b border-[#e0e0e0]">
              <tr>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">집계 일자</th>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">프로그램명</th>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">가동률 (%)</th>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">가동률 시각화</th>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">재시작 횟수</th>
                <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">응답 없음 감지</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {dailyStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-[#7a7a7a]">
                    집계된 일별 가동률 통계 데이터가 아직 없습니다.
                  </td>
                </tr>
              ) : (
                dailyStats.map((stat) => (
                  <tr key={`${stat.statDate}_${stat.targetId}`} className="hover:bg-[#fafafc]">
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-[#7a7a7a]">
                      {stat.statDate}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap font-semibold text-[#1d1d1f]">
                      {stat.targetName}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap font-semibold text-[#0066cc]">
                      {stat.uptimePercent.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-3.5 w-[260px]">
                      <div className="w-full h-2.5 rounded-full bg-[#e8e8ed] overflow-hidden">
                        <div
                          className="h-full bg-[#0066cc] rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, stat.uptimePercent))}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-[#1d1d1f]">
                      {stat.restartCount}회
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap text-[#7a7a7a]">
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
