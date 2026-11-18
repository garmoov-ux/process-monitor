import React, { useEffect, useState } from 'react'
import {
  Activity,
  BarChart3,
  Clock,
  FileText,
  History,
  Info,
  PauseCircle,
  PlayCircle,
  Settings,
  ShieldCheck
} from 'lucide-react'
import { DashboardSummary } from '@shared/types/domain'

export type NavTabId = 'dashboard' | 'history' | 'logs' | 'stats' | 'settings' | 'about'

interface GlobalNavProps {
  activeTab: NavTabId
  onSelectTab: (tab: NavTabId) => void
  summary: DashboardSummary
  onToggleMaintenance: (next: boolean) => void
  onOpenAddModal: () => void
}

const NAV_ITEMS: Array<{ id: NavTabId; label: string; icon: React.FC<{ className?: string }> }> = [
  { id: 'dashboard', label: '실시간 프로세스 관제', icon: Activity },
  { id: 'history', label: '장애 및 시간동기화 이력', icon: History },
  { id: 'logs', label: '실시간 이벤트 로그', icon: FileText },
  { id: 'stats', label: '가동률 및 재시작 통계', icon: BarChart3 },
  { id: 'settings', label: '시간동기화 및 환경설정', icon: Settings },
  { id: 'about', label: '프로그램 정보', icon: Info }
]

export const GlobalNav: React.FC<GlobalNavProps> = ({
  activeTab,
  onSelectTab,
  summary,
  onToggleMaintenance,
  onOpenAddModal
}) => {
  const [clockText, setClockText] = useState<string>(() => new Date().toLocaleTimeString('ko-KR'))

  useEffect(() => {
    const timer = setInterval(() => {
      setClockText(new Date().toLocaleTimeString('ko-KR'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const isMaint = summary.maintenanceMode

  return (
    <header className="shrink-0 flex flex-col">
      {/* 상단 Pure Black (44px) 글로벌 네비게이션 */}
      <div className="h-[44px] bg-[#000000] text-white px-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#2997ff]" />
            <span className="text-[13.5px] font-semibold tracking-[-0.015em] whitespace-nowrap">
              ProcessMonitor
            </span>
            <span
              className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${
                isMaint
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
              }`}
            >
              {isMaint ? '전체 점검 모드 (감시 일시정지)' : '실시간 자동 복구 감시 중'}
            </span>
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const active = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`h-[30px] px-3 rounded-full text-[12px] inline-flex items-center gap-1.5 whitespace-nowrap transition-transform duration-150 active:scale-95 cursor-pointer ${
                    active
                      ? 'bg-[#0066cc] text-white font-semibold'
                      : 'text-[#cccccc] hover:text-white font-normal'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-[12px] text-[#cccccc] bg-[#272729] px-3 py-1 rounded-full whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-[#2997ff]" />
            <span>시스템 시각 {clockText}</span>
          </div>

          <button
            type="button"
            onClick={() => onToggleMaintenance(!isMaint)}
            className={`h-[28px] px-3 rounded-full text-[12px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-transform duration-150 active:scale-95 cursor-pointer ${
              isMaint
                ? 'bg-[#0066cc] text-white'
                : 'bg-[#272729] text-white border border-[#3a3a3c]'
            }`}
          >
            {isMaint ? (
              <>
                <PlayCircle className="w-3.5 h-3.5 text-white" />
                <span>전체 감시 재개</span>
              </>
            ) : (
              <>
                <PauseCircle className="w-3.5 h-3.5 text-amber-300" />
                <span>전체 감시 일시정지</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="h-[28px] px-3.5 rounded-full bg-[#0066cc] text-white text-[12px] font-semibold whitespace-nowrap transition-transform duration-150 active:scale-95 cursor-pointer"
          >
            + 프로세스 등록
          </button>
        </div>
      </div>
    </header>
  )
}
