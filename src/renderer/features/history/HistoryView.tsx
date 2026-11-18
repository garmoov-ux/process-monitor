import React, { useMemo, useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import {
  EventSeverity,
  NtpSyncRecord,
  ProcessEventRecord,
  ProcessTargetConfig
} from '@shared/types/domain'
import { UtilityCard } from '../../components/ui/UtilityCard'
import { OptionChip } from '../../components/ui/OptionChip'
import { SearchInput } from '../../components/ui/SearchInput'
import { PillButton } from '../../components/ui/PillButton'

interface HistoryViewProps {
  targets: ProcessTargetConfig[]
  events: ProcessEventRecord[]
  ntpHistory: NtpSyncRecord[]
  onExportCsv: () => void
  onExportPdf: () => void
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  targets,
  events,
  ntpHistory,
  onExportCsv,
  onExportPdf
}) => {
  const [subTab, setSubTab] = useState<'PROCESS' | 'NTP'>('PROCESS')
  const [severityFilter, setSeverityFilter] = useState<'ALL' | EventSeverity>('ALL')
  const [targetFilter, setTargetFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (severityFilter !== 'ALL' && ev.severity !== severityFilter) return false
      if (targetFilter !== 'ALL' && ev.targetId !== targetFilter) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        return (
          ev.targetName.toLowerCase().includes(q) ||
          ev.message.toLowerCase().includes(q) ||
          ev.eventType.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [events, severityFilter, targetFilter, search])

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-2.5">
      <UtilityCard
        title="프로세스 제어/장애 이력 및 시간 동기화 기록"
        rightAction={
          <div className="flex items-center gap-1.5">
            <div className="inline-flex p-0.5 rounded-[7px] bg-[#090d16] border border-[#1e293b]">
              <button
                type="button"
                onClick={() => setSubTab('PROCESS')}
                className={`h-[23px] px-2.5 rounded-[5px] text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                  subTab === 'PROCESS' ? 'bg-[#2563eb] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                프로세스 이력 ({events.length})
              </button>
              <button
                type="button"
                onClick={() => setSubTab('NTP')}
                className={`h-[23px] px-2.5 rounded-[5px] text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                  subTab === 'NTP' ? 'bg-[#2563eb] text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                시간 동기화 ({ntpHistory.length})
              </button>
            </div>

            <PillButton variant="pearl-capsule" size="sm" onClick={onExportCsv}>
              <FileSpreadsheet className="w-3 h-3 text-[#38bdf8]" />
              <span>CSV</span>
            </PillButton>
            <PillButton variant="primary" size="sm" onClick={onExportPdf}>
              <Download className="w-3 h-3" />
              <span>PDF 보고서</span>
            </PillButton>
          </div>
        }
        className="flex-1 min-h-0"
      >
        {subTab === 'PROCESS' ? (
          <>
            <div className="flex items-center justify-between gap-2 mb-2 shrink-0 flex-wrap">
              <div className="flex items-center gap-1 flex-wrap">
                <OptionChip
                  label="전체"
                  selected={severityFilter === 'ALL'}
                  onClick={() => setSeverityFilter('ALL')}
                />
                <OptionChip
                  label="안내"
                  selected={severityFilter === 'INFO'}
                  onClick={() => setSeverityFilter('INFO')}
                />
                <OptionChip
                  label="경고/복구"
                  selected={severityFilter === 'WARN'}
                  onClick={() => setSeverityFilter('WARN')}
                />
                <OptionChip
                  label="오류/차단"
                  selected={severityFilter === 'ERROR'}
                  onClick={() => setSeverityFilter('ERROR')}
                />

                <select
                  value={targetFilter}
                  onChange={(e) => setTargetFilter(e.target.value)}
                  className="h-[25px] px-2.5 rounded-[6px] border border-[#334155] bg-[#0f172a] text-[11px] text-slate-200"
                >
                  <option value="ALL">전체 프로그램</option>
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="이력 검색..."
                className="w-[200px]"
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto border border-[#1e293b] rounded-[8px] bg-[#0b0f19]/60">
              <table className="w-full text-left border-collapse text-[11.5px]">
                <thead className="sticky top-0 bg-[#111827] border-b border-[#1e293b] text-slate-300">
                  <tr>
                    <th className="py-2 px-2.5 font-semibold whitespace-nowrap">발생 시각</th>
                    <th className="py-2 px-2.5 font-semibold whitespace-nowrap">등급</th>
                    <th className="py-2 px-2.5 font-semibold whitespace-nowrap">대상 프로그램</th>
                    <th className="py-2 px-2.5 font-semibold whitespace-nowrap">프로세스 번호</th>
                    <th className="py-2 px-2.5 font-semibold whitespace-nowrap">상세 내용</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]/70">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        조회된 이벤트 이력이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-[#1e293b]/40">
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-slate-400">
                          {new Date(ev.createdAt).toLocaleString('ko-KR')}
                        </td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-[5px] text-[10px] font-semibold ${
                              ev.severity === 'ERROR'
                                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                                : ev.severity === 'WARN'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : 'bg-sky-500/15 text-[#38bdf8] border border-sky-500/30'
                            }`}
                          >
                            {ev.severity === 'ERROR'
                              ? '오류/차단'
                              : ev.severity === 'WARN'
                                ? '주의/복구'
                                : '안내'}
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap font-semibold text-slate-200">
                          {ev.targetName}
                        </td>
                        <td className="py-1.5 px-2.5 whitespace-nowrap text-slate-400">
                          {ev.pid ?? '-'}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-200">{ev.message}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto border border-[#1e293b] rounded-[8px] bg-[#0b0f19]/60">
            <table className="w-full text-left border-collapse text-[11.5px]">
              <thead className="sticky top-0 bg-[#111827] border-b border-[#1e293b] text-slate-300">
                <tr>
                  <th className="py-2 px-2.5 font-semibold whitespace-nowrap">동기화 시각</th>
                  <th className="py-2 px-2.5 font-semibold whitespace-nowrap">상태</th>
                  <th className="py-2 px-2.5 font-semibold whitespace-nowrap">응답 서버</th>
                  <th className="py-2 px-2.5 font-semibold whitespace-nowrap">오차 (ms)</th>
                  <th className="py-2 px-2.5 font-semibold whitespace-nowrap">지연 (ms)</th>
                  <th className="py-2 px-2.5 font-semibold whitespace-nowrap">상세 결과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/70">
                {ntpHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      시간 동기화 수행 이력이 없습니다.
                    </td>
                  </tr>
                ) : (
                  ntpHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-[#1e293b]/40">
                      <td className="py-1.5 px-2.5 whitespace-nowrap text-slate-400">
                        {new Date(item.syncedAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="py-1.5 px-2.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-[5px] text-[10px] font-semibold ${
                            item.status === 'SUCCESS'
                              ? 'bg-emerald-500/15 text-[#34d399] border border-emerald-500/30'
                              : item.status === 'OFFSET_EXCEEDED'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {item.status === 'SUCCESS'
                            ? '성공'
                            : item.status === 'OFFSET_EXCEEDED'
                              ? '오차초과 보류'
                              : '실패'}
                        </span>
                      </td>
                      <td className="py-1.5 px-2.5 whitespace-nowrap font-semibold text-slate-200">
                        {item.serverUsed}
                      </td>
                      <td className="py-1.5 px-2.5 whitespace-nowrap text-[#38bdf8] font-medium">
                        {item.offsetMs >= 0 ? `+${item.offsetMs}` : item.offsetMs} ms
                      </td>
                      <td className="py-1.5 px-2.5 whitespace-nowrap text-slate-400">
                        {item.rttMs} ms
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-200">{item.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </UtilityCard>
    </div>
  )
}
