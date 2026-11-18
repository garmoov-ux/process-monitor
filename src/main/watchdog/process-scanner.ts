import { execFile } from 'child_process'
import path from 'path'
import iconv from 'iconv-lite'
import { ProcessTargetConfig, RunningProcessSnapshot } from '@shared/types/domain'

function normalizeWinPath(p: string): string {
  if (!p) return ''
  return path.win32.normalize(p.trim()).toLowerCase()
}

function normalizeProcName(name: string): string {
  const trimmed = (name || '').trim().toLowerCase()
  if (!trimmed) return ''
  return trimmed.endsWith('.exe') ? trimmed : `${trimmed}.exe`
}

export function matchProcessTarget(
  target: ProcessTargetConfig,
  snapshots: RunningProcessSnapshot[]
): RunningProcessSnapshot | null {
  const targetPathNorm = normalizeWinPath(target.execPath)
  const targetProcNorm = normalizeProcName(target.watchProcessName || target.processName)

  const candidates = snapshots.filter((item) => {
    const snapPathNorm = normalizeWinPath(item.execPath)
    const snapProcNorm = normalizeProcName(item.processName)

    if (targetPathNorm && snapPathNorm && !target.watchProcessName) {
      if (snapPathNorm === targetPathNorm) return true
    }
    if (targetProcNorm && snapProcNorm === targetProcNorm) {
      if (!targetPathNorm || !snapPathNorm || target.watchProcessName) return true
      return snapPathNorm === targetPathNorm
    }
    return false
  })

  if (candidates.length === 0) return null

  const withWindow = candidates.find((c) => c.windowTitle && c.windowTitle.trim().length > 0)
  return withWindow || candidates[0]
}

export async function scanRunningProcesses(onlyWithWindow = false): Promise<RunningProcessSnapshot[]> {
  const psScript = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$procs = Get-Process | Select-Object Id, ProcessName, Path, MainWindowTitle, Responding, WorkingSet64
$procs | ConvertTo-Json -Compress
`.trim()

  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
      { encoding: 'buffer', timeout: 7000, maxBuffer: 10 * 1024 * 1024, windowsHide: true },
      (err, stdout) => {
        if (err || !stdout || stdout.length === 0) {
          resolve([])
          return
        }

        try {
          let text = stdout.toString('utf-8').trim()
          if (text.includes('\ufffd')) {
            text = iconv.decode(stdout, 'cp949').trim()
          }
          if (!text) {
            resolve([])
            return
          }

          const parsed = JSON.parse(text)
          const rawList = Array.isArray(parsed) ? parsed : [parsed]
          const results: RunningProcessSnapshot[] = []

          for (const item of rawList) {
            const pid = Number(item?.Id)
            if (!Number.isInteger(pid) || pid <= 0) continue

            const rawName = String(item?.ProcessName || '').trim()
            if (!rawName) continue

            const processName = rawName.toLowerCase().endsWith('.exe') ? rawName : `${rawName}.exe`
            const execPath = String(item?.Path || '').trim()
            const windowTitle = String(item?.MainWindowTitle || '').trim()
            const responding = item?.Responding !== false
            const memoryKb = Math.round(Number(item?.WorkingSet64 || 0) / 1024)

            if (onlyWithWindow && !windowTitle && !execPath) continue

            results.push({
              pid,
              processName,
              execPath,
              windowTitle,
              responding,
              memoryKb
            })
          }

          resolve(results)
        } catch {
          resolve([])
        }
      }
    )
  })
}
