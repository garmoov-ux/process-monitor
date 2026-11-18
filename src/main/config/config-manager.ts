import fs from 'fs'
import path from 'path'
import { AppConfig, ProcessTargetConfig, RebootScheduleConfig } from '@shared/types/domain'
import { resolveAppPaths } from './app-paths'

export function createDefaultRebootConfig(): RebootScheduleConfig {
  return {
    enabled: false,
    ruleMode: 'DAYS_OF_WEEK',
    months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    daysOfMonth: [1, 15],
    hour: 4,
    minute: 0,
    catchUpOnMissed: true,
    graceCancelSec: 30,
    lastExecutedDate: null
  }
}

export function createDefaultConfig(): AppConfig {
  const defaultInterval = Number(process.env.PROCESS_MONITOR_CHECK_INTERVAL_MS || 2000)
  const defaultNtpMin = Number(process.env.PROCESS_MONITOR_NTP_INTERVAL_MIN || 60)
  const envServers = (process.env.PROCESS_MONITOR_NTP_SERVERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return {
    system: {
      runOnBoot: false,
      minimizeToTray: true,
      startMinimized: false,
      checkIntervalMs: Number.isFinite(defaultInterval) && defaultInterval >= 500 ? defaultInterval : 2000,
      logRetentionDays: 30,
      maintenanceMode: false
    },
    ntp: {
      enabled: true,
      syncIntervalMin: Number.isFinite(defaultNtpMin) && defaultNtpMin >= 1 ? defaultNtpMin : 60,
      syncIntervalSec: 60,
      timeoutMs: 2000,
      maxOffsetLimitSec: 3600,
      servers: [
        envServers[0] || 'time.bora.net',
        envServers[1] || 'time.kriss.re.kr',
        envServers[2] || 'pool.ntp.org'
      ],
      ports: [123, 123, 123]
    },
    reboot: createDefaultRebootConfig(),
    targets: []
  }
}

export function normalizeTargetConfig(raw: Partial<ProcessTargetConfig>, index: number): ProcessTargetConfig {
  const execPath = (raw.execPath || '').trim()
  const fallbackProcName = execPath ? path.win32.basename(execPath) : `Target_${index + 1}.exe`
  return {
    id: raw.id || `proc_${Date.now()}_${index}`,
    name: (raw.name || fallbackProcName).trim(),
    processName: (raw.processName || fallbackProcName).trim(),
    watchProcessName: raw.watchProcessName ? raw.watchProcessName.trim() : undefined,
    windowTitle: (raw.windowTitle || '').trim(),
    execPath,
    args: (raw.args || '').trim(),
    workDir: (raw.workDir || (execPath ? path.win32.dirname(execPath) : '')).trim(),
    windowStyle: raw.windowStyle === 'minimized' || raw.windowStyle === 'hidden' ? raw.windowStyle : 'normal',
    enabled: raw.enabled !== undefined ? Boolean(raw.enabled) : true,
    restartDelaySec: Math.max(1, Number(raw.restartDelaySec ?? 5)),
    startupGraceSec: Math.max(1, Number(raw.startupGraceSec ?? 15)),
    gracefulTimeoutSec: Math.max(1, Number(raw.gracefulTimeoutSec ?? 5)),
    checkNotResponding: raw.checkNotResponding !== undefined ? Boolean(raw.checkNotResponding) : true,
    hungThresholdCount: Math.max(1, Number(raw.hungThresholdCount ?? 3)),
    maxRetriesInWindow: Math.max(1, Number(raw.maxRetriesInWindow ?? 5)),
    retryWindowSec: Math.max(10, Number(raw.retryWindowSec ?? 180)),
    periodicRestartEnabled: Boolean(raw.periodicRestartEnabled),
    periodicRestartIntervalSec: Math.max(5, Math.round(Number(raw.periodicRestartIntervalSec ?? 3600) || 3600))
  }
}

function normalizePort(val: unknown, fallback = 123): number {
  const n = Number(val)
  if (Number.isInteger(n) && n >= 1 && n <= 65535) return n
  return fallback
}

function normalizeIntArray(raw: unknown, min: number, max: number, fallback: number[]): number[] {
  if (!Array.isArray(raw)) return fallback
  const filtered = Array.from(
    new Set(
      raw
        .map((v) => Number(v))
        .filter((n) => Number.isInteger(n) && n >= min && n <= max)
    )
  ).sort((a, b) => a - b)
  return filtered
}

export function normalizeRebootConfig(raw?: Partial<RebootScheduleConfig> | null): RebootScheduleConfig {
  const def = createDefaultRebootConfig()
  if (!raw || typeof raw !== 'object') return def

  return {
    enabled: Boolean(raw.enabled ?? def.enabled),
    ruleMode: raw.ruleMode === 'DAYS_OF_MONTH' ? 'DAYS_OF_MONTH' : 'DAYS_OF_WEEK',
    months: normalizeIntArray(raw.months, 1, 12, def.months),
    daysOfWeek: normalizeIntArray(raw.daysOfWeek, 0, 6, def.daysOfWeek),
    daysOfMonth: normalizeIntArray(raw.daysOfMonth, 1, 31, def.daysOfMonth),
    hour: Math.min(23, Math.max(0, Math.floor(Number(raw.hour ?? def.hour) || 0))),
    minute: Math.min(59, Math.max(0, Math.floor(Number(raw.minute ?? def.minute) || 0))),
    catchUpOnMissed: raw.catchUpOnMissed !== undefined ? Boolean(raw.catchUpOnMissed) : def.catchUpOnMissed,
    graceCancelSec: Math.min(300, Math.max(5, Math.floor(Number(raw.graceCancelSec ?? def.graceCancelSec) || 30))),
    lastExecutedDate: typeof raw.lastExecutedDate === 'string' && raw.lastExecutedDate.trim()
      ? raw.lastExecutedDate.trim()
      : null
  }
}

export function normalizeAppConfig(raw: Partial<AppConfig> | null | undefined): AppConfig {
  const defaults = createDefaultConfig()
  if (!raw || typeof raw !== 'object') {
    return defaults
  }

  const rawServers = Array.isArray(raw.ntp?.servers) ? raw.ntp!.servers : []
  const servers: [string, string, string] = [
    String(rawServers[0] ?? defaults.ntp.servers[0]).trim() || defaults.ntp.servers[0],
    String(rawServers[1] ?? defaults.ntp.servers[1]).trim() || defaults.ntp.servers[1],
    String(rawServers[2] ?? defaults.ntp.servers[2]).trim() || defaults.ntp.servers[2]
  ]

  const rawPorts = Array.isArray(raw.ntp?.ports) ? raw.ntp!.ports : []
  const ports: [number, number, number] = [
    normalizePort(rawPorts[0], 123),
    normalizePort(rawPorts[1], 123),
    normalizePort(rawPorts[2], 123)
  ]

  const targets = Array.isArray(raw.targets)
    ? raw.targets.map((item, idx) => normalizeTargetConfig(item, idx))
    : []

  const syncIntervalMin = Math.max(1, Number(raw.ntp?.syncIntervalMin ?? defaults.ntp.syncIntervalMin))
  const rawSyncSec = raw.ntp?.syncIntervalSec
  const syncIntervalSec =
    rawSyncSec !== undefined && Number.isFinite(Number(rawSyncSec)) && Number(rawSyncSec) >= 1
      ? Math.max(1, Math.round(Number(rawSyncSec)))
      : syncIntervalMin * 60

  return {
    system: {
      runOnBoot: Boolean(raw.system?.runOnBoot ?? defaults.system.runOnBoot),
      minimizeToTray: Boolean(raw.system?.minimizeToTray ?? defaults.system.minimizeToTray),
      startMinimized: Boolean(raw.system?.startMinimized ?? defaults.system.startMinimized),
      checkIntervalMs: Math.max(500, Number(raw.system?.checkIntervalMs ?? defaults.system.checkIntervalMs)),
      logRetentionDays: Math.max(1, Number(raw.system?.logRetentionDays ?? defaults.system.logRetentionDays)),
      maintenanceMode: Boolean(raw.system?.maintenanceMode ?? defaults.system.maintenanceMode)
    },
    ntp: {
      enabled: Boolean(raw.ntp?.enabled ?? defaults.ntp.enabled),
      syncIntervalMin,
      syncIntervalSec,
      timeoutMs: Math.max(500, Number(raw.ntp?.timeoutMs ?? defaults.ntp.timeoutMs)),
      maxOffsetLimitSec: Math.max(60, Number(raw.ntp?.maxOffsetLimitSec ?? defaults.ntp.maxOffsetLimitSec)),
      servers,
      ports
    },
    reboot: normalizeRebootConfig(raw.reboot),
    targets
  }
}

export function saveConfigAtomically(config: AppConfig, customPath?: string): AppConfig {
  const targetPath = customPath || resolveAppPaths().configPath
  const normalized = normalizeAppConfig(config)
  const dir = path.dirname(targetPath)
  fs.mkdirSync(dir, { recursive: true })

  const tempPath = `${targetPath}.tmp`
  const payload = JSON.stringify(normalized, null, 2)

  try {
    const fd = fs.openSync(tempPath, 'w')
    try {
      fs.writeFileSync(fd, payload, 'utf-8')
      fs.fsyncSync(fd)
    } finally {
      fs.closeSync(fd)
    }
    fs.renameSync(tempPath, targetPath)
  } catch {
    try {
      fs.writeFileSync(targetPath, payload, 'utf-8')
    } catch {
      // ignore write lock error
    }
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
    } catch {
      // ignore tmp unlink error
    }
  }

  return normalized
}

export function loadConfig(customPath?: string): AppConfig {
  const targetPath = customPath || resolveAppPaths().configPath
  if (!fs.existsSync(targetPath)) {
    const defaults = createDefaultConfig()
    return saveConfigAtomically(defaults, targetPath)
  }

  try {
    const rawText = fs.readFileSync(targetPath, 'utf-8')
    const parsed = JSON.parse(rawText) as Partial<AppConfig>
    const normalized = normalizeAppConfig(parsed)
    return normalized
  } catch {
    const defaults = createDefaultConfig()
    return saveConfigAtomically(defaults, targetPath)
  }
}
