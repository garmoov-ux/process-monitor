import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'path'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import {
  AppConfig,
  HistoryQueryFilter,
  ProcessTargetConfig
} from '@shared/types/domain'
import { resolveAppPaths } from '../config/app-paths'
import { normalizeTargetConfig } from '../config/config-manager'
import { ProcessRepository } from '../db/process-repo'
import { NtpRepository } from '../db/ntp-repo'
import { NtpScheduler } from '../ntp/ntp-scheduler'
import { scanRunningProcesses } from '../watchdog/process-scanner'
import { WatchdogScheduler } from '../watchdog/watchdog-scheduler'
import { exportCsvReport, exportPdfReport } from '../report/pdf-report-generator'

export function registerIpcHandlers(params: {
  getMainWindow: () => BrowserWindow | null
  watchdog: WatchdogScheduler
  ntpScheduler: NtpScheduler
  processRepo: ProcessRepository
  ntpRepo: NtpRepository
  refreshTrayMenu: () => void
}): void {
  const { getMainWindow, watchdog, ntpScheduler, processRepo, ntpRepo, refreshTrayMenu } = params

  ipcMain.handle(IPC_CHANNELS.GET_INITIAL_STATE, () => {
    return watchdog.getSnapshot()
  })

  ipcMain.handle(IPC_CHANNELS.SCAN_RUNNING_PROCESSES, async () => {
    const list = await scanRunningProcesses(false)
    return list.sort((a, b) => {
      const aHasWin = a.windowTitle ? 1 : 0
      const bHasWin = b.windowTitle ? 1 : 0
      if (aHasWin !== bHasWin) return bHasWin - aHasWin
      return a.processName.localeCompare(b.processName)
    })
  })

  ipcMain.handle(IPC_CHANNELS.PICK_EXECUTABLE_FILE, async () => {
    const win = getMainWindow()
    const res = win
      ? await dialog.showOpenDialog(win, {
          title: '감시 대상 실행 파일 선택',
          properties: ['openFile'],
          filters: [
            { name: '실행 프로그램 (*.exe; *.bat; *.cmd)', extensions: ['exe', 'bat', 'cmd'] },
            { name: '모든 파일 (*.*)', extensions: ['*'] }
          ]
        })
      : await dialog.showOpenDialog({
          title: '감시 대상 실행 파일 선택',
          properties: ['openFile'],
          filters: [{ name: '실행 프로그램 (*.exe)', extensions: ['exe'] }]
        })

    if (res.canceled || res.filePaths.length === 0) return null
    const filePath = res.filePaths[0]
    return {
      execPath: filePath,
      processName: path.win32.basename(filePath),
      workDir: path.win32.dirname(filePath)
    }
  })

  ipcMain.handle(IPC_CHANNELS.PICK_DIRECTORY, async () => {
    const win = getMainWindow()
    const res = win
      ? await dialog.showOpenDialog(win, {
          title: '작업 폴더 선택',
          properties: ['openDirectory']
        })
      : await dialog.showOpenDialog({
          title: '작업 폴더 선택',
          properties: ['openDirectory']
        })

    if (res.canceled || res.filePaths.length === 0) return null
    return res.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.UPSERT_TARGET, async (_e, rawTarget: Partial<ProcessTargetConfig>) => {
    const normalized = normalizeTargetConfig(rawTarget, watchdog.getConfig().targets.length)
    const snap = await watchdog.upsertTarget(normalized)
    refreshTrayMenu()
    return snap
  })

  ipcMain.handle(IPC_CHANNELS.DELETE_TARGET, async (_e, targetId: string) => {
    const snap = await watchdog.deleteTarget(String(targetId))
    refreshTrayMenu()
    return snap
  })

  ipcMain.handle(
    IPC_CHANNELS.TOGGLE_TARGET_ENABLED,
    async (_e, payload: { targetId: string; enabled: boolean }) => {
      const snap = await watchdog.toggleTargetEnabled(String(payload.targetId), Boolean(payload.enabled))
      refreshTrayMenu()
      return snap
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.CONTROL_TARGET,
    async (_e, payload: { targetId: string; command: 'START' | 'STOP' | 'RESTART' }) => {
      return watchdog.controlTarget(String(payload.targetId), payload.command)
    }
  )

  ipcMain.handle(IPC_CHANNELS.RESET_CIRCUIT_BREAKER, async (_e, targetId: string) => {
    return watchdog.resetCircuitBreaker(String(targetId))
  })

  ipcMain.handle(IPC_CHANNELS.TOGGLE_MAINTENANCE_MODE, async (_e, maintenanceMode: boolean) => {
    const snap = await watchdog.toggleMaintenanceMode(Boolean(maintenanceMode))
    refreshTrayMenu()
    return snap
  })

  ipcMain.handle(IPC_CHANNELS.UPDATE_CONFIG, async (_e, nextConfig: AppConfig) => {
    const snap = await watchdog.updateConfig(nextConfig)
    refreshTrayMenu()
    return snap
  })

  ipcMain.handle(IPC_CHANNELS.SYNC_NTP_NOW, async () => {
    const record = await ntpScheduler.syncNow(true)
    return {
      record,
      snapshot: watchdog.getSnapshot()
    }
  })

  ipcMain.handle(IPC_CHANNELS.RUN_CLEANUP_NOW, () => {
    return watchdog.runCleanupNow()
  })

  ipcMain.handle(IPC_CHANNELS.CANCEL_SCHEDULED_REBOOT, () => {
    return watchdog.cancelScheduledReboot()
  })

  ipcMain.handle(IPC_CHANNELS.QUERY_EVENT_HISTORY, (_e, filter: HistoryQueryFilter) => {
    return processRepo.queryEvents(filter)
  })

  ipcMain.handle(IPC_CHANNELS.QUERY_NTP_HISTORY, (_e, limit?: number) => {
    return ntpRepo.getRecentHistory(limit ?? 50)
  })

  ipcMain.handle(IPC_CHANNELS.QUERY_DAILY_STATS, (_e, days?: number) => {
    return processRepo.queryDailyStats(days ?? 30)
  })

  ipcMain.handle(IPC_CHANNELS.EXPORT_CSV_REPORT, async () => {
    return exportCsvReport(getMainWindow(), watchdog.getSnapshot())
  })

  ipcMain.handle(IPC_CHANNELS.EXPORT_PDF_REPORT, async () => {
    return exportPdfReport(getMainWindow(), watchdog.getSnapshot())
  })

  ipcMain.handle(IPC_CHANNELS.OPEN_PATH_FOLDER, async (_e, targetKind: 'LOGS' | 'DATA' | 'CONFIG' | string) => {
    const paths = resolveAppPaths()
    if (targetKind === 'LOGS') {
      await shell.openPath(paths.logDir)
      return true
    }
    if (targetKind === 'DATA') {
      await shell.openPath(path.dirname(paths.dbPath))
      return true
    }
    if (targetKind === 'CONFIG') {
      shell.showItemInFolder(paths.configPath)
      return true
    }
    if (targetKind) {
      shell.showItemInFolder(path.win32.resolve(targetKind))
      return true
    }
    return false
  })
}
