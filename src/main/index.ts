import { app, BrowserWindow } from 'electron'
import { execFile, execFileSync } from 'child_process'
import path from 'path'
import { loadConfig } from './config/config-manager'
import { closeDatabase, getDatabase } from './db/connection'
import { ProcessRepository } from './db/process-repo'
import { NtpRepository } from './db/ntp-repo'
import { NtpScheduler } from './ntp/ntp-scheduler'
import { WatchdogScheduler } from './watchdog/watchdog-scheduler'
import { writeSystemLog } from './watchdog/file-logger'
import { registerIpcHandlers } from './ipc/handlers'
import { createProcessMonitorAppIcon, setupSystemTray } from './tray'

function ensureWindowsAdminOnPackaged(): boolean {
  if (process.platform !== 'win32' || !app.isPackaged) return false
  if (process.argv.includes('--elevated')) return false

  try {
    execFileSync('net.exe', ['session'], { stdio: 'ignore', windowsHide: true })
    return false
  } catch {
    // 현재 일반 권한으로 실행 중이므로 관리자 권한(RunAs)으로 재실행 시도
    const targetExe = (process.env.PORTABLE_EXECUTABLE_FILE || process.execPath).replace(/'/g, "''")
    const workDir = (process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(targetExe)).replace(/'/g, "''")
    const psCmd = `Start-Process -FilePath '${targetExe}' -WorkingDirectory '${workDir}' -ArgumentList '--elevated' -Verb RunAs`
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCmd],
      { windowsHide: true },
      () => {
        app.quit()
      }
    )
    return true
  }
}

let mainWindow: BrowserWindow | null = null
let isQuitting = false

const RelaunchingAsAdmin = ensureWindowsAdminOnPackaged()
const gotSingleInstanceLock = RelaunchingAsAdmin ? false : app.requestSingleInstanceLock()

if (!gotSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) mainWindow.show()
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    const config = loadConfig()
    const db = getDatabase()
    const processRepo = new ProcessRepository(db)
    const ntpRepo = new NtpRepository(db)

    let watchdog: WatchdogScheduler

    const ntpScheduler = new NtpScheduler(config.ntp, ntpRepo, () => {
      watchdog?.broadcastStateIfVisible()
    })

    watchdog = new WatchdogScheduler(
      config,
      processRepo,
      ntpRepo,
      ntpScheduler,
      () => mainWindow
    )

    const appIcon = createProcessMonitorAppIcon(64)

    // atoj / systemcheck 와 동일하게 창 크기 고정 (resizable/maximizable/fullscreenable 비활성화)
    mainWindow = new BrowserWindow({
      width: 1040,
      height: 680,
      useContentSize: true,
      resizable: false,
      maximizable: false,
      fullscreenable: false,
      show: !config.system.startMinimized,
      autoHideMenuBar: true,
      backgroundColor: '#f1f5f9',
      icon: appIcon,
      title: 'Process Monitor - 다중 프로그램 자동 복구 및 시간 동기화',
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true
      }
    })

    const trayControl = setupSystemTray({
      watchdog,
      ntpScheduler,
      onShowWindow: () => {
        if (!mainWindow) return
        mainWindow.show()
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
        watchdog.broadcastStateIfVisible()
      },
      onQuitApp: () => {
        isQuitting = true
        app.quit()
      }
    })

    mainWindow.on('show', () => {
      watchdog.broadcastStateIfVisible()
    })

    mainWindow.on('restore', () => {
      watchdog.broadcastStateIfVisible()
    })

    mainWindow.on('close', (event) => {
      if (!isQuitting && watchdog.getConfig().system.minimizeToTray) {
        event.preventDefault()
        mainWindow?.hide()
      }
    })

    registerIpcHandlers({
      getMainWindow: () => mainWindow,
      watchdog,
      ntpScheduler,
      processRepo,
      ntpRepo,
      refreshTrayMenu: trayControl.refreshMenu
    })

    if (process.env.ELECTRON_RENDERER_URL) {
      await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    } else {
      await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    writeSystemLog('INFO', '프로세스 모니터 시스템이 시작되었습니다.')
    await watchdog.start()
    ntpScheduler.start()

    app.on('before-quit', () => {
      isQuitting = true
      watchdog.stop()
      ntpScheduler.stop()
      trayControl.destroyTray()
      writeSystemLog('INFO', '프로세스 모니터 시스템이 정상 종료되었습니다.')
      closeDatabase()
    })
  })
}
