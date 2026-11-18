import { spawn, execFile } from 'child_process'
import fs from 'fs'
import path from 'path'
import { ProcessTargetConfig } from '@shared/types/domain'

export function parseCommandArgs(argsString: string): string[] {
  const result: string[] = []
  const regex = /[^\s"]+|"([^"]*)"/gi
  let match: RegExpExecArray | null = null
  while ((match = regex.exec(argsString)) !== null) {
    result.push(match[1] !== undefined ? match[1] : match[0])
  }
  return result
}

export function validateExecutablePath(execPath: string): { valid: boolean; reason?: string } {
  const trimmed = (execPath || '').trim()
  if (!trimmed) {
    return { valid: false, reason: '실행 파일 경로가 비어 있습니다.' }
  }
  const resolved = path.win32.resolve(trimmed)
  if (!fs.existsSync(resolved)) {
    return { valid: false, reason: `실행 파일이 존재하지 않습니다: ${resolved}` }
  }
  try {
    const stat = fs.statSync(resolved)
    if (!stat.isFile()) {
      return { valid: false, reason: '지정된 경로가 실행 파일이 아닙니다.' }
    }
    return { valid: true }
  } catch (err) {
    return { valid: false, reason: `파일 접근 권한 오류: ${(err as Error).message}` }
  }
}

export async function spawnTargetProcess(
  target: ProcessTargetConfig
): Promise<{ ok: boolean; pid: number | null; error?: string }> {
  const check = validateExecutablePath(target.execPath)
  if (!check.valid) {
    return { ok: false, pid: null, error: check.reason }
  }

  const resolvedExe = path.win32.resolve(target.execPath.trim())
  const cwd =
    target.workDir && fs.existsSync(target.workDir.trim())
      ? path.win32.resolve(target.workDir.trim())
      : path.win32.dirname(resolvedExe)
  const args = parseCommandArgs(target.args || '')

  return new Promise((resolve) => {
    try {
      const child = spawn(resolvedExe, args, {
        cwd,
        detached: true,
        stdio: 'ignore',
        windowsHide: target.windowStyle === 'hidden'
      })

      child.on('error', (err) => {
        resolve({ ok: false, pid: null, error: err.message })
      })

      child.unref()
      resolve({ ok: true, pid: child.pid ?? null })
    } catch (err) {
      resolve({ ok: false, pid: null, error: (err as Error).message })
    }
  })
}

export async function requestGracefulStop(pid: number): Promise<boolean> {
  if (!Number.isInteger(pid) || pid <= 0) return false

  return new Promise((resolve) => {
    execFile(
      'taskkill.exe',
      ['/PID', String(pid)],
      { timeout: 4000, windowsHide: true },
      (err) => {
        resolve(!err)
      }
    )
  })
}

export async function forceKillProcessTree(pid: number): Promise<boolean> {
  if (!Number.isInteger(pid) || pid <= 0) return false

  return new Promise((resolve) => {
    execFile(
      'taskkill.exe',
      ['/F', '/T', '/PID', String(pid)],
      { timeout: 5000, windowsHide: true },
      (err) => {
        resolve(!err)
      }
    )
  })
}
