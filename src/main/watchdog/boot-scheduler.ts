import { execFile } from 'child_process'
import { app } from 'electron'
import { writeSystemLog } from './file-logger'

const TASK_NAME = 'ProcessMonitorAutoBoot'

export async function isBootTaskRegistered(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(
      'schtasks.exe',
      ['/Query', '/TN', TASK_NAME],
      { timeout: 4000, windowsHide: true },
      (err) => {
        resolve(!err)
      }
    )
  })
}

export async function syncBootSchedulerTask(enable: boolean): Promise<{ ok: boolean; message: string }> {
  if (!enable) {
    return new Promise((resolve) => {
      execFile(
        'schtasks.exe',
        ['/Delete', '/TN', TASK_NAME, '/F'],
        { timeout: 5000, windowsHide: true },
        () => {
          writeSystemLog('INFO', 'Windows 작업 스케줄러 부팅 자동 실행 해제 완료')
          resolve({ ok: true, message: '부팅 시 자동 실행이 해제되었습니다.' })
        }
      )
    })
  }

  let exePath = process.execPath
  try {
    if (app && app.isPackaged) {
      exePath = process.env.PORTABLE_EXECUTABLE_FILE || app.getPath('exe')
    }
  } catch {
    exePath = process.execPath
  }

  const quotedPath = `"${exePath}"`
  return new Promise((resolve) => {
    execFile(
      'schtasks.exe',
      ['/Create', '/TN', TASK_NAME, '/TR', quotedPath, '/SC', 'ONLOGON', '/RL', 'HIGHEST', '/F'],
      { timeout: 6000, windowsHide: true },
      (err) => {
        if (err) {
          writeSystemLog('WARN', `작업 스케줄러 등록 실패 (관리자 권한 확인 필요): ${err.message}`)
          resolve({
            ok: false,
            message: '작업 스케줄러 등록에 실패했습니다. 관리자 권한으로 실행 중인지 확인해 주세요.'
          })
          return
        }
        writeSystemLog('INFO', `Windows 작업 스케줄러 등록 완료 (${exePath})`)
        resolve({ ok: true, message: 'Windows 부팅 시 관리자 권한 자동 실행이 등록되었습니다.' })
      }
    )
  })
}
