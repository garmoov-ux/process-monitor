import React from 'react'
import {
  Activity,
  BarChart3,
  Database,
  Info,
  Layers,
  Pause,
  Play,
  RefreshCw,
  ScrollText,
  Settings
} from 'lucide-react'
import { DashboardSummary } from '@shared/types/domain'

export type NavTabId =
  | 'dashboard'
  | 'targets'
  | 'history'
  | 'stats'
  | 'logs'
  | 'settings'
  | 'about'

interface GlobalNavProps {
  activeTab: NavTabId
  onSelectTab: (tab: NavTabId) => void
  summary: DashboardSummary
  onToggleMaintenance: (next: boolean) => void
  onSyncNtpNow: () => void
}

const TABS: Array<{ id: NavTabId; label: string; title: string; icon: React.ReactNode }> = [
  {
    id: 'dashboard',
    label: '현황',
    title: '실시간 프로세스 감시 현황 및 개별 제어',
    icon: <Activity className="w-[16px] h-[16px]" />
  },
  {
    id: 'targets',
    label: '대상',
    title: '감시 대상 프로세스 등록 · 수정 및 실행 중 프로그램 선택',
    icon: <Layers className="w-[16px] h-[16px]" />
  },
  {
    id: 'history',
    label: '이력',
    title: '프로세스 기동/장애 및 시간 동기화 이력 조회',
    icon: <Database className="w-[16px] h-[16px]" />
  },
  {
    id: 'stats',
    label: '통계',
    title: '일별 가동률 및 재시작 통계 차트',
    icon: <BarChart3 className="w-[16px] h-[16px]" />
  },
  {
    id: 'logs',
    label: '로그',
    title: '실시간 운용 이벤트 로그 조회',
    icon: <ScrollText className="w-[16px] h-[16px]" />
  },
  {
    id: 'settings',
    label: '설정',
    title: '감시 주기 · 시간 동기화 서버/포트 · 보관 기간 설정',
    icon: <Settings className="w-[16px] h-[16px]" />
  },
  {
    id: 'about',
    label: '정보',
    title: '프로그램 정보 · 버전 기록 · 유지보수 도구',
    icon: <Info className="w-[16px] h-[16px]" />
  }
]

export const GlobalNav: React.FC<GlobalNavProps> = ({
  activeTab,
  onSelectTab,
  summary,
  onToggleMaintenance,
  onSyncNtpNow
}) => {
  const isWatching = !summary.maintenanceMode

  return (
    <aside className="w-[62px] h-full bg-[#090d16] text-slate-300 border-r border-[#1e293b] flex flex-col items-center justify-between py-2 shrink-0 select-none">
      <div className="flex flex-col items-center gap-1.5 w-full">
        <button
          type="button"
          onClick={() => onSelectTab('about')}
          title="프로세스 모니터 프로그램 정보"
          className="relative w-[46px] h-[32px] rounded-[8px] bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <span className="text-[11.5px] font-extrabold tracking-tight text-white leading-none">
            감<span className="text-[#38bdf8]">시</span>
          </span>
          <span
            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-[#090d16] ${
              isWatching ? 'bg-[#10b981] animate-pulse' : 'bg-[#f59e0b]'
            }`}
          />
        </button>

        <div className="w-7 h-[1px] bg-[#1e293b]" />

        <nav className="flex flex-col items-center gap-1 w-full px-1.5">
          {TABS.map((t) => {
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                type="button"
                title={t.title}
                onClick={() => onSelectTab(t.id)}
                className={`w-full py-1.5 rounded-[7px] flex flex-col items-center justify-center gap-0.5 transition-all duration-150 active:scale-95 cursor-pointer ${
                  active
                    ? 'bg-[#2563eb] text-white font-semibold'
                    : 'text-slate-400 hover:bg-[#111827] hover:text-slate-100 font-normal'
                }`}
              >
                {t.icon}
                <span className="text-[10.5px] leading-none">{t.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-1 w-full px-1.5">
        <div className="w-7 h-[1px] bg-[#1e293b] mb-0.5" />

        <button
          type="button"
          onClick={() => onToggleMaintenance(!summary.maintenanceMode)}
          title={
            isWatching
              ? '실시간 감시 작동 중 (클릭 시 전체 점검 모드로 일시정지)'
              : '전체 점검 모드 (클릭 시 실시간 감시 재개)'
          }
          className={`w-full py-1.5 rounded-[7px] flex flex-col items-center justify-center gap-0.5 transition-all duration-150 active:scale-95 cursor-pointer border ${
            isWatching
              ? 'bg-[#064e3b]/50 text-[#34d399] border-[#059669]/50 hover:bg-[#064e3b]/80'
              : 'bg-[#451a03]/60 text-[#fbbf24] border-[#d97706]/50 hover:bg-[#451a03]'
          }`}
        >
          {isWatching ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5 ml-0.5" />
          )}
          <span className="text-[10px] font-medium leading-none">
            {isWatching ? '감시중' : '점검모드'}
          </span>
        </button>

        <button
          type="button"
          onClick={onSyncNtpNow}
          title="다중 시간 서버 즉시 동기화 실행"
          className="w-full py-1.5 rounded-[7px] bg-[#111827] hover:bg-[#1e293b] text-slate-300 hover:text-white border border-[#1e293b] flex flex-col items-center justify-center gap-0.5 transition-all duration-150 active:scale-95 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span className="text-[10px] leading-none">시간동기</span>
        </button>
      </div>
    </aside>
  )
}
