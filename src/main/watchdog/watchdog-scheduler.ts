import { BrowserWindow } from 'electron'
import {
  AppConfig,
  DashboardSummary,
  MonitorStateSnapshot,
  ProcessRuntimeStatus,
  ProcessTargetConfig
} from '@shared/types/domain'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { saveConfigAtomically } from '../config/config-manager'
import { ProcessRepository } from '../db/process-repo'
import { NtpRepository } from '../db/ntp-repo'
import { NtpScheduler } from '../ntp/ntp-scheduler'
import { matchProcessTarget, scanRunningProcesses } from './process-scanner'
import { validateExecutablePath } from './process-controller'
import { ProcessStateMachine } from './state-machine'
import { isBootTaskRegistered, syncBootSchedulerTask } from './boot-scheduler'
import { writeSystemLog } from './file-logger'
import { collectStorageInfo, runRetentionCleanup } from './retention-cleaner'
import {
  executeManualTargetControl,
  executeTransitionAction,
  recordTargetEvent
} from './watchdog-actions'
import { RebootScheduler } from './reboot-scheduler'

export class WatchdogScheduler {
  private machines = new Map<string, ProcessStateMachine>()
  private scanTimer: NodeJS.Timeout | null = null
  private cleanupTimer: NodeJS.Timeout | null = null
  private scanning = false
  private lastScanAt: string | null = null
  private bootRegistered = false
  private sampleTickCounter = 0
  private rebootScheduler: RebootScheduler

  constructor(
    private config: AppConfig,
    private readonly processRepo: ProcessRepository,
    private readonly ntpRepo: NtpRepository,
    private readonly ntpScheduler: NtpScheduler,
    private readonly getMainWindow: () => BrowserWindow | null
  ) {
    this.rebootScheduler = new RebootScheduler(
      this.processRepo,
      (todayDateStr) => {
        this.config = saveConfigAtomically({
          ...this.config,
          reboot: { ...this.config.reboot, lastExecutedDate: todayDateStr }
        })
      },
      () => this.broadcastStateIfVisible()
    )
    this.syncMachinesFromConfig()
  }

  private syncMachinesFromConfig(): void {
    this.processRepo.syncTargets(this.config.targets)
    const activeIds = new Set(this.config.targets.map((t) => t.id))

    for (const existingId of this.machines.keys()) {
      if (!activeIds.has(existingId)) {
        this.machines.delete(existingId)
      }
    }

    for (const target of this.config.targets) {
      const existing = this.machines.get(target.id)
      if (existing) {
        existing.updateConfig(target)
      } else {
        const meta = this.processRepo.getTargetMeta(target.id)
        this.machines.set(target.id, new ProcessStateMachine(target, undefined, meta))
      }
    }
  }

  async start(): Promise<void> {
    this.stop()
    this.bootRegistered = await isBootTaskRegistered()
    runRetentionCleanup(this.config.system.logRetentionDays, this.processRepo, this.ntpRepo)

    await this.runScanTick()

    const intervalMs = Math.max(500, this.config.system.checkIntervalMs)
    this.scanTimer = setInterval(() => {
      void this.runScanTick()
    }, intervalMs)

    this.cleanupTimer = setInterval(
      () => {
        runRetentionCleanup(this.config.system.logRetentionDays, this.processRepo, this.ntpRepo)
      },
      6 * 60 * 60 * 1000
    )
  }

  stop(): void {
    if (this.scanTimer) {
      clearInterval(this.scanTimer)
      this.scanTimer = null
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.rebootScheduler.stop()
  }

  getConfig(): AppConfig {
    return this.config
  }

  runCleanupNow(): MonitorStateSnapshot {
    runRetentionCleanup(this.config.system.logRetentionDays, this.processRepo, this.ntpRepo)
    this.broadcastStateIfVisible()
    return this.getSnapshot()
  }

  cancelScheduledReboot(): MonitorStateSnapshot {
    this.rebootScheduler.cancelCountdown()
    return this.getSnapshot()
  }

  async runScanTick(): Promise<void> {
    if (this.scanning) return
    this.scanning = true

    try {
      const snapshots = await scanRunningProcesses(false)
      this.lastScanAt = new Date().toISOString()
      const statDate = this.lastScanAt.slice(0, 10)
      this.sampleTickCounter += 1
      const shouldRecordDailySample = this.sampleTickCounter % 5 === 1

      const sampleRows: Array<{
        targetId: string
        targetName: string
        isRunning: boolean
        restartedDelta: number
        hungDelta: number
      }> = []

      for (const target of this.config.targets) {
        const machine = this.machines.get(target.id)
        if (!machine) continue

        const prevState = machine.getRuntimeStatus().state
        const matched = matchProcessTarget(target, snapshots)
        const pathCheck = validateExecutablePath(target.execPath)

        const action = machine.evaluateTick(
          matched,
          this.config.system.maintenanceMode,
          pathCheck.valid || Boolean(matched),
          pathCheck.reason
        )

        const nextStatus = machine.getRuntimeStatus()
        let hungFromState = 0

        if (prevState !== nextStatus.state) {
          if (nextStatus.state === 'INVALID_PATH') {
            recordTargetEvent(this.processRepo, target, 'PATH_ERROR', 'ERROR', null, nextStatus.lastMessage)
          } else if (nextStatus.state === 'CIRCUIT_OPEN') {
            this.processRepo.recordFailure(target.id, new Date().toISOString())
            recordTargetEvent(this.processRepo, target, 'CIRCUIT_OPEN', 'ERROR', null, nextStatus.lastMessage)
          } else if (nextStatus.state === 'RESTART_PENDING' && prevState === 'RUNNING') {
            this.processRepo.recordFailure(target.id, new Date().toISOString())
            recordTargetEvent(this.processRepo, target, 'CRASH', 'WARN', null, nextStatus.lastMessage)
          } else if (nextStatus.state === 'HUNG_DETECTED') {
            hungFromState = 1
            recordTargetEvent(this.processRepo, target, 'HUNG_DETECTED', 'WARN', nextStatus.pid, nextStatus.lastMessage)
          }
        }

        const { restartedDelta, hungDelta } = await executeTransitionAction({
          target,
          machine,
          action,
          processRepo: this.processRepo
        })

        const totalHung = hungFromState + hungDelta
        if (shouldRecordDailySample || restartedDelta > 0 || totalHung > 0) {
          sampleRows.push({
            targetId: target.id,
            targetName: target.name,
            isRunning:
              nextStatus.state === 'RUNNING' ||
              nextStatus.state === 'STARTUP_GRACE' ||
              Boolean(matched),
            restartedDelta,
            hungDelta: totalHung
          })
        }
      }

      if (sampleRows.length > 0) {
        this.processRepo.recordSampleBatch(statDate, sampleRows)
      }

      this.rebootScheduler.checkTick(this.config.reboot, this.config.system.maintenanceMode)

      this.broadcastStateIfVisible()
    } finally {
      this.scanning = false
    }
  }

  async upsertTarget(target: ProcessTargetConfig): Promise<MonitorStateSnapshot> {
    const idx = this.config.targets.findIndex((t) => t.id === target.id)
    const nextTargets = [...this.config.targets]
    if (idx >= 0) nextTargets[idx] = target
    else nextTargets.push(target)

    this.config = saveConfigAtomically({ ...this.config, targets: nextTargets })
    this.syncMachinesFromConfig()
    recordTargetEvent(
      this.processRepo,
      target,
      'CONFIG_CHANGE',
      'INFO',
      null,
      idx >= 0 ? '감시 대상 설정이 수정되었습니다.' : '새 감시 대상이 등록되었습니다.'
    )
    await this.runScanTick()
    return this.getSnapshot()
  }

  async deleteTarget(targetId: string): Promise<MonitorStateSnapshot> {
    const found = this.config.targets.find((t) => t.id === targetId)
    const nextTargets = this.config.targets.filter((t) => t.id !== targetId)
    this.config = saveConfigAtomically({ ...this.config, targets: nextTargets })
    this.machines.delete(targetId)
    if (found) {
      recordTargetEvent(this.processRepo, found, 'CONFIG_CHANGE', 'INFO', null, '감시 대상이 삭제되었습니다.')
    }
    this.broadcastStateIfVisible()
    return this.getSnapshot()
  }

  async toggleTargetEnabled(targetId: string, enabled: boolean): Promise<MonitorStateSnapshot> {
    const nextTargets = this.config.targets.map((t) =>
      t.id === targetId ? { ...t, enabled } : t
    )
    this.config = saveConfigAtomically({ ...this.config, targets: nextTargets })
    this.syncMachinesFromConfig()
    const target = nextTargets.find((t) => t.id === targetId)
    if (target) {
      recordTargetEvent(
        this.processRepo,
        target,
        'CONFIG_CHANGE',
        'INFO',
        null,
        enabled ? '개별 감시가 활성화되었습니다.' : '개별 감시가 일시정지되었습니다.'
      )
    }
    await this.runScanTick()
    return this.getSnapshot()
  }

  async controlTarget(
    targetId: string,
    command: 'START' | 'STOP' | 'RESTART'
  ): Promise<MonitorStateSnapshot> {
    const target = this.config.targets.find((t) => t.id === targetId)
    const machine = this.machines.get(targetId)
    if (!target || !machine) return this.getSnapshot()

    await executeManualTargetControl({
      target,
      machine,
      command,
      processRepo: this.processRepo,
      onSetTargetEnabled: async (enabled: boolean) => {
        await this.toggleTargetEnabled(targetId, enabled)
      }
    })

    this.broadcastStateIfVisible()
    return this.getSnapshot()
  }

  async resetCircuitBreaker(targetId: string): Promise<MonitorStateSnapshot> {
    const target = this.config.targets.find((t) => t.id === targetId)
    const machine = this.machines.get(targetId)
    if (target && machine) {
      machine.resetCircuitBreaker()
      recordTargetEvent(this.processRepo, target, 'CIRCUIT_RESET', 'INFO', null, '연속 실패 차단이 해제되었습니다.')
      await this.runScanTick()
    }
    return this.getSnapshot()
  }

  async toggleMaintenanceMode(maintenanceMode: boolean): Promise<MonitorStateSnapshot> {
    this.config = saveConfigAtomically({
      ...this.config,
      system: { ...this.config.system, maintenanceMode }
    })
    writeSystemLog(
      'INFO',
      maintenanceMode ? '전체 점검 모드가 활성화되었습니다.' : '전체 점검 모드가 해제되었습니다.'
    )
    this.processRepo.insertEvent({
      targetId: 'SYSTEM',
      targetName: '시스템',
      eventType: 'SYSTEM',
      severity: maintenanceMode ? 'WARN' : 'INFO',
      pid: null,
      message: maintenanceMode ? '전체 점검 모드(감시 일시정지) 활성화' : '전체 점검 모드 해제 및 감시 재개'
    })
    await this.runScanTick()
    return this.getSnapshot()
  }

  async updateConfig(nextConfig: AppConfig): Promise<MonitorStateSnapshot> {
    const prevRunOnBoot = this.config.system.runOnBoot
    const prevInterval = this.config.system.checkIntervalMs
    const prevRebootTimeChanged =
      this.config.reboot?.hour !== nextConfig.reboot?.hour ||
      this.config.reboot?.minute !== nextConfig.reboot?.minute

    const configToSave: AppConfig =
      prevRebootTimeChanged && nextConfig.reboot
        ? {
            ...nextConfig,
            reboot: { ...nextConfig.reboot, lastExecutedDate: null }
          }
        : nextConfig

    this.config = saveConfigAtomically(configToSave)
    this.syncMachinesFromConfig()
    this.ntpScheduler.updateConfig(this.config.ntp)

    if (!this.config.reboot.enabled) {
      this.rebootScheduler.stop()
    }

    if (prevRunOnBoot !== this.config.system.runOnBoot) {
      await syncBootSchedulerTask(this.config.system.runOnBoot)
      this.bootRegistered = await isBootTaskRegistered()
    }

    if (prevInterval !== this.config.system.checkIntervalMs) {
      await this.start()
    } else {
      await this.runScanTick()
    }

    writeSystemLog('INFO', '환경 설정이 저장 및 반영되었습니다.')
    return this.getSnapshot()
  }

  getSnapshot(): MonitorStateSnapshot {
    const processes: ProcessRuntimeStatus[] = this.config.targets
      .map((t) => this.machines.get(t.id)?.getRuntimeStatus())
      .filter((s): s is ProcessRuntimeStatus => Boolean(s))

    let runningCount = 0
    let graceOrPendingCount = 0
    let issueOrCircuitCount = 0
    let pausedCount = 0

    for (const p of processes) {
      if (p.state === 'RUNNING') runningCount += 1
      else if (p.state === 'STARTUP_GRACE' || p.state === 'RESTART_PENDING' || p.state === 'STOPPING')
        graceOrPendingCount += 1
      else if (p.state === 'HUNG_DETECTED' || p.state === 'CIRCUIT_OPEN' || p.state === 'INVALID_PATH')
        issueOrCircuitCount += 1
      else if (p.state === 'PAUSED') pausedCount += 1
    }

    const ntpCounts = this.ntpRepo.getSummaryCounts()
    const summary: DashboardSummary = {
      totalTargets: processes.length,
      runningCount,
      graceOrPendingCount,
      issueOrCircuitCount,
      pausedCount,
      maintenanceMode: this.config.system.maintenanceMode,
      bootRegistered: this.bootRegistered,
      lastScanAt: this.lastScanAt,
      lastNtpSync: ntpCounts.latest,
      ntpSuccessCount: ntpCounts.successCount,
      ntpFailCount: ntpCounts.failCount
    }

    return {
      config: this.config,
      summary,
      processes,
      recentEvents: this.processRepo.queryEvents({ limit: 100 }),
      recentNtpHistory: this.ntpRepo.getRecentHistory(30),
      dailyStats: this.processRepo.queryDailyStats(30),
      storageInfo: collectStorageInfo(),
      rebootCountdown: this.rebootScheduler.getCountdownState()
    }
  }

  broadcastStateIfVisible(): void {
    const win = this.getMainWindow()
    if (!win || win.isDestroyed() || !win.isVisible() || win.isMinimized()) {
      return
    }
    win.webContents.send(IPC_CHANNELS.STATE_UPDATED, this.getSnapshot())
  }
}
