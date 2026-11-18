import { execFile } from 'child_process'
import { NtpConfig, NtpSyncRecord } from '@shared/types/domain'
import { NtpRepository } from '../db/ntp-repo'
import { queryMultiNtpWithFailover } from './sntp-client'
import { writeSystemLog } from '../watchdog/file-logger'

export type SystemClockApplier = (targetEpochMs: number) => Promise<{ ok: boolean; error?: string }>

export async function applyWindowsSystemTime(
  targetEpochMs: number
): Promise<{ ok: boolean; error?: string }> {
  if (!Number.isFinite(targetEpochMs) || targetEpochMs <= 0) {
    return { ok: false, error: '유효하지 않은 목표 시각' }
  }

  const isoUtc = new Date(targetEpochMs).toISOString()
  const psCmd = `Set-Date -Date ([DateTime]::Parse('${isoUtc}').ToLocalTime())`

  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psCmd],
      { timeout: 5000, windowsHide: true },
      (err) => {
        if (err) {
          resolve({ ok: false, error: err.message })
          return
        }
        resolve({ ok: true })
      }
    )
  })
}

function buildEndpointsWithPorts(config: NtpConfig): string[] {
  const ports = Array.isArray(config.ports) ? config.ports : [123, 123, 123]
  return config.servers.map((srv, idx) => {
    const trimmed = (srv || '').trim()
    if (!trimmed) return ''
    if (trimmed.includes(':')) return trimmed
    const port = Number(ports[idx] ?? 123)
    const validPort = Number.isInteger(port) && port >= 1 && port <= 65535 ? port : 123
    return validPort === 123 ? trimmed : `${trimmed}:${validPort}`
  })
}

export class NtpScheduler {
  private timer: NodeJS.Timeout | null = null
  private syncing = false

  constructor(
    private config: NtpConfig,
    private readonly ntpRepo: NtpRepository,
    private readonly onUpdated?: () => void,
    private readonly clockApplier: SystemClockApplier = applyWindowsSystemTime
  ) {}

  start(): void {
    this.stop()
    if (!this.config.enabled) return

    const intervalMs = Math.max(1, this.config.syncIntervalMin) * 60 * 1000
    this.timer = setInterval(() => {
      void this.syncNow(false)
    }, intervalMs)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  updateConfig(nextConfig: NtpConfig): void {
    this.config = nextConfig
    this.start()
  }

  async syncNow(applySystemClock = true): Promise<NtpSyncRecord> {
    if (this.syncing) {
      const latest = this.ntpRepo.getRecentHistory(1)[0]
      if (latest) return latest
    }

    this.syncing = true
    try {
      const endpoints = buildEndpointsWithPorts(this.config)
      const queryRes = await queryMultiNtpWithFailover(endpoints, this.config.timeoutMs)

      if (!queryRes.ok) {
        const record = this.ntpRepo.insertSyncRecord({
          serverUsed: queryRes.serverUsed,
          offsetMs: 0,
          rttMs: queryRes.rttMs,
          applied: false,
          status: 'FAILED',
          message: queryRes.error || '시간 서버 통신 실패'
        })
        writeSystemLog('WARN', `시간 동기화 실패: ${record.message}`)
        this.onUpdated?.()
        return record
      }

      const absOffsetSec = Math.abs(queryRes.offsetMs) / 1000
      if (absOffsetSec > this.config.maxOffsetLimitSec) {
        const msg = `시간 오차(${Math.round(absOffsetSec)}초)가 허용 한계(${this.config.maxOffsetLimitSec}초)를 초과하여 시스템 시간 변경을 보류했습니다.`
        const record = this.ntpRepo.insertSyncRecord({
          serverUsed: queryRes.serverUsed,
          offsetMs: queryRes.offsetMs,
          rttMs: queryRes.rttMs,
          applied: false,
          status: 'OFFSET_EXCEEDED',
          message: msg
        })
        writeSystemLog('WARN', `[${queryRes.serverUsed}] ${msg}`)
        this.onUpdated?.()
        return record
      }

      let applied = false
      let applyNote = '시간 오차 측정 완료'
      if (applySystemClock) {
        const targetMs = Date.now() + Math.round(queryRes.offsetMs)
        const applyRes = await this.clockApplier(targetMs)
        applied = applyRes.ok
        applyNote = applyRes.ok
          ? `시스템 시각 동기화 완료 (보정 오차 ${queryRes.offsetMs >= 0 ? '+' : ''}${queryRes.offsetMs}밀리초)`
          : `오차 측정 성공(${queryRes.offsetMs}밀리초), 시스템 시계 반영 실패(관리자 권한 필요)`
      }

      const record = this.ntpRepo.insertSyncRecord({
        serverUsed: queryRes.serverUsed,
        offsetMs: queryRes.offsetMs,
        rttMs: queryRes.rttMs,
        applied,
        status: 'SUCCESS',
        message: applyNote
      })
      writeSystemLog('INFO', `[${queryRes.serverUsed}] ${applyNote} (왕복 지연 ${queryRes.rttMs}밀리초)`)
      this.onUpdated?.()
      return record
    } finally {
      this.syncing = false
    }
  }
}
