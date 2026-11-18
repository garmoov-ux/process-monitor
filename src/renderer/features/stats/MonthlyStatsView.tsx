import React from 'react'
import { FileText } from 'lucide-react'
import {
  DailyProcessStat,
  DashboardSummary,
  ProcessRuntimeStatus
} from '@shared/types/domain'
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
    <div className="h-full p-3.5 w-full min-h-0 flex flex-col gap-3">
      {/* 월간 요약 지표 4단 (첫 카드 다크, 나머지 화이트) */}
      <div className="grid grid-cols-4 gap-2.5 shrink-0">
        <div className="bg-[#0f172a] text-white border border-[#1e293b] rounded-[10px] px-4 py-2.5 flex items-center justify-between">
          <div>
            <div className="text-[11.5px] text-slate-300">평균 가동률</div>
            <div className="text-[11px] text-slate-400 mt-0.5">최근 30일 집계 기준</div>
          </div>
          <div className="text-[22px] font-bold text-[#38bdf8]">
            {avgUptime}
            <span className="text-[12px] text-slate-300 ml-0.5">%</span>
          </div>
        </div>

        <div className="bg-[#ffffff] border border-[#cbd5e1] rounded-[10px] px-4 py-2.5 flex items-center justify-between">
          <div>
            <div className="text-[11.5px] text-[#64748b]">정상 가동 대상</div>
            <div className="text-[11px] text-[#2563eb] font-medium mt-0.5">
              전체 {summary.totalTargets}개 중
            </div>
          </div>
          <div className="text-[22px] font-bold text-[#2563eb]">
            {summary.runningCount.toLocaleString()}
            <span className="text-[12px] text-[#64748b] ml-1">개</span>
          </div>
        </div>

        <div className="bg-[#ffffff] border border-[#cbd5e1] rounded-[10px] px-4 py-2.5 flex items-center justify-between">
          <div>
            <div className="text-[11.5px] text-[#64748b]">누적 자동 재시작</div>
            <div className="text-[11px] text-[#475569] font-medium mt-0.5">등록 프로세스 합산</div>
          </div>
          <div className="text-[22px] font-bold text-[#0f172a]">
            {processes.reduce((acc, p) => acc + p.totalRestartCount, 0).toLocaleString()}
            <span className="text-[12px] text-[#64748b] ml-1">회</span>
          </div>
        </div>

        <div className="bg-[#ffffff] border border-[#cbd5e1] rounded-[10px] px-4 py-2.5 flex items-center justify-between">
          <div>
            <div className="text-[11.5px] text-[#64748b]">시간 동기화 성공률</div>
            <div className="text-[11px] text-[#059669] font-medium mt-0.5">
              성공 {summary.ntpSuccessCount}건 / 실패 {summary.ntpFailCount}건
            </div>
          </div>
          <div className="text-[22px] font-bold text-[#059669]">
            {ntpRate}
            <span className="text-[12px] text-[#64748b] ml-0.5">%</span>
          </div>
        </div>
      </div>

      {/* 방법 A: 단일 보더 통계 테이블 시트 (영문 Uptime % 제거) */}
      <section className="flex-1 min-h-0 bg-[#ffffff] border border-[#cbd5e1] rounded-[10px] overflow-hidden flex flex-col">
        <div className="px-3.5 py-2.5 border-b border-[#cbd5e1] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[14.5px] font-bold text-[#0f172a]">
              일자별 · 프로세스별 가동률 및 재시작 통계
            </h3>
            <span className="text-[12px] text-[#64748b]">
              총 <strong className="text-[#0f172a]">{dailyStats.length}</strong>건 집계
            </span>
          </div>

          <PillButton variant="primary" size="sm" onClick={onExportPdf}>
            <FileText className="w-3.5 h-3.5" />
            <span>보고서 출력</span>
          </PillButton>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full table-fixed text-left border-collapse text-[12.5px]">
            <thead className="sticky top-0 bg-[#f1f5f9] border-b border-[#cbd5e1] text-[#334155] text-[12px] z-10">
              <tr>
                <th className="w-[16%] py-2 px-3 font-semibold whitespace-nowrap">집계 일자</th>
                <th className="w-[24%] py-2 px-3 font-semibold whitespace-nowrap">프로그램 이름</th>
                <th className="w-[14%] py-2 px-3 font-semibold whitespace-nowrap">가동률</th>
                <th className="w-[26%] py-2 px-3 font-semibold whitespace-nowrap">가동률 그래프</th>
                <th className="w-[10%] py-2 px-3 font-semibold whitespace-nowrap text-right">재시작 횟수</th>
                <th className="w-[10%] py-2 px-3 font-semibold whitespace-nowrap text-right">응답 없음</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0] bg-[#ffffff]">
              {dailyStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-[#64748b]">
                    집계된 일별 가동률 통계 데이터가 아직 없습니다.
                  </td>
                </tr>
              ) : (
                dailyStats.map((stat) => (
                  <tr key={`${stat.statDate}_${stat.targetId}`} className="hover:bg-[#f8fafc]">
                    <td className="py-2 px-3 whitespace-nowrap text-[#64748b]">
                      {stat.statDate}
                    </td>
                    <td className="py-2 px-3 truncate font-bold text-[#0f172a]">
                      {stat.targetName}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap font-bold text-[#2563eb]">
                      {stat.uptimePercent.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3">
                      <div className="w-full h-2.5 rounded-full bg-[#e2e8f0] overflow-hidden">
                        <div
                          className="h-full bg-[#2563eb] rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, stat.uptimePercent))}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-right font-semibold text-[#0f172a]">
                      {stat.restartCount}회
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-right text-[#64748b]">
                      {stat.hungCount}회
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
