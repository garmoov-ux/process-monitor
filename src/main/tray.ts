import { Menu, Tray, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'
import { WatchdogScheduler } from './watchdog/watchdog-scheduler'
import { NtpScheduler } from './ntp/ntp-scheduler'

let trayInstance: Tray | null = null

function resolveTrayIconPath(): string {
  const candidates = [
    path.join(process.resourcesPath || '', 'icon.ico'),
    path.resolve(process.cwd(), 'resources', 'icon.ico'),
    path.resolve(__dirname, '../../resources/icon.ico')
  ]
  for (const p of candidates) {
    if (fs.existsSync(p)) return p
  }
  return candidates[1]
}

export function setupSystemTray(params: {
  watchdog: WatchdogScheduler
  ntpScheduler: NtpScheduler
  onShowWindow: () => void
  onQuitApp: () => void
}): { refreshMenu: () => void; destroyTray: () => void } {
  const { watchdog, ntpScheduler, onShowWindow, onQuitApp } = params
  const iconPath = resolveTrayIconPath()
  const image = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty()

  trayInstance = new Tray(image)
  trayInstance.setToolTip('ProcessMonitor - 다중 프로세스 감시 및 시간 동기화')

  const refreshMenu = (): void => {
    if (!trayInstance) return
    const snap = watchdog.getSnapshot()
    const isMaint = snap.summary.maintenanceMode

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `ProcessMonitor (${isMaint ? '전체 점검 모드' : `정상 ${snap.summary.runningCount}/${snap.summary.totalTargets}`})`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: '관제 대시보드 열기',
        click: () => onShowWindow()
      },
      {
        label: isMaint ? '전체 점검 모드 해제 (감시 재개)' : '전체 점검 모드 전환 (감시 일시정지)',
        click: async () => {
          await watchdog.toggleMaintenanceMode(!isMaint)
          refreshMenu()
        }
      },
      {
        label: '지금 즉시 시간 동기화 실행',
        click: async () => {
          await ntpScheduler.syncNow(true)
        }
      },
      { type: 'separator' },
      {
        label: '프로그램 완전 종료',
        click: () => onQuitApp()
      }
    ])

    trayInstance.setContextMenu(contextMenu)
  }

  trayInstance.on('double-click', () => {
    onShowWindow()
  })

  refreshMenu()

  return {
    refreshMenu,
    destroyTray: () => {
      if (trayInstance) {
        trayInstance.destroy()
        trayInstance = null
      }
    }
  }
}
