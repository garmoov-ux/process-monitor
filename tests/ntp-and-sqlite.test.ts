import { afterEach, describe, expect, it } from 'vitest'
import dgram from 'dgram'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { createDatabaseConnection } from '../src/main/db/connection'
import { ProcessRepository } from '../src/main/db/process-repo'
import { NtpRepository } from '../src/main/db/ntp-repo'
import { queryMultiNtpWithFailover } from '../src/main/ntp/sntp-client'
import { NtpScheduler } from '../src/main/ntp/ntp-scheduler'
import { createDefaultConfig, loadConfig, saveConfigAtomically } from '../src/main/config/config-manager'

const NTP_EPOCH_OFFSET_SEC = 2208988800

function createMockNtpServer(simulatedOffsetSec: number): Promise<{
  address: string
  close: () => Promise<void>
}> {
  return new Promise((resolve) => {
    const server = dgram.createSocket('udp4')
    server.on('message', (_msg, rinfo) => {
      const resp = Buffer.alloc(48)
      // LI = 0, VN = 4, Mode = 4 (Server) -> 0x24
      resp[0] = 0x24
      resp[1] = 2 // Stratum 2

      const nowSec = Math.floor(Date.now() / 1000) + NTP_EPOCH_OFFSET_SEC + simulatedOffsetSec
      resp.writeUInt32BE(nowSec, 32)
      resp.writeUInt32BE(0, 36)
      resp.writeUInt32BE(nowSec, 40)
      resp.writeUInt32BE(0, 44)

      server.send(resp, 0, resp.length, rinfo.port, rinfo.address)
    })

    server.bind(0, '127.0.0.1', () => {
      const addr = server.address()
      resolve({
        address: `127.0.0.1:${addr.port}`,
        close: () =>
          new Promise((resClose) => {
            server.close(() => resClose())
          })
      })
    })
  })
}

describe('다중 NTP Failover, 오차 제한 안전장치, 원자적 설정 및 SQLite 검증', () => {
  const closers: Array<() => Promise<void>> = []

  afterEach(async () => {
    while (closers.length > 0) {
      const fn = closers.pop()
      if (fn) await fn()
    }
  })

  it('1차 NTP 서버 타임아웃 시 즉시 2차 NTP 서버로 Failover하여 시간 오차를 계산한다', async () => {
    // 응답하지 않는 1차 UDP 소켓 생성
    const silentServer = dgram.createSocket('udp4')
    await new Promise<void>((res) => silentServer.bind(0, '127.0.0.1', () => res()))
    const silentPort = silentServer.address().port
    closers.push(
      () =>
        new Promise((r) => {
          silentServer.close(() => r())
        })
    )

    // 정상 응답하는 2차 UDP 서버 생성
    const activeServer = await createMockNtpServer(2)
    closers.push(activeServer.close)

    const result = await queryMultiNtpWithFailover(
      [`127.0.0.1:${silentPort}`, activeServer.address],
      300
    )

    expect(result.ok).toBe(true)
    expect(result.serverUsed).toBe(activeServer.address)
  })

  it('시간 오차가 maxOffsetLimitSec(예: 3600초)을 초과하면 시스템 시간 반영을 거부하고 OFFSET_EXCEEDED로 기록한다', async () => {
    // +7200초(2시간) 오차를 반환하는 모의 서버
    const hugeOffsetServer = await createMockNtpServer(7200)
    closers.push(hugeOffsetServer.close)

    const db = createDatabaseConnection(':memory:')
    const ntpRepo = new NtpRepository(db)
    let clockApplied = false

    const scheduler = new NtpScheduler(
      {
        enabled: true,
        syncIntervalMin: 60,
        timeoutMs: 500,
        maxOffsetLimitSec: 3600,
        servers: [hugeOffsetServer.address, '127.0.0.1:9', '127.0.0.1:9']
      },
      ntpRepo,
      undefined,
      async () => {
        clockApplied = true
        return { ok: true }
      }
    )

    const record = await scheduler.syncNow(true)
    expect(record.status).toBe('OFFSET_EXCEEDED')
    expect(record.applied).toBe(false)
    expect(clockApplied).toBe(false)
    db.close()
  })

  it('config.json 원자적 쓰기(Atomic Write) 및 인메모리 SQLite 이벤트/통계 집계가 정상 동작한다', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'))
    const cfgPath = path.join(tempDir, 'config.json')

    const cfg = createDefaultConfig()
    cfg.system.checkIntervalMs = 3500
    saveConfigAtomically(cfg, cfgPath)

    const loaded = loadConfig(cfgPath)
    expect(loaded.system.checkIntervalMs).toBe(3500)
    expect(fs.existsSync(`${cfgPath}.tmp`)).toBe(false)

    const db = createDatabaseConnection(':memory:')
    const repo = new ProcessRepository(db)

    repo.syncTargets([
      {
        id: 'p1',
        name: '단속카메라제어기',
        processName: 'CamCtrl.exe',
        windowTitle: 'CamCtrl',
        execPath: 'C:\\Cam\\CamCtrl.exe',
        args: '',
        workDir: 'C:\\Cam',
        windowStyle: 'normal',
        enabled: true,
        restartDelaySec: 5,
        startupGraceSec: 10,
        gracefulTimeoutSec: 5,
        checkNotResponding: true,
        hungThresholdCount: 3,
        maxRetriesInWindow: 5,
        retryWindowSec: 180
      }
    ])

    repo.insertEvent({
      targetId: 'p1',
      targetName: '단속카메라제어기',
      eventType: 'RESTART',
      severity: 'WARN',
      pid: 1234,
      message: '프로세스 자동 복구 완료'
    })

    repo.recordSampleBatch('2026-11-18', [
      { targetId: 'p1', targetName: '단속카메라제어기', isRunning: true, restartedDelta: 1, hungDelta: 0 },
      { targetId: 'p1', targetName: '단속카메라제어기', isRunning: true, restartedDelta: 0, hungDelta: 0 }
    ])

    const events = repo.queryEvents({ targetId: 'p1' })
    expect(events.length).toBe(1)
    expect(events[0].eventType).toBe('RESTART')

    const stats = repo.queryDailyStats(7)
    expect(stats.length).toBe(1)
    expect(stats[0].uptimePercent).toBe(100)
    expect(stats[0].restartCount).toBe(1)

    db.close()
    fs.rmSync(tempDir, { recursive: true, force: true })
  })
})
