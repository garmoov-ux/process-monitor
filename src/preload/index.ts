import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import {
  AppConfig,
  DailyProcessStat,
  HistoryQueryFilter,
  MonitorStateSnapshot,
  NtpSyncRecord,
  ProcessEventRecord,
  ProcessTargetConfig,
  RunningProcessSnapshot
} from '@shared/types/domain'

export const processMonitorApi = {
  getInitialState: (): Promise<MonitorStateSnapshot> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_INITIAL_STATE),

  onStateUpdated: (callback: (snapshot: MonitorStateSnapshot) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: MonitorStateSnapshot): void => {
      callback(snapshot)
    }
    ipcRenderer.on(IPC_CHANNELS.STATE_UPDATED, listener)
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.STATE_UPDATED, listener)
    }
  },

  scanRunningProcesses: (): Promise<RunningProcessSnapshot[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.SCAN_RUNNING_PROCESSES),

  pickExecutableFile: (): Promise<{
    execPath: string
    processName: string
    workDir: string
  } | null> => ipcRenderer.invoke(IPC_CHANNELS.PICK_EXECUTABLE_FILE),

  pickDirectory: (): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.PICK_DIRECTORY),

  upsertTarget: (target: Partial<ProcessTargetConfig>): Promise<MonitorStateSnapshot> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPSERT_TARGET, target),

  deleteTarget: (targetId: string): Promise<MonitorStateSnapshot> =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_TARGET, targetId),

  toggleTargetEnabled: (targetId: string, enabled: boolean): Promise<MonitorStateSnapshot> =>
    ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_TARGET_ENABLED, { targetId, enabled }),

  controlTarget: (
    targetId: string,
    command: 'START' | 'STOP' | 'RESTART'
  ): Promise<MonitorStateSnapshot> =>
    ipcRenderer.invoke(IPC_CHANNELS.CONTROL_TARGET, { targetId, command }),

  resetCircuitBreaker: (targetId: string): Promise<MonitorStateSnapshot> =>
    ipcRenderer.invoke(IPC_CHANNELS.RESET_CIRCUIT_BREAKER, targetId),

  toggleMaintenanceMode: (maintenanceMode: boolean): Promise<MonitorStateSnapshot> =>
    ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_MAINTENANCE_MODE, maintenanceMode),

  updateConfig: (nextConfig: AppConfig): Promise<MonitorStateSnapshot> =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CONFIG, nextConfig),

  syncNtpNow: (): Promise<{ record: NtpSyncRecord; snapshot: MonitorStateSnapshot }> =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_NTP_NOW),

  runCleanupNow: (): Promise<MonitorStateSnapshot> =>
    ipcRenderer.invoke(IPC_CHANNELS.RUN_CLEANUP_NOW),

  queryEventHistory: (filter: HistoryQueryFilter): Promise<ProcessEventRecord[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.QUERY_EVENT_HISTORY, filter),

  queryNtpHistory: (limit?: number): Promise<NtpSyncRecord[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.QUERY_NTP_HISTORY, limit),

  queryDailyStats: (days?: number): Promise<DailyProcessStat[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.QUERY_DAILY_STATS, days),

  exportCsvReport: (): Promise<{ ok: boolean; filePath?: string; message: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_CSV_REPORT),

  exportPdfReport: (): Promise<{ ok: boolean; filePath?: string; message: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_PDF_REPORT),

  openPathFolder: (targetKind: 'LOGS' | 'DATA' | 'CONFIG' | string): Promise<boolean> =>
    ipcRenderer.invoke(IPC_CHANNELS.OPEN_PATH_FOLDER, targetKind)
}

contextBridge.exposeInMainWorld('processMonitorApi', processMonitorApi)
