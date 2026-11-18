import { Menu, Tray, nativeImage } from 'electron'
import { WatchdogScheduler } from './watchdog/watchdog-scheduler'
import { NtpScheduler } from './ntp/ntp-scheduler'

let trayInstance: Tray | null = null

// 13x9 심박 펄스 파형(Watchdog Pulse) 비트맵 (ProcessMonitor 전용)
const GLYPH_PULSE_WAVE = [
  '0000011000000',
  '0000011000000',
  '0000111100000',
  '0000100101100',
  '1111100101111',
  '0000000111000',
  '0000000110000',
  '0000000110000',
  '0000000000000'
]

function drawGlyph(
  buf: Buffer,
  size: number,
  glyph: string[],
  startX: number,
  startY: number,
  scale: number
): void {
  for (let row = 0; row < glyph.length; row++) {
    for (let col = 0; col < glyph[row].length; col++) {
      if (glyph[row][col] !== '1') continue
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const px = startX + col * scale + sx
          const py = startY + row * scale + sy
          if (px >= 0 && px < size && py >= 0 && py < size) {
            const idx = (py * size + px) * 4
            buf[idx] = 255 // B
            buf[idx + 1] = 255 // G
            buf[idx + 2] = 255 // R
            buf[idx + 3] = 255 // A
          }
        }
      }
    }
  }
}

function insideRoundedRect(x: number, y: number, size: number, pad: number, radius: number): boolean {
  const min = pad
  const max = size - 1 - pad
  if (x < min || x > max || y < min || y > max) return false

  const cx = x < min + radius ? min + radius : x > max - radius ? max - radius : x
  const cy = y < min + radius ? min + radius : y > max - radius ? max - radius : y
  return Math.hypot(x - cx, y - cy) <= radius
}

/**
 * 프로세스 모니터 전용 아이콘 생성
 * 인디고 블루(#4f46e5) 둥근 배지 + 흰색 심박 펄스 파형으로 AtoJ, SystemCheck와 즉시 구분
 */
export function createProcessMonitorAppIcon(size = 64): Electron.NativeImage {
  const buf = Buffer.alloc(size * size * 4)
  const pad = Math.max(1, Math.round(size * 0.06))
  const radius = Math.round(size * 0.22)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      if (insideRoundedRect(x, y, size, pad, radius)) {
        // BGRA: Indigo Blue #4f46e5 (R=79, G=70, B=229)
        buf[idx] = 229
        buf[idx + 1] = 70
        buf[idx + 2] = 79
        buf[idx + 3] = 255
      } else {
        buf[idx + 3] = 0
      }
    }
  }

  const scale = Math.max(1, Math.floor(size / 18))
  const totalWidth = 13 * scale
  const totalHeight = 9 * scale
  const startX = Math.floor((size - totalWidth) / 2)
  const startY = Math.floor((size - totalHeight) / 2)

  drawGlyph(buf, size, GLYPH_PULSE_WAVE, startX, startY, scale)

  return nativeImage.createFromBitmap(buf, { width: size, height: size })
}

export function setupSystemTray(params: {
  watchdog: WatchdogScheduler
  ntpScheduler: NtpScheduler
  onShowWindow: () => void
  onQuitApp: () => void
}): { refreshMenu: () => void; destroyTray: () => void } {
  const { watchdog, ntpScheduler, onShowWindow, onQuitApp } = params
  const icon = createProcessMonitorAppIcon(32)

  trayInstance = new Tray(icon)
  trayInstance.setToolTip('프로세스 모니터 - 다중 프로그램 자동 복구 및 시간 동기화')

  const refreshMenu = (): void => {
    if (!trayInstance) return
    const snap = watchdog.getSnapshot()
    const isMaint = snap.summary.maintenanceMode

    const contextMenu = Menu.buildFromTemplate([
      {
        label: `프로세스 모니터 (${isMaint ? '전체 점검 모드' : `정상 ${snap.summary.runningCount}/${snap.summary.totalTargets}`})`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: '관제 창 열기',
        click: () => onShowWindow()
      },
      {
        label: isMaint ? '상태: 전체 점검 모드 해제 (감시 재개)' : '상태: 전체 점검 모드 전환 (감시 일시정지)',
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

  trayInstance.on('click', () => {
    onShowWindow()
  })

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
