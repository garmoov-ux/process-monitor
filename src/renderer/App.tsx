import React, { useState } from 'react'
import { ProcessTargetConfig } from '@shared/types/domain'
import { useProcessMonitorState } from './hooks/useProcessMonitorState'
import { GlobalNav, NavTabId } from './components/layout/GlobalNav'
import { StatusFooter } from './components/layout/StatusFooter'
import { DashboardView } from './features/dashboard/DashboardView'
import { TargetManageView } from './features/targets/TargetManageView'
import { HistoryView } from './features/history/HistoryView'
import { RealtimeLogsView } from './features/logs/RealtimeLogsView'
import { MonthlyStatsView } from './features/stats/MonthlyStatsView'
import { SettingsView } from './features/settings/SettingsView'
import { ProgramInfoView } from './features/about/ProgramInfoView'

export const App: React.FC = () => {
  const {
    snapshot,
    loading,
    toastMessage,
    showToast,
    upsertTarget,
    deleteTarget,
    toggleTargetEnabled,
    controlTarget,
    resetCircuitBreaker,
    toggleMaintenanceMode,
    updateConfig,
    syncNtpNow,
    runCleanupNow,
    scanRunning
  } = useProcessMonitorState()

  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard')
  const [editingTarget, setEditingTarget] = useState<ProcessTargetConfig | null>(null)

  if (loading || !snapshot) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#f1f5f9] flex items-center justify-center text-[#0f172a] select-none">
        <p className="text-[13.5px] font-semibold">프로세스 모니터 엔진을 불러오는 중입니다...</p>
      </div>
    )
  }

  const handleGoAddTarget = (): void => {
    setEditingTarget(null)
    setActiveTab('targets')
  }

  const handleGoEditTarget = (target: ProcessTargetConfig): void => {
    setEditingTarget(target)
    setActiveTab('targets')
  }

  const handleExportCsv = async (): Promise<void> => {
    const res = await window.processMonitorApi.exportCsvReport()
    showToast(res.message)
  }

  const handleExportPdf = async (): Promise<void> => {
    const res = await window.processMonitorApi.exportPdfReport()
    showToast(res.message)
  }

  const handleOpenFolder = (kind: 'LOGS' | 'DATA' | 'CONFIG' | string): void => {
    void window.processMonitorApi.openPathFolder(kind)
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#f1f5f9] text-[#0f172a] select-none">
      {/* 좌측 다크 아이콘 사이드바 (#0f172a) */}
      <GlobalNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        summary={snapshot.summary}
        onToggleMaintenance={(next) => void toggleMaintenanceMode(next)}
        onSyncNtpNow={() => void syncNtpNow()}
      />

      {/* 우측 화이트/슬레이트 콘텐츠 영역 */}
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        {toastMessage && (
          <div className="fixed bottom-10 right-6 z-50 bg-[#0f172a] text-white px-4 py-2 rounded-[8px] text-[12px] font-medium border border-[#334155] apple-product-shadow">
            {toastMessage}
          </div>
        )}

        <main className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'dashboard' && (
            <DashboardView
              summary={snapshot.summary}
              processes={snapshot.processes}
              onOpenAddModal={handleGoAddTarget}
              onEditTarget={handleGoEditTarget}
              onDeleteTarget={(id) => void deleteTarget(id)}
              onToggleTargetEnabled={(id, enabled) => void toggleTargetEnabled(id, enabled)}
              onControlTarget={(id, cmd) => void controlTarget(id, cmd)}
              onResetCircuit={(id) => void resetCircuitBreaker(id)}
              onSyncNtpNow={() => void syncNtpNow()}
              onOpenExeLocation={(execPath) => handleOpenFolder(execPath)}
            />
          )}

          {activeTab === 'targets' && (
            <TargetManageView
              processes={snapshot.processes}
              initialEditTarget={editingTarget}
              onClearInitialEdit={() => setEditingTarget(null)}
              onSaveTarget={upsertTarget}
              onDeleteTarget={deleteTarget}
              onScanRunning={scanRunning}
            />
          )}

          {activeTab === 'history' && (
            <HistoryView
              targets={snapshot.config.targets}
              events={snapshot.recentEvents}
              ntpHistory={snapshot.recentNtpHistory}
              onExportCsv={() => void handleExportCsv()}
              onExportPdf={() => void handleExportPdf()}
            />
          )}

          {activeTab === 'logs' && (
            <RealtimeLogsView
              events={snapshot.recentEvents}
              onOpenLogFolder={() => handleOpenFolder('LOGS')}
            />
          )}

          {activeTab === 'stats' && (
            <MonthlyStatsView
              summary={snapshot.summary}
              processes={snapshot.processes}
              dailyStats={snapshot.dailyStats}
              onExportPdf={() => void handleExportPdf()}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              config={snapshot.config}
              summary={snapshot.summary}
              onSaveConfig={updateConfig}
              onSyncNtpNow={async () => {
                await syncNtpNow()
              }}
              onRunCleanupNow={runCleanupNow}
            />
          )}

          {activeTab === 'about' && (
            <ProgramInfoView
              storageInfo={snapshot.storageInfo || []}
              onOpenFolder={handleOpenFolder}
              onSyncNtpNow={() => void syncNtpNow()}
              onRunCleanupNow={() => void runCleanupNow()}
            />
          )}
        </main>

        <StatusFooter
          config={snapshot.config}
          summary={snapshot.summary}
          onOpenFolder={handleOpenFolder}
        />
      </div>
    </div>
  )
}
