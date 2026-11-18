import React from 'react'
import { FileText } from 'lucide-react'
import {
  DailyProcessStat,
  DashboardSummary,
  ProcessRuntimeStatus
} from '@shared/types/domain'
import { UtilityCard } from '../../components/ui/UtilityCard'
import { PillButton } from '../../components/ui/PillButton'

interface MonthlyStatsViewProps {
  summary: DashboardSummary
  processes: ProcessRuntimeStatus[]
  dailyStats: DailyProcessStat[]
  onExportPdf: () => void
}

export const MonthlyStatsView: React.FC<MonthlyStatsViewProps> = ({
  summary,
  processes,
  dailyStats,
  onExportPdf
}) => {
  const totalNtp = summary.ntpSuccessCount + summary.ntpFailCount
  const ntpRate =
    totalNtp > 0 ? ((summary.ntpSuccessCount / totalNtp) * 100).toFixed(1) : '100.0'

  const avgUptime =
    dailyStats.length > 0
      ? (dailyStats.reduce((acc, s) => acc + s.uptimePercent, 0) / dailyStats.length).toFixed(1)
      : '100.0'

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5">
      <div className="grid grid-cols-4 gap-2 shrink-0">
        <div className="bg-[#111827] border border-[#1e293b] rounded-[9px] px-3 py-2 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400">평균 가동률</div>
            <div className="text-[10px] text-slate-500 mt-0.5">최근 30일 집계 기준</div>
          </div>
          <div className="text-[20px] font-bold text-[#38bdf8]">
            {avgUptime}
            <span className="text-[11px] text-slate-400 ml-0.5">%</span>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1e293b] rounded-[9px] px-3 py-2 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400">정상 가동 대상</div>
            <div className="text-[10px] text-[#34d399] mt-0.5">
              전체 {summary.totalTargets}개 중
            </div>
          </div>
          <div className="text-[20px] font-bold text-[#34d399]">
            {summary.runningCount}
            <span className="text-[11px] text-slate-400 ml-0.5">개</span>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1e293b] rounded-[9px] px-3 py-2 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400">누적 자동 재시작</div>
            <div className="text-[10px] text-slate-500 mt-0.5">전체 프로세스 합산</div>
          </div>
          <div className="text-[20px] font-bold text-slate-100">
            {processes.reduce((acc, p) => acc + p.totalRestartCount, 0)}
            <span className="text-[11px] text-slate-400 ml-0.5">회</span>
          </div>
        </div>

        <div className="bg-[#111827] border border-[#1e293b] rounded-[9px] px-3 py-2 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400">시간 동기화 성공률</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              성공 {summary.ntpSuccessCount} / 실패 {summary.ntpFailCount}
            </div>
          </div>
          <div className="text-[20px] font-bold text-[#34d399]">
            {ntpRate}
            <span className="text-[11px] text-slate-400 ml-0.5">%</span>
          </div>
        </div>
      </div>

      <UtilityCard
        title="일자별 · 프로세스별 가동률 및 재시작 통계"
        rightAction={
          <PillButton variant="primary" size="sm" onClick={onExportPdf}>
            <FileText className="w-3 h-3" />
            <span>문서 보고서 출력</span>
          </PillButton>
        }
        className="flex-1 min-h-0"
      >
        <div className="flex-1 min-h-0 overflow-y-auto border border-[#1e293b] rounded-[8px] bg-[#0b0f19]/60">
          <table className="w-full table-fixed text-left border-collapse text-[11.5px]">
            <thead className="sticky top-0 bg-[#111827] border-b border-[#1e293b] text-slate-300">
              <tr>
                <th className="w-[16%] py-2 px-2.5 font-semibold whitespace-nowrap">집계 일자</th>
                <th className="w-[24%] py-2 px-2.5 font-semibold whitespace-nowrap">프로그램 이름</th>
                <th className="w-[14%] py-2 px-2.5 font-semibold whitespace-nowrap">가동률</th>
                <th className="w-[26%] py-2 px-2.5 font-semibold whitespace-nowrap">가동률 그래프</th>
                <th className="w-[10%] py-2 px-2.5 font-semibold whitespace-nowrap text-right">재시작</th>
                <th className="w-[10%] py-2 px-2.5 font-semibold whitespace-nowrap text-right">응답없음</th>
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
                    <td className="py-1.5 px-2.5 truncate font-semibold text-slate-200">
                      {stat.targetName}
                    </td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap font-semibold text-[#38bdf8]">
                      {stat.uptimePercent.toFixed(2)}%
                    </td>
                    <td className="py-1.5 px-2.5">
                      <div className="w-full h-2 rounded-full bg-[#1e293b] overflow-hidden">
                        <div
                          className="h-full bg-[#2563eb] rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, stat.uptimePercent))}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap text-right text-slate-200">
                      {stat.restartCount}회
                    </td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap text-right text-slate-400">
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
