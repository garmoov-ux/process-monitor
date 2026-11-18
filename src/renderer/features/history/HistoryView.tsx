import React, { useMemo, useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import {
  EventSeverity,
  NtpSyncRecord,
  ProcessEventRecord,
  ProcessTargetConfig
} from '@shared/types/domain'
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
          ev.message.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [events, severityFilter, targetFilter, search])

  return (
    <div className="h-full p-3.5 w-full flex flex-col gap-3 min-h-0">
      {/* 방법 A: 상단 필터 및 제어 바 */}
      <section className="bg-[#ffffff] rounded-[10px] border border-[#cbd5e1] px-3.5 py-2.5 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="inline-flex p-0.5 rounded-[8px] bg-[#e2e8f0]">
            <button
              type="button"
              onClick={() => setSubTab('PROCESS')}
              className={`h-[26px] px-3 rounded-[6px] text-[12px] font-medium whitespace-nowrap cursor-pointer ${
                subTab === 'PROCESS'
                  ? 'bg-[#2563eb] text-white font-semibold'
                  : 'text-[#334155] hover:text-[#0f172a]'
              }`}
            >
              프로세스 이력 ({events.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('NTP')}
              className={`h-[26px] px-3 rounded-[6px] text-[12px] font-medium whitespace-nowrap cursor-pointer ${
                subTab === 'NTP'
                  ? 'bg-[#2563eb] text-white font-semibold'
                  : 'text-[#334155] hover:text-[#0f172a]'
              }`}
            >
              시간 동기화 이력 ({ntpHistory.length})
            </button>
          </div>

          {subTab === 'PROCESS' && (
            <>
              <span className="h-4 w-px bg-[#cbd5e1] mx-1" />
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
                className="h-[27px] px-2.5 rounded-[6px] border border-[#cbd5e1] bg-[#f8fafc] text-[11.5px] text-[#0f172a]"
              >
                <option value="ALL">전체 프로그램</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {subTab === 'PROCESS' && (
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="프로그램명 · 내용 검색"
              className="w-[180px]"
            />
          )}
          <PillButton variant="pearl-capsule" size="sm" onClick={onExportCsv}>
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#2563eb]" />
            <span>표 파일 저장</span>
          </PillButton>
          <PillButton variant="secondary-pill" size="sm" onClick={onExportPdf}>
            <Download className="w-3.5 h-3.5" />
            <span>보고서 출력</span>
          </PillButton>
        </div>
      </section>

      {/* 방법 A: 단일 보더 이력 테이블 시트 */}
      <section className="flex-1 min-h-0 bg-[#ffffff] border border-[#cbd5e1] rounded-[10px] overflow-hidden flex flex-col">
        <div className="px-3.5 py-2 border-b border-[#cbd5e1] flex items-center justify-between shrink-0">
          <h2 className="text-[14px] font-bold text-[#0f172a]">
            {subTab === 'PROCESS'
              ? '프로세스 기동 · 장애 및 자동 복구 이력'
              : '다중 시간 서버 동기화 수행 이력'}
          </h2>
          <span className="text-[11.5px] text-[#64748b]">
            총{' '}
            <strong className="text-[#0f172a]">
              {subTab === 'PROCESS' ? filteredEvents.length : ntpHistory.length}
            </strong>
            건 조회됨
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {subTab === 'PROCESS' ? (
            <table className="w-full table-fixed text-left border-collapse text-[12.5px]">
              <thead className="sticky top-0 bg-[#f1f5f9] border-b border-[#cbd5e1] text-[12px] font-semibold text-[#334155] z-10">
                <tr>
                  <th className="w-[21%] py-2 px-3 whitespace-nowrap">발생 시각</th>
                  <th className="w-[11%] py-2 px-3 whitespace-nowrap">구분</th>
                  <th className="w-[20%] py-2 px-3 whitespace-nowrap">대상 프로그램</th>
                  <th className="w-[10%] py-2 px-3 whitespace-nowrap">프로세스 번호</th>
                  <th className="w-[38%] py-2 px-3 whitespace-nowrap">상세 이벤트 내용</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] bg-[#ffffff]">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-[#64748b]">
                      조회된 이벤트 이력이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((ev) => (
                    <tr key={ev.id} className="hover:bg-[#f8fafc]">
                      <td className="py-1.5 px-3 text-[11.5px] text-[#64748b] whitespace-nowrap">
                        {new Date(ev.createdAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="py-1.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-[5px] text-[11px] font-bold border ${
                            ev.severity === 'ERROR'
                              ? 'bg-[#ffe4e6] text-[#be123c] border-[#fecdd3]'
                              : ev.severity === 'WARN'
                                ? 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]'
                                : 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]'
                          }`}
                        >
                          {ev.severity === 'ERROR'
                            ? '오류/차단'
                            : ev.severity === 'WARN'
                              ? '주의/복구'
                              : '안내'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 truncate font-bold text-[#0f172a]">
                        {ev.targetName}
                      </td>
                      <td className="py-1.5 px-3 whitespace-nowrap text-[#475569]">
                        {ev.pid ?? '-'}
                      </td>
                      <td className="py-1.5 px-3 truncate text-[#334155]" title={ev.message}>
                        {ev.message}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full table-fixed text-left border-collapse text-[12.5px]">
              <thead className="sticky top-0 bg-[#f1f5f9] border-b border-[#cbd5e1] text-[12px] font-semibold text-[#334155] z-10">
                <tr>
                  <th className="w-[21%] py-2 px-3 whitespace-nowrap">동기화 시각</th>
                  <th className="w-[12%] py-2 px-3 whitespace-nowrap">판정</th>
                  <th className="w-[19%] py-2 px-3 whitespace-nowrap">응답 시간 서버</th>
                  <th className="w-[13%] py-2 px-3 whitespace-nowrap">시간 오차</th>
                  <th className="w-[12%] py-2 px-3 whitespace-nowrap">왕복 지연</th>
                  <th className="w-[23%] py-2 px-3 whitespace-nowrap">상세 결과</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0] bg-[#ffffff]">
                {ntpHistory.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-[#64748b]">
                      시간 동기화 수행 이력이 없습니다.
                    </td>
                  </tr>
                ) : (
                  ntpHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-[#f8fafc]">
                      <td className="py-1.5 px-3 text-[11.5px] text-[#64748b] whitespace-nowrap">
                        {new Date(item.syncedAt).toLocaleString('ko-KR')}
                      </td>
                      <td className="py-1.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-[5px] text-[11px] font-bold border ${
                            item.status === 'SUCCESS'
                              ? 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]'
                              : item.status === 'OFFSET_EXCEEDED'
                                ? 'bg-[#fef3c7] text-[#b45309] border-[#fde68a]'
                                : 'bg-[#ffe4e6] text-[#be123c] border-[#fecdd3]'
                          }`}
                        >
                          {item.status === 'SUCCESS'
                            ? '성공'
                            : item.status === 'OFFSET_EXCEEDED'
                              ? '오차초과 보류'
                              : '실패'}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 truncate font-bold text-[#0f172a]">
                        {item.serverUsed}
                      </td>
                      <td className="py-1.5 px-3 whitespace-nowrap text-[#2563eb] font-semibold">
                        {item.offsetMs >= 0 ? `+${Math.round(item.offsetMs)}` : Math.round(item.offsetMs)} 밀리초
                      </td>
                      <td className="py-1.5 px-3 whitespace-nowrap text-[#475569]">
                        {Math.round(item.rttMs)} 밀리초
                      </td>
                      <td className="py-1.5 px-3 truncate text-[#334155]" title={item.message}>
                        {item.message}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
