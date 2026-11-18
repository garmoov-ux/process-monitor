import React from 'react'
import { FolderOpen, History, Info, RefreshCw, Sparkles, Wrench } from 'lucide-react'
import { StorageFolderItem } from '@shared/types/domain'
import { UtilityCard } from '../../components/ui/UtilityCard'
import { PillButton } from '../../components/ui/PillButton'

interface ProgramInfoViewProps {
  storageInfo: StorageFolderItem[]
  onOpenFolder: (kind: 'LOGS' | 'DATA' | 'CONFIG' | string) => void
  onSyncNtpNow: () => void
  onRunCleanupNow: () => void
}

function formatKoreanBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} 바이트`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} 킬로바이트`
  return `${(bytes / (1024 * 1024)).toFixed(1)} 메가바이트`
}

const RELEASE_HISTORY = [
  {
    version: '버전 1.0.0',
    date: '2026-11-18',
    badge: '현재 운영 버전',
    items: [
      '좌측 다크 아이콘 사이드바 및 화이트·슬레이트 관제 화면(1040×680) 적용',
      '단조 증가 시계 기반 8대 독립 상태 머신(유예·재시작 대기·응답 없음·연속 실패 차단) 구현',
      '다중 시간 동기화 서버(개별 포트 지정 및 자동 전환) 및 시간 급변 안전장치 구현',
      '감시 대상 등록 전용 화면(실행 중 프로그램 원클릭 선택 및 수동 지정) 및 보고서 출력 지원'
    ]
  }
]

export const ProgramInfoView: React.FC<ProgramInfoViewProps> = ({
  storageInfo,
  onOpenFolder,
  onSyncNtpNow,
  onRunCleanupNow
}) => {
  return (
    <div className="h-full p-3.5 w-full min-h-0 grid grid-cols-12 gap-3">
      {/* 좌측: 프로그램 기본 정보 (속성 : 값) + 버전별 업데이트 기록 */}
      <div className="col-span-6 min-h-0 flex flex-col gap-3">
        <UtilityCard
          title="프로그램 기본 정보"
          badge={<Info className="w-3.5 h-3.5 text-[#2563eb]" />}
          className="shrink-0"
        >
          <div className="border border-[#cbd5e1] rounded-[8px] overflow-hidden bg-[#ffffff] divide-y divide-[#e2e8f0] text-[13px]">
            <div className="grid grid-cols-12 items-center px-3.5 py-2">
              <span className="col-span-4 text-[#64748b] font-medium">프로그램명</span>
              <span className="col-span-1 text-center text-[#94a3b8]">:</span>
              <span className="col-span-7 text-right font-extrabold text-[#0f172a] text-[14px]">
                Process Monitor
              </span>
            </div>
            <div className="grid grid-cols-12 items-center px-3.5 py-2">
              <span className="col-span-4 text-[#64748b] font-medium">시스템 구분</span>
              <span className="col-span-1 text-center text-[#94a3b8]">:</span>
              <span className="col-span-7 text-right font-semibold text-[#0f172a]">
                다중 프로세스 감시 및 자동 복구 시스템
              </span>
            </div>
            <div className="grid grid-cols-12 items-center px-3.5 py-2">
              <span className="col-span-4 text-[#64748b] font-medium">버전</span>
              <span className="col-span-1 text-center text-[#94a3b8]">:</span>
              <span className="col-span-7 text-right font-bold text-[#2563eb]">
                버전 1.0.0 (2026.11.18)
              </span>
            </div>
            <div className="grid grid-cols-12 items-center px-3.5 py-2">
              <span className="col-span-4 text-[#64748b] font-medium">감시 항목</span>
              <span className="col-span-1 text-center text-[#94a3b8]">:</span>
              <span className="col-span-7 text-right font-semibold text-[#0f172a]">
                실행 상태 · 응답 없음 · 다중 시간 동기화
              </span>
            </div>

            <div className="bg-[#f1f5f9] px-3.5 py-1 text-[11px] font-bold text-[#475569]">
              개발 및 기술지원
            </div>

            <div className="grid grid-cols-12 items-center px-3.5 py-2">
              <span className="col-span-4 text-[#64748b] font-medium">회사</span>
              <span className="col-span-1 text-center text-[#94a3b8]">:</span>
              <span className="col-span-7 text-right font-bold text-[#0f172a]">
                ㈜ 이노네트웍스
              </span>
            </div>
            <div className="grid grid-cols-12 items-center px-3.5 py-2">
              <span className="col-span-4 text-[#64748b] font-medium">제작자</span>
              <span className="col-span-1 text-center text-[#94a3b8]">:</span>
              <span className="col-span-7 text-right font-semibold text-[#0f172a]">강홍선</span>
            </div>
            <div className="grid grid-cols-12 items-center px-3.5 py-2">
              <span className="col-span-4 text-[#64748b] font-medium">이메일</span>
              <span className="col-span-1 text-center text-[#94a3b8]">:</span>
              <span className="col-span-7 text-right font-semibold text-[#2563eb]">
                s_gain@naver.com
              </span>
            </div>
          </div>
        </UtilityCard>

        <UtilityCard
          title="버전별 업데이트 기록"
          badge={<History className="w-3.5 h-3.5 text-[#2563eb]" />}
          className="flex-1 min-h-0"
          bodyClassName="overflow-y-auto space-y-2 pr-1"
        >
          {RELEASE_HISTORY.map((rel) => (
            <div
              key={rel.version}
              className="rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] p-3 shrink-0"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-bold text-[#0f172a]">{rel.version}</span>
                  <span className="px-2 py-0.5 rounded-[5px] bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] text-[10.5px] font-semibold">
                    {rel.badge}
                  </span>
                </div>
                <span className="text-[11.5px] text-[#64748b]">{rel.date}</span>
              </div>
              <ul className="space-y-1 text-[12px] text-[#334155] list-disc list-inside">
                {rel.items.map((item, i) => (
                  <li key={i} className="leading-snug">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </UtilityCard>
      </div>

      {/* 우측: 현장 유지보수 편의 도구 (경로 및 저장소 관리) */}
      <div className="col-span-6 min-h-0 flex flex-col">
        <UtilityCard
          title="현장 유지보수 편의 도구 (경로 및 저장소 관리)"
          badge={<Wrench className="w-3.5 h-3.5 text-[#2563eb]" />}
          className="flex-1 min-h-0"
          bodyClassName="justify-between gap-3"
        >
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
            {storageInfo.map((f) => (
              <div
                key={f.key}
                className="rounded-[8px] border border-[#cbd5e1] bg-[#f8fafc] p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-[#0f172a]">{f.label}</span>
                    <span className="px-2 py-0.5 rounded-[5px] bg-[#ffffff] border border-[#cbd5e1] text-[11px] font-semibold text-[#334155]">
                      파일 {f.fileCount.toLocaleString()}개 · {formatKoreanBytes(f.totalBytes)}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-[#64748b] mt-0.5">{f.description}</div>
                  <div
                    className="text-[11.5px] text-[#334155] mt-1 truncate"
                    title={f.resolvedPath}
                  >
                    {f.resolvedPath}
                  </div>
                </div>

                <PillButton
                  variant="secondary-pill"
                  size="sm"
                  onClick={() => onOpenFolder(f.key)}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>폴더 열기</span>
                </PillButton>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#e2e8f0] flex items-center justify-between gap-2 shrink-0">
            <span className="text-[12px] text-[#64748b]">빠른 유지보수 실행</span>
            <div className="flex items-center gap-2">
              <PillButton variant="pearl-capsule" size="sm" onClick={onSyncNtpNow}>
                <RefreshCw className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>지금 즉시 시간 동기화</span>
              </PillButton>
              <PillButton variant="dark-utility" size="sm" onClick={onRunCleanupNow}>
                <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>경과 파일 즉시 정리</span>
              </PillButton>
            </div>
          </div>
        </UtilityCard>
      </div>
    </div>
  )
}
