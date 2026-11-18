import React from 'react'
import { RebootScheduleConfig, RebootScheduleRuleMode } from '@shared/types/domain'
import { UtilityCard } from '../../components/ui/UtilityCard'

interface RebootScheduleCardProps {
  reboot: RebootScheduleConfig
  onChange: (next: RebootScheduleConfig) => void
}

const ALL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const WEEKDAY_ITEMS: Array<{ label: string; value: number }> = [
  { label: '월', value: 1 },
  { label: '화', value: 2 },
  { label: '수', value: 3 },
  { label: '목', value: 4 },
  { label: '금', value: 5 },
  { label: '토', value: 6 },
  { label: '일', value: 0 }
]
const ALL_DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1)

const inputCls =
  'h-[26px] px-2 rounded-[6px] bg-[#ffffff] border border-[#cbd5e1] text-[12px] text-[#0f172a] focus:outline-2 focus:outline-[#2563eb]'

function toggleNumberItem(list: number[], item: number): number[] {
  if (list.includes(item)) {
    return list.filter((v) => v !== item)
  }
  return [...list, item].sort((a, b) => a - b)
}

export const RebootScheduleCard: React.FC<RebootScheduleCardProps> = ({ reboot, onChange }) => {
  const updateField = <K extends keyof RebootScheduleConfig>(
    key: K,
    val: RebootScheduleConfig[K]
  ): void => {
    onChange({
      ...reboot,
      [key]: val
    })
  }

  const allMonthsSelected = ALL_MONTHS.every((m) => reboot.months.includes(m))

  const handleToggleAllMonths = (): void => {
    updateField('months', allMonthsSelected ? [] : [...ALL_MONTHS])
  }

  const handleToggleRuleMode = (mode: RebootScheduleRuleMode): void => {
    updateField('ruleMode', mode)
  }

  return (
    <UtilityCard
      title="정기 시스템 재시작 예약 설정"
      rightAction={
        <div className="inline-flex items-center p-0.5 rounded-[8px] bg-[#e2e8f0] gap-0.5 shrink-0">
          {[
            { label: '사용함', value: true },
            { label: '사용 안 함', value: false }
          ].map((opt) => {
            const active = reboot.enabled === opt.value
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => updateField('enabled', opt.value)}
                className={`h-[24px] px-2.5 rounded-[6px] text-[11.5px] whitespace-nowrap transition-all duration-150 cursor-pointer select-none ${
                  active
                    ? 'bg-[#2563eb] text-white font-semibold'
                    : 'text-[#334155] hover:text-[#0f172a] font-medium'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      }
      className="flex-1 min-h-0"
      bodyClassName="justify-between"
    >
      <div className="rounded-[8px] bg-[#f8fafc] border border-[#cbd5e1] divide-y divide-[#e2e8f0]">
        {/* 1행: 재시작 시각 지정 및 미실행 시 보완 실행 */}
        <div className="flex items-center justify-between gap-2 px-3 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[12.5px] font-semibold text-[#0f172a] whitespace-nowrap">
              재시작 시각
            </span>
            <div className="inline-flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={23}
                value={reboot.hour}
                onChange={(e) =>
                  updateField('hour', Math.min(23, Math.max(0, Number(e.target.value) || 0)))
                }
                className={`${inputCls} w-[48px] text-center font-semibold`}
              />
              <span className="text-[11.5px] text-[#475569] font-medium">시</span>
              <input
                type="number"
                min={0}
                max={59}
                value={reboot.minute}
                onChange={(e) =>
                  updateField('minute', Math.min(59, Math.max(0, Number(e.target.value) || 0)))
                }
                className={`${inputCls} w-[48px] text-center font-semibold`}
              />
              <span className="text-[11.5px] text-[#475569] font-medium">분</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="text-[11.5px] font-semibold text-[#334155] whitespace-nowrap"
              title="지정 시각에 프로그램이 꺼져 있었거나 작업 지연으로 재시작하지 못한 경우, 가동 중 이를 감지하여 보완 재시작합니다."
            >
              경과 시 보완 실행
            </span>
            <div className="inline-flex items-center p-0.5 rounded-[7px] bg-[#e2e8f0] gap-0.5">
              {[
                { label: '사용함', value: true },
                { label: '미사용', value: false }
              ].map((opt) => {
                const active = reboot.catchUpOnMissed === opt.value
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => updateField('catchUpOnMissed', opt.value)}
                    className={`h-[22px] px-2 rounded-[5px] text-[11px] whitespace-nowrap transition-all cursor-pointer ${
                      active
                        ? 'bg-[#2563eb] text-white font-semibold'
                        : 'text-[#334155] hover:text-[#0f172a] font-medium'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 2행: 월(1~12월) 선택·해제 */}
        <div className="px-3 py-1.5 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-[#0f172a]">
              적용 월 선택·해제 ({reboot.months.length}개월 선택됨)
            </span>
            <button
              type="button"
              onClick={handleToggleAllMonths}
              className="text-[11px] font-semibold text-[#2563eb] hover:underline cursor-pointer"
            >
              {allMonthsSelected ? '전체 해제' : '전체 선택'}
            </button>
          </div>
          <div className="grid grid-cols-12 gap-1">
            {ALL_MONTHS.map((m) => {
              const selected = reboot.months.includes(m)
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => updateField('months', toggleNumberItem(reboot.months, m))}
                  className={`h-[23px] rounded-[5px] text-[11px] font-semibold transition-all cursor-pointer select-none border ${
                    selected
                      ? 'bg-[#2563eb] text-white border-[#2563eb]'
                      : 'bg-[#ffffff] text-[#475569] border-[#cbd5e1] hover:text-[#0f172a]'
                  }`}
                >
                  {m}월
                </button>
              )
            })}
          </div>
        </div>

        {/* 3행: 요일별 / 일자별 선택·해제 */}
        <div className="px-3 py-1.5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center p-0.5 rounded-[7px] bg-[#e2e8f0] gap-0.5">
              {(
                [
                  { label: '요일별 지정', value: 'DAYS_OF_WEEK' },
                  { label: '일자별 지정 (1~31일)', value: 'DAYS_OF_MONTH' }
                ] as const
              ).map((tab) => {
                const active = reboot.ruleMode === tab.value
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => handleToggleRuleMode(tab.value)}
                    className={`h-[22px] px-2.5 rounded-[5px] text-[11px] transition-all cursor-pointer ${
                      active
                        ? 'bg-[#2563eb] text-white font-semibold'
                        : 'text-[#334155] hover:text-[#0f172a] font-medium'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {reboot.ruleMode === 'DAYS_OF_WEEK' ? (
              <button
                type="button"
                onClick={() =>
                  updateField(
                    'daysOfWeek',
                    reboot.daysOfWeek.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6]
                  )
                }
                className="text-[11px] font-semibold text-[#2563eb] hover:underline cursor-pointer"
              >
                {reboot.daysOfWeek.length === 7 ? '요일 전체 해제' : '요일 전체 선택'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  updateField(
                    'daysOfMonth',
                    reboot.daysOfMonth.length === 31 ? [] : [...ALL_DAYS_OF_MONTH]
                  )
                }
                className="text-[11px] font-semibold text-[#2563eb] hover:underline cursor-pointer"
              >
                {reboot.daysOfMonth.length === 31 ? '일자 전체 해제' : '일자 전체 선택'}
              </button>
            )}
          </div>

          {reboot.ruleMode === 'DAYS_OF_WEEK' ? (
            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAY_ITEMS.map((day) => {
                const selected = reboot.daysOfWeek.includes(day.value)
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() =>
                      updateField('daysOfWeek', toggleNumberItem(reboot.daysOfWeek, day.value))
                    }
                    className={`h-[25px] rounded-[5px] text-[11.5px] font-semibold transition-all cursor-pointer select-none border ${
                      selected
                        ? 'bg-[#2563eb] text-white border-[#2563eb]'
                        : 'bg-[#ffffff] text-[#475569] border-[#cbd5e1] hover:text-[#0f172a]'
                    }`}
                  >
                    {day.label}요일
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-11 gap-1">
              {ALL_DAYS_OF_MONTH.map((d) => {
                const selected = reboot.daysOfMonth.includes(d)
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      updateField('daysOfMonth', toggleNumberItem(reboot.daysOfMonth, d))
                    }
                    className={`h-[20px] rounded-[4px] text-[10.5px] font-semibold transition-all cursor-pointer select-none border ${
                      selected
                        ? 'bg-[#2563eb] text-white border-[#2563eb]'
                        : 'bg-[#ffffff] text-[#475569] border-[#cbd5e1] hover:text-[#0f172a]'
                    }`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="text-[11px] text-[#64748b] flex items-center justify-between px-1 pt-0.5">
        <span>
          실행 30초 전 상단 취소 알림이 표시되며, 지정 시각 이후 부팅된 경우 중복 재시작하지 않습니다.
        </span>
        <span className="font-semibold text-[#334155] shrink-0">
          최근 실행일: {reboot.lastExecutedDate || '기록 없음'}
        </span>
      </div>
    </UtilityCard>
  )
}
