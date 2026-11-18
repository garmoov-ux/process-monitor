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

function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    return code === 'EPERM'
  }
}

function spawnElevatedFallback(
  resolvedExe: string,
  args: string[],
  cwd: string,
  windowStyle: ProcessTargetConfig['windowStyle']
): Promise<{ ok: boolean; pid: number | null; error?: string }> {
  return new Promise((resolve) => {
    const escapedExe = resolvedExe.replace(/'/g, "''")
    const escapedCwd = cwd.replace(/'/g, "''")
    const escapedArgs = args.map((a) => `'${a.replace(/'/g, "''")}'`).join(', ')
    const styleMap =
      windowStyle === 'hidden'
        ? 'Hidden'
        : windowStyle === 'minimized'
          ? 'Minimized'
          : 'Normal'
    const argClause = args.length > 0 ? `-ArgumentList @(${escapedArgs})` : ''
    const psCmd = `$p = Start-Process -FilePath '${escapedExe}' -WorkingDirectory '${escapedCwd}' ${argClause} -WindowStyle ${styleMap} -Verb RunAs -PassThru; if ($p) { Write-Output $p.Id }`

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCmd],
      { timeout: 10000, windowsHide: true },
      (err, stdout) => {
        if (err) {
          resolve({ ok: false, pid: null, error: `권한 상승 실행 실패: ${err.message}` })
          return
        }
        const parsedPid = Number(String(stdout || '').trim())
        resolve({
          ok: true,
          pid: Number.isInteger(parsedPid) && parsedPid > 0 ? parsedPid : null
        })
      }
    )
  })
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
    let settled = false
    const finish = (res: { ok: boolean; pid: number | null; error?: string }): void => {
      if (settled) return
      settled = true
      resolve(res)
    }

    try {
      const child = spawn(resolvedExe, args, {
        cwd,
        detached: true,
        stdio: 'ignore',
        windowsHide: target.windowStyle === 'hidden'
      })

      child.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EACCES' || err.message.includes('740')) {
          void spawnElevatedFallback(resolvedExe, args, cwd, target.windowStyle).then(finish)
          return
        }
        finish({ ok: false, pid: null, error: err.message })
      })

      child.once('spawn', () => {
        child.unref()
        finish({ ok: true, pid: child.pid ?? null })
      })
    } catch (err) {
      const e = err as NodeJS.ErrnoException
      if (e.code === 'EACCES' || String(e.message).includes('740')) {
        void spawnElevatedFallback(resolvedExe, args, cwd, target.windowStyle).then(finish)
        return
      }
      finish({ ok: false, pid: null, error: e.message })
    }
  })
}

export async function requestGracefulStop(pid: number): Promise<boolean> {
  if (!Number.isInteger(pid) || pid <= 0) return false

  const ok = await new Promise<boolean>((resolve) => {
    execFile(
      'taskkill.exe',
      ['/PID', String(pid)],
      { timeout: 4000, windowsHide: true },
      (err) => {
        resolve(!err)
      }
    )
  })
  if (ok) return true

  // 관리자 권한으로 실행 중인 프로세스인 경우 권한 상승 taskkill로 정상 종료 유도
  return new Promise<boolean>((resolve) => {
    const psCmd = `Start-Process -FilePath 'taskkill.exe' -ArgumentList @('/PID', '${pid}') -Verb RunAs -WindowStyle Hidden -Wait`
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCmd],
      { timeout: 6000, windowsHide: true },
      (err) => resolve(!err)
    )
  })
}

export async function forceKillProcessTree(pid: number, processName?: string): Promise<boolean> {
  if (!Number.isInteger(pid) || pid <= 0) return false

  const killedByTaskkill = await new Promise<boolean>((resolve) => {
    execFile(
      'taskkill.exe',
      ['/F', '/T', '/PID', String(pid)],
      { timeout: 5000, windowsHide: true },
      (err) => {
        resolve(!err)
      }
    )
  })

  const safeImageName = (processName || '').trim()
  const imgName =
    safeImageName && /^[a-zA-Z0-9._ -]+$/.test(safeImageName)
      ? safeImageName.toLowerCase().endsWith('.exe')
        ? safeImageName
        : `${safeImageName}.exe`
      : ''

  if (imgName) {
    await new Promise<void>((resolve) => {
      execFile(
        'taskkill.exe',
        ['/F', '/T', '/IM', imgName],
        { timeout: 5000, windowsHide: true },
        () => resolve()
      )
    })
  }

  await delayMs(900)

  if (!isPidAlive(pid)) {
    return true
  }

  // 일반 taskkill로 종료되지 않은 경우(SControlServer.exe 등 관리자 권한 프로세스) 권한 상승(-Verb RunAs)으로 강제 종료 수행
  const elevatedKillArgs = imgName
    ? `'/F', '/T', '/PID', '${pid}'`
    : `'/F', '/T', '/PID', '${pid}'`
  const psElevatedCmd = imgName
    ? `Start-Process -FilePath 'taskkill.exe' -ArgumentList @(${elevatedKillArgs}) -Verb RunAs -WindowStyle Hidden -Wait; Start-Process -FilePath 'taskkill.exe' -ArgumentList @('/F', '/T', '/IM', '${imgName}') -Verb RunAs -WindowStyle Hidden -Wait`
    : `Start-Process -FilePath 'taskkill.exe' -ArgumentList @(${elevatedKillArgs}) -Verb RunAs -WindowStyle Hidden -Wait`

  const killedByElevated = await new Promise<boolean>((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psElevatedCmd],
      { timeout: 8000, windowsHide: true },
      (err) => {
        resolve(!err)
      }
    )
  })

  await delayMs(900)

  return killedByTaskkill || killedByElevated || !isPidAlive(pid)
}
