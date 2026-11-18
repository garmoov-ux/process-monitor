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
    <div className="flex-1 min-h-0 flex flex-col gap-4">
      <UtilityCard
        title="프로세스 제어/장애 이력 및 다중 시간 동기화 기록"
        rightAction={
          <div className="flex items-center gap-2">
            <div className="inline-flex p-0.5 rounded-[10px] bg-[#e8e8ed]">
              <button
                type="button"
                onClick={() => setSubTab('PROCESS')}
                className={`h-[28px] px-3 rounded-[8px] text-[12px] font-medium whitespace-nowrap cursor-pointer ${
                  subTab === 'PROCESS' ? 'bg-[#0066cc] text-white' : 'text-[#1d1d1f]'
                }`}
              >
                프로세스 기동/장애 이력 ({events.length})
              </button>
              <button
                type="button"
                onClick={() => setSubTab('NTP')}
                className={`h-[28px] px-3 rounded-[8px] text-[12px] font-medium whitespace-nowrap cursor-pointer ${
                  subTab === 'NTP' ? 'bg-[#0066cc] text-white' : 'text-[#1d1d1f]'
                }`}
              >
                시간 동기화 이력 ({ntpHistory.length})
              </button>
            </div>

            <PillButton variant="pearl-capsule" size="sm" onClick={onExportCsv}>
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#0066cc]" />
              <span>CSV 내보내기</span>
            </PillButton>
            <PillButton variant="primary" size="sm" onClick={onExportPdf}>
              <Download className="w-3.5 h-3.5" />
              <span>PDF 보고서 저장</span>
            </PillButton>
          </div>
        }
        className="flex-1 min-h-0"
      >
        {subTab === 'PROCESS' ? (
          <>
            <div className="flex items-center justify-between gap-3 mb-3 shrink-0 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <OptionChip
                  label="전체 등급"
                  selected={severityFilter === 'ALL'}
                  onClick={() => setSeverityFilter('ALL')}
                />
                <OptionChip
                  label="일반 안내"
                  selected={severityFilter === 'INFO'}
                  onClick={() => setSeverityFilter('INFO')}
                />
                <OptionChip
                  label="경고/재시작"
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
                  className="h-[30px] px-3 rounded-full border border-[#e0e0e0] bg-[#fafafc] text-[12px] text-[#1d1d1f]"
                >
                  <option value="ALL">모든 프로그램 대상</option>
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
                placeholder="프로그램명 또는 상세 메시지 검색..."
                className="w-[260px]"
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto border border-[#e0e0e0] rounded-[14px]">
              <table className="w-full text-left border-collapse text-[12.5px]">
                <thead className="sticky top-0 bg-[#f5f5f7] border-b border-[#e0e0e0]">
                  <tr>
                    <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">발생 시각</th>
                    <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">심각도</th>
                    <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">대상 프로그램</th>
                    <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">프로세스 번호</th>
                    <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">상세 이벤트 내용</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {filteredEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-14 text-center text-[#7a7a7a]">
                        조회된 이벤트 이력이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-[#fafafc]">
                        <td className="py-2.5 px-3.5 whitespace-nowrap text-[#7a7a7a]">
                          {new Date(ev.createdAt).toLocaleString('ko-KR')}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              ev.severity === 'ERROR'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : ev.severity === 'WARN'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-blue-50 text-[#0066cc] border border-blue-200'
                            }`}
                          >
                            {ev.severity === 'ERROR'
                              ? '오류/차단'
                              : ev.severity === 'WARN'
                                ? '주의/복구'
                                : '정상 안내'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap font-semibold text-[#1d1d1f]">
                          {ev.targetName}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap text-[#7a7a7a]">
                          {ev.pid ?? '-'}
                        </td>
                        <td className="py-2.5 px-3.5 text-[#1d1d1f]">{ev.message}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto border border-[#e0e0e0] rounded-[14px]">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead className="sticky top-0 bg-[#f5f5f7] border-b border-[#e0e0e0]">
                <tr>
                  <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">동기화 시각</th>
                  <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">판정 상태</th>
                  <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">응답 시간 서버</th>
                  <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">시간 오차 (ms)</th>
                  <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">왕복 지연 (ms)</th>
                  <th className="py-2.5 px-3.5 font-semibold whitespace-nowrap">상세 결과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e0e0e0]">
                {ntpHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-[#7a7a7a]">
                      시간 동기화 수행 이력이 없습니다.
                    </td>
                  </tr>
                ) : (
                  ntpHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-[#fafafc]">
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-[#7a7a7a]">
                        {new Date(item.syncedAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            item.status === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.status === 'OFFSET_EXCEEDED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {item.status === 'SUCCESS'
                            ? '동기화 성공'
                            : item.status === 'OFFSET_EXCEEDED'
                              ? '오차 한계 초과 보류'
                              : '통신 실패'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-semibold text-[#1d1d1f]">
                        {item.serverUsed}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-[#0066cc] font-medium">
                        {item.offsetMs >= 0 ? `+${item.offsetMs}` : item.offsetMs} ms
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-[#7a7a7a]">
                        {item.rttMs} ms
                      </td>
                      <td className="py-2.5 px-3.5 text-[#1d1d1f]">{item.message}</td>
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
