import { app, BrowserWindow } from 'electron'
import path from 'path'
import { loadConfig } from './config/config-manager'
import { closeDatabase, getDatabase } from './db/connection'
import { ProcessRepository } from './db/process-repo'
import { NtpRepository } from './db/ntp-repo'
import { NtpScheduler } from './ntp/ntp-scheduler'
import { WatchdogScheduler } from './watchdog/watchdog-scheduler'
import { writeSystemLog } from './watchdog/file-logger'
import { registerIpcHandlers } from './ipc/handlers'
import { setupSystemTray } from './tray'

let mainWindow: BrowserWindow | null = null
let isQuitting = false

const gotSingleInstanceLock = app.requestSingleInstanceLock()

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

    // atoj(1040x680), systemcheck(1180x720)보다 더 콤팩트하고 미니멀한 960x620 다크 관제 창
    mainWindow = new BrowserWindow({
      width: 960,
      height: 620,
      minWidth: 880,
      minHeight: 560,
      useContentSize: true,
      show: !config.system.startMinimized,
      autoHideMenuBar: true,
      backgroundColor: '#0b0f19',
      title: 'ProcessMonitor - 프로세스 자동 복구 및 시간 동기화',
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

    writeSystemLog('INFO', 'ProcessMonitor 시스템이 시작되었습니다.')
    await watchdog.start()
    ntpScheduler.start()

    app.on('before-quit', () => {
      isQuitting = true
      watchdog.stop()
      ntpScheduler.stop()
      trayControl.destroyTray()
      writeSystemLog('INFO', 'ProcessMonitor 시스템이 정상 종료되었습니다.')
      closeDatabase()
    })
  })
}
