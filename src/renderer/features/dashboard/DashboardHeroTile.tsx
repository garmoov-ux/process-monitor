import React from 'react'
import { DashboardSummary } from '@shared/types/domain'
import { PillButton } from '../../components/ui/PillButton'

interface DashboardHeroTileProps {
  summary: DashboardSummary
  onOpenAddModal: () => void
  onSyncNtpNow: () => void
}

export const DashboardHeroTile: React.FC<DashboardHeroTileProps> = ({
  summary,
  onOpenAddModal,
  onSyncNtpNow
}) => {
  const lastNtp = summary.lastNtpSync

  return (
    <section className="rounded-[18px] bg-[#272729] text-white p-5 border border-[#3a3a3c] shrink-0">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-semibold text-[#2997ff] whitespace-nowrap">
              무인 프로세스 자동 복구 및 다중 시간 동기화 엔진
            </span>
            {summary.maintenanceMode && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold whitespace-nowrap">
                현재 전체 점검 모드 활성화됨
              </span>
            )}
          </div>
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] mt-0.5 whitespace-nowrap">
            실시간 프로세스 감시 관제 현황
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PillButton variant="dark-utility" size="sm" onClick={onSyncNtpNow} className="border border-[#48484a]">
            즉시 시간 동기화 테스트
          </PillButton>
          <PillButton variant="primary" size="sm" onClick={onOpenAddModal}>
            + 감시 대상 프로그램 추가
          </PillButton>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3 mt-4">
        <div className="rounded-[14px] bg-[#2a2a2c] border border-[#3a3a3c] px-4 py-3">
          <p className="text-[12px] text-[#cccccc] whitespace-nowrap">전체 등록 프로그램</p>
          <p className="text-[24px] font-bold tracking-[-0.02em] text-white mt-0.5">
            {summary.totalTargets}
            <span className="text-[13px] font-normal text-[#cccccc] ml-1">개</span>
          </p>
        </div>

        <div className="rounded-[14px] bg-[#2a2a2c] border border-[#3a3a3c] px-4 py-3">
          <p className="text-[12px] text-[#cccccc] whitespace-nowrap">정상 가동 중</p>
          <p className="text-[24px] font-bold tracking-[-0.02em] text-emerald-400 mt-0.5">
            {summary.runningCount}
            <span className="text-[13px] font-normal text-[#cccccc] ml-1">개</span>
          </p>
        </div>

        <div className="rounded-[14px] bg-[#2a2a2c] border border-[#3a3a3c] px-4 py-3">
          <p className="text-[12px] text-[#cccccc] whitespace-nowrap">구동 유예 / 재시작 대기</p>
          <p className="text-[24px] font-bold tracking-[-0.02em] text-[#2997ff] mt-0.5">
            {summary.graceOrPendingCount}
            <span className="text-[13px] font-normal text-[#cccccc] ml-1">개</span>
          </p>
        </div>

        <div className="rounded-[14px] bg-[#2a2a2c] border border-[#3a3a3c] px-4 py-3">
          <p className="text-[12px] text-[#cccccc] whitespace-nowrap">응답 없음 / 연속 실패 차단</p>
          <p className="text-[24px] font-bold tracking-[-0.02em] text-rose-400 mt-0.5">
            {summary.issueOrCircuitCount}
            <span className="text-[13px] font-normal text-[#cccccc] ml-1">개</span>
          </p>
        </div>

        <div className="rounded-[14px] bg-[#2a2a2c] border border-[#3a3a3c] px-4 py-3">
          <p className="text-[12px] text-[#cccccc] whitespace-nowrap">최근 시간 동기화 오차</p>
          <p className="text-[19px] font-bold tracking-[-0.02em] text-[#2997ff] mt-1 truncate">
            {lastNtp
              ? `${lastNtp.offsetMs >= 0 ? '+' : ''}${lastNtp.offsetMs} ms`
              : '동기화 기록 없음'}
          </p>
          <p className="text-[11px] text-[#cccccc] truncate mt-0.5">
            {lastNtp ? `응답 서버: ${lastNtp.serverUsed}` : `성공 ${summary.ntpSuccessCount}건 / 실패 ${summary.ntpFailCount}건`}
          </p>
        </div>
      </div>
    </section>
  )
}
