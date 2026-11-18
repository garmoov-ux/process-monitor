export type ProcessTargetState =
  | 'RUNNING'
  | 'STARTUP_GRACE'
  | 'RESTART_PENDING'
  | 'HUNG_DETECTED'
  | 'STOPPING'
  | 'CIRCUIT_OPEN'
  | 'PAUSED'
  | 'INVALID_PATH'

export type WindowStyleOption = 'normal' | 'minimized' | 'hidden'

export interface ProcessTargetConfig {
  id: string
  name: string
  processName: string
  watchProcessName?: string
  windowTitle: string
  execPath: string
  args: string
  workDir: string
  windowStyle: WindowStyleOption
  enabled: boolean
  restartDelaySec: number
  startupGraceSec: number
  gracefulTimeoutSec: number
  checkNotResponding: boolean
  hungThresholdCount: number
  maxRetriesInWindow: number
  retryWindowSec: number
  periodicRestartEnabled?: boolean
  periodicRestartIntervalSec?: number
}

export interface SystemConfig {
  runOnBoot: boolean
  minimizeToTray: boolean
  startMinimized: boolean
  checkIntervalMs: number
  logRetentionDays: number
  maintenanceMode: boolean
}

export interface NtpConfig {
  enabled: boolean
  syncIntervalMin: number
  syncIntervalSec?: number
  timeoutMs: number
  maxOffsetLimitSec: number
  servers: [string, string, string]
  ports: [number, number, number]
}

export type RebootScheduleRuleMode = 'DAYS_OF_WEEK' | 'DAYS_OF_MONTH'

export interface RebootScheduleConfig {
  enabled: boolean
  ruleMode: RebootScheduleRuleMode
  months: number[]
  daysOfWeek: number[]
  daysOfMonth: number[]
  hour: number
  minute: number
  catchUpOnMissed: boolean
  graceCancelSec: number
  lastExecutedDate: string | null
}

export interface RebootCountdownState {
  active: boolean
  remainingSec: number
  scheduledLabel: string
  reason: string
}

export interface AppConfig {
  system: SystemConfig
  ntp: NtpConfig
  reboot: RebootScheduleConfig
  targets: ProcessTargetConfig[]
}

export interface RunningProcessSnapshot {
  pid: number
  processName: string
  execPath: string
  windowTitle: string
  responding: boolean
  memoryKb: number
}

export interface ProcessRuntimeStatus {
  target: ProcessTargetConfig
  state: ProcessTargetState
  pid: number | null
  detectedWindowTitle: string
  responding: boolean
  memoryKb: number
  uptimeSec: number
  countdownSec: number
  periodicRemainingSec?: number | null
  consecutiveHungCount: number
  recentRetryCount: number
  totalRestartCount: number
  lastStartedAt: string | null
  lastFailureAt: string | null
  lastMessage: string
}

export type ProcessEventType =
  | 'START'
  | 'STOP'
  | 'FORCE_KILL'
  | 'CRASH'
  | 'HUNG_DETECTED'
  | 'RESTART'
  | 'CIRCUIT_OPEN'
  | 'CIRCUIT_RESET'
  | 'PATH_ERROR'
  | 'CONFIG_CHANGE'
  | 'SYSTEM'

export type EventSeverity = 'INFO' | 'WARN' | 'ERROR'

export interface ProcessEventRecord {
  id: number
  targetId: string
  targetName: string
  eventType: ProcessEventType
  severity: EventSeverity
  pid: number | null
  message: string
  createdAt: string
}

export interface NtpSyncRecord {
  id: number
  serverUsed: string
  offsetMs: number
  rttMs: number
  applied: boolean
  status: 'SUCCESS' | 'OFFSET_EXCEEDED' | 'FAILED'
  message: string
  syncedAt: string
}

export interface DailyProcessStat {
  statDate: string
  targetId: string
  targetName: string
  runningSamples: number
  totalSamples: number
  uptimePercent: number
  restartCount: number
  hungCount: number
}

export interface DashboardSummary {
  totalTargets: number
  runningCount: number
  graceOrPendingCount: number
  issueOrCircuitCount: number
  pausedCount: number
  maintenanceMode: boolean
  bootRegistered: boolean
  lastScanAt: string | null
  lastNtpSync: NtpSyncRecord | null
  ntpSuccessCount: number
  ntpFailCount: number
}

export interface StorageFolderItem {
  key: 'CONFIG' | 'DATA' | 'LOGS'
  label: string
  description: string
  resolvedPath: string
  fileCount: number
  totalBytes: number
}

export interface MonitorStateSnapshot {
  config: AppConfig
  summary: DashboardSummary
  processes: ProcessRuntimeStatus[]
  recentEvents: ProcessEventRecord[]
  recentNtpHistory: NtpSyncRecord[]
  dailyStats: DailyProcessStat[]
  storageInfo: StorageFolderItem[]
  rebootCountdown: RebootCountdownState
}

export interface HistoryQueryFilter {
  targetId?: string
  severity?: EventSeverity | 'ALL'
  search?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
}
