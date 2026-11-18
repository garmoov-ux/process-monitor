import React, { useState } from 'react'
import { ProcessTargetConfig } from '@shared/types/domain'
import { useProcessMonitorState } from './hooks/useProcessMonitorState'
import { GlobalNav, NavTabId } from './components/layout/GlobalNav'
import { StatusFooter } from './components/layout/StatusFooter'
import { DashboardView } from './features/dashboard/DashboardView'
import { TargetModal } from './features/targets/TargetModal'
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
    scanRunning
  } = useProcessMonitorState()

  const [activeTab, setActiveTab] = useState<NavTabId>('dashboard')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState<ProcessTargetConfig | null>(null)

  if (loading || !snapshot) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#f5f5f7] flex items-center justify-center text-[#1d1d1f] select-none">
        <div className="text-center">
          <p className="text-[15px] font-semibold">ProcessMonitor 관제 엔진을 불러오는 중입니다...</p>
        </div>
      </div>
    )
  }

  const handleOpenAdd = (): void => {
    setEditingTarget(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (target: ProcessTargetConfig): void => {
    setEditingTarget(target)
    setModalOpen(true)
  }

  const handleExportCsv = async (): Promise<void> => {
    const res = await window.processMonitorApi.exportCsvReport()
    showToast(res.message)
  }

  const handleExportPdf = async (): Promise<void> => {
    const res = await window.processMonitorApi.exportPdfReport()
    showToast(res.message)
  }

  const handleOpenFolder = (kind: 'LOGS' | 'DATA' | string): void => {
    void window.processMonitorApi.openPathFolder(kind)
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#f5f5f7] text-[#1d1d1f] select-none">
      <GlobalNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        summary={snapshot.summary}
        onToggleMaintenance={(next) => void toggleMaintenanceMode(next)}
        onOpenAddModal={handleOpenAdd}
      />

      {toastMessage && (
        <div className="fixed bottom-12 right-6 z-50 px-4 py-2.5 rounded-full bg-[#272729] text-white text-[12.5px] font-medium border border-[#3a3a3c]">
          {toastMessage}
        </div>
      )}

      <main className="flex-1 min-h-0 p-5 flex flex-col overflow-hidden">
        {activeTab === 'dashboard' && (
          <DashboardView
            summary={snapshot.summary}
            processes={snapshot.processes}
            onOpenAddModal={handleOpenAdd}
            onEditTarget={handleOpenEdit}
            onDeleteTarget={(id) => void deleteTarget(id)}
            onToggleTargetEnabled={(id, enabled) => void toggleTargetEnabled(id, enabled)}
            onControlTarget={(id, cmd) => void controlTarget(id, cmd)}
            onResetCircuit={(id) => void resetCircuitBreaker(id)}
            onSyncNtpNow={() => void syncNtpNow()}
            onOpenExeLocation={(execPath) => handleOpenFolder(execPath)}
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
          />
        )}

        {activeTab === 'about' && <ProgramInfoView />}
      </main>

      <StatusFooter
        config={snapshot.config}
        summary={snapshot.summary}
        onSyncNtpNow={() => void syncNtpNow()}
        onOpenFolder={handleOpenFolder}
      />

      <TargetModal
        open={modalOpen}
        initialTarget={editingTarget}
        onClose={() => setModalOpen(false)}
        onSave={upsertTarget}
        onScanRunning={scanRunning}
      />
    </div>
  )
}
