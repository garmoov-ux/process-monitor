import os from 'os'
import { execFile } from 'child_process'
import { RebootCountdownState, RebootScheduleConfig } from '@shared/types/domain'
import { ProcessRepository } from '../db/process-repo'
import { writeSystemLog } from './file-logger'

export interface RebootEvaluationResult {
  shouldTrigger: boolean
  markExecutedToday: boolean
  reason: string
  scheduledLabel: string
  todayDateStr: string
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function evaluateRebootSchedule(
  config: RebootScheduleConfig,
  now: Date,
  systemBootTimeMs: number,
  maintenanceMode: boolean
): RebootEvaluationResult {
  const todayDateStr = formatLocalDateKey(now)
  const scheduledLabel = `${pad2(config.hour)}:${pad2(config.minute)}`

  if (!config.enabled || maintenanceMode) {
    return {
      shouldTrigger: false,
      markExecutedToday: false,
      reason: '',
      scheduledLabel,
      todayDateStr
    }
  }

  if (config.lastExecutedDate === todayDateStr) {
    return {
      shouldTrigger: false,
      markExecutedToday: false,
      reason: '금일 실행 완료 또는 취소됨',
      scheduledLabel,
      todayDateStr
    }
  }

  const currentMonth = now.getMonth() + 1
  if (!config.months.includes(currentMonth)) {
    return {
      shouldTrigger: false,
      markExecutedToday: false,
      reason: '선택된 월 아님',
      scheduledLabel,
      todayDateStr
    }
  }

  const isDayMatched =
    config.ruleMode === 'DAYS_OF_MONTH'
      ? config.daysOfMonth.includes(now.getDate())
      : config.daysOfWeek.includes(now.getDay())

  if (!isDayMatched) {
    return {
      shouldTrigger: false,
      markExecutedToday: false,
      reason: '선택된 요일/일자 아님',
      scheduledLabel,
      todayDateStr
    }
  }

  const todayScheduledMs = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    config.hour,
    config.minute,
    0,
    0
  ).getTime()

  const nowMs = now.getTime()
  if (nowMs < todayScheduledMs) {
    return {
      shouldTrigger: false,
      markExecutedToday: false,
      reason: '지정 시각 도달 전',
      scheduledLabel,
      todayDateStr
    }
  }

  // 무한 재부팅 방지: 시스템 부팅 시각이 오늘 지정 시각 이후라면 이미 재부팅(또는 지정 시각 이후 부팅)된 상태임
  if (systemBootTimeMs >= todayScheduledMs) {
    return {
      shouldTrigger: false,
      markExecutedToday: true,
      reason: `금일 지정 시각(${scheduledLabel}) 이후에 시스템이 부팅되어 중복 재시작을 건너뜁니다.`,
      scheduledLabel,
      todayDateStr
    }
  }

  const elapsedMs = nowMs - todayScheduledMs
  if (elapsedMs <= 90_000) {
    return {
      shouldTrigger: true,
      markExecutedToday: false,
      reason: `정기 시스템 재시작 지정 시각(${scheduledLabel}) 도달`,
      scheduledLabel,
      todayDateStr
    }
  }

  if (config.catchUpOnMissed) {
    return {
      shouldTrigger: true,
      markExecutedToday: false,
      reason: `지정 시각(${scheduledLabel}) 경과 미실행 감지 (보완 실행)`,
      scheduledLabel,
      todayDateStr
    }
  }

  return {
    shouldTrigger: false,
    markExecutedToday: true,
    reason: `지정 시각(${scheduledLabel})이 경과되었으나 보완 실행이 비활성화되어 건너뜁니다.`,
    scheduledLabel,
    todayDateStr
  }
}

export class RebootScheduler {
  private countdownTimer: NodeJS.Timeout | null = null
  private countdownState: RebootCountdownState = {
    active: false,
    remainingSec: 0,
    scheduledLabel: '04:00',
    reason: ''
  }

  constructor(
    private readonly processRepo: ProcessRepository,
    private readonly onMarkExecutedDate: (dateStr: string) => void,
    private readonly onStateChanged: () => void
  ) {}

  getCountdownState(): RebootCountdownState {
    return { ...this.countdownState }
  }

  stop(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer)
      this.countdownTimer = null
    }
    this.countdownState = {
      active: false,
      remainingSec: 0,
      scheduledLabel: this.countdownState.scheduledLabel,
      reason: ''
    }
  }

  checkTick(config: RebootScheduleConfig, maintenanceMode: boolean): void {
    if (!config.enabled || maintenanceMode) {
      if (this.countdownState.active) {
        this.stop()
        this.onStateChanged()
      }
      return
    }

    if (this.countdownState.active) {
      return
    }

    const now = new Date()
    const systemBootTimeMs = Date.now() - os.uptime() * 1000
    const evalResult = evaluateRebootSchedule(config, now, systemBootTimeMs, maintenanceMode)

    if (evalResult.markExecutedToday) {
      this.onMarkExecutedDate(evalResult.todayDateStr)
      if (evalResult.reason) {
        writeSystemLog('INFO', evalResult.reason)
      }
      return
    }

    if (evalResult.shouldTrigger) {
      this.startCountdown(config, evalResult.scheduledLabel, evalResult.reason, evalResult.todayDateStr)
    }
  }

  private startCountdown(
    config: RebootScheduleConfig,
    scheduledLabel: string,
    reason: string,
    todayDateStr: string
  ): void {
    const graceSec = Math.max(5, Math.min(300, config.graceCancelSec || 30))
    this.countdownState = {
      active: true,
      remainingSec: graceSec,
      scheduledLabel,
      reason
    }

    const startMsg = `${reason} — ${graceSec}초 후 윈도우 시스템을 재시작합니다.`
    writeSystemLog('WARN', startMsg)
    this.processRepo.insertEvent({
      targetId: 'SYSTEM',
      targetName: '시스템 재시작',
      eventType: 'SYSTEM',
      severity: 'WARN',
      pid: null,
      message: startMsg
    })
    this.onStateChanged()

    if (this.countdownTimer) clearInterval(this.countdownTimer)
    this.countdownTimer = setInterval(() => {
      if (!this.countdownState.active) {
        this.stop()
        return
      }

      const nextSec = this.countdownState.remainingSec - 1
      if (nextSec <= 0) {
        this.stop()
        this.executeWindowsReboot(todayDateStr, reason)
        return
      }

      this.countdownState = {
        ...this.countdownState,
        remainingSec: nextSec
      }
      this.onStateChanged()
    }, 1000)
  }

  cancelCountdown(): void {
    if (!this.countdownState.active) return
    const todayDateStr = formatLocalDateKey(new Date())
    this.stop()
    this.onMarkExecutedDate(todayDateStr)

    const cancelMsg = '사용자에 의해 당일 정기 시스템 재시작이 취소되었습니다.'
    writeSystemLog('INFO', cancelMsg)
    this.processRepo.insertEvent({
      targetId: 'SYSTEM',
      targetName: '시스템 재시작',
      eventType: 'SYSTEM',
      severity: 'INFO',
      pid: null,
      message: cancelMsg
    })
    this.onStateChanged()
  }

  private executeWindowsReboot(todayDateStr: string, reason: string): void {
    this.onMarkExecutedDate(todayDateStr)
    const execMsg = `정기 시스템 재시작 명령을 실행합니다 (${reason}).`
    writeSystemLog('WARN', execMsg)
    this.processRepo.insertEvent({
      targetId: 'SYSTEM',
      targetName: '시스템 재시작',
      eventType: 'SYSTEM',
      severity: 'WARN',
      pid: null,
      message: execMsg
    })
    this.onStateChanged()

    execFile(
      'shutdown.exe',
      ['/r', '/f', '/t', '5', '/c', 'Process Monitor 정기 시스템 재시작'],
      { windowsHide: true },
      (err) => {
        if (err) {
          writeSystemLog('ERROR', `시스템 재시작 명령 실행 실패: ${err.message}`)
        }
      }
    )
  }
}
