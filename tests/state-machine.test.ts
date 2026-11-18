import { describe, expect, it } from 'vitest'
import { ProcessStateMachine } from '../src/main/watchdog/state-machine'
import { evaluateRebootSchedule } from '../src/main/watchdog/reboot-scheduler'
import {
  ProcessTargetConfig,
  RebootScheduleConfig,
  RunningProcessSnapshot
} from '../src/shared/types/domain'

function createSampleTarget(overrides: Partial<ProcessTargetConfig> = {}): ProcessTargetConfig {
  return {
    id: 'proc_test_01',
    name: '테스트 제어 프로그램',
    processName: 'TestController.exe',
    windowTitle: 'TestController v1.0',
    execPath: 'C:\\App\\TestController.exe',
    args: '--mode=prod',
    workDir: 'C:\\App',
    windowStyle: 'normal',
    enabled: true,
    restartDelaySec: 5,
    startupGraceSec: 10,
    gracefulTimeoutSec: 4,
    checkNotResponding: true,
    hungThresholdCount: 3,
    maxRetriesInWindow: 3,
    retryWindowSec: 60,
    ...overrides
  }
}

function createSnapshot(responding = true, pid = 4321): RunningProcessSnapshot {
  return {
    pid,
    processName: 'TestController.exe',
    execPath: 'C:\\App\\TestController.exe',
    windowTitle: 'TestController v1.0',
    responding,
    memoryKb: 51200
  }
}

describe('ProcessStateMachine (단조 증가 시간 기반 상태 전이 검증)', () => {
  it('미감지 상태에서 restartDelaySec 경과 후 SPAWN 액션을 반환하고 구동 유예(STARTUP_GRACE)로 진입한다', () => {
    let nowSec = 100n
    const clock = (): bigint => nowSec * 1_000_000_000n
    const target = createSampleTarget({ restartDelaySec: 5, startupGraceSec: 10 })
    const sm = new ProcessStateMachine(target, clock)

    // 초기 상태는 RESTART_PENDING, 3초 경과 시 아직 대기 중
    nowSec = 103n
    const act1 = sm.evaluateTick(null, false, true)
    expect(act1.type).toBe('NONE')
    expect(sm.getRuntimeStatus().state).toBe('RESTART_PENDING')
    expect(sm.getRuntimeStatus().countdownSec).toBe(2)

    // 5초 경과 시 SPAWN 요청
    nowSec = 105n
    const act2 = sm.evaluateTick(null, false, true)
    expect(act2.type).toBe('SPAWN')

    // 기동 성공 기록 후 STARTUP_GRACE 상태 확인
    sm.markSpawnSuccess(4321, true)
    expect(sm.getRuntimeStatus().state).toBe('STARTUP_GRACE')

    // 구동 유예 시간(10초) 동안은 프로세스가 아직 안 잡혀도 재시작하지 않음
    nowSec = 110n
    const act3 = sm.evaluateTick(null, false, true)
    expect(act3.type).toBe('NONE')
    expect(sm.getRuntimeStatus().state).toBe('STARTUP_GRACE')

    // 유예 시간 경과 후 스냅샷 감지 시 RUNNING 전환
    nowSec = 116n
    const act4 = sm.evaluateTick(createSnapshot(true, 4321), false, true)
    expect(act4.type).toBe('NONE')
    expect(sm.getRuntimeStatus().state).toBe('RUNNING')
  })

  it('응답 없음(Responding=false)이 hungThresholdCount 연속 감지되면 강제 종료 후 재시작을 요청한다', () => {
    let nowSec = 200n
    const clock = (): bigint => nowSec * 1_000_000_000n
    const target = createSampleTarget({ hungThresholdCount: 3 })
    const sm = new ProcessStateMachine(target, clock)

    // 정상 가동 진입
    sm.evaluateTick(createSnapshot(true, 5000), false, true)
    expect(sm.getRuntimeStatus().state).toBe('RUNNING')

    // 1회 응답 없음
    nowSec = 202n
    const a1 = sm.evaluateTick(createSnapshot(false, 5000), false, true)
    expect(a1.type).toBe('NONE')
    expect(sm.getRuntimeStatus().state).toBe('HUNG_DETECTED')
    expect(sm.getRuntimeStatus().consecutiveHungCount).toBe(1)

    // 2회 응답 없음
    nowSec = 204n
    const a2 = sm.evaluateTick(createSnapshot(false, 5000), false, true)
    expect(a2.type).toBe('NONE')
    expect(sm.getRuntimeStatus().consecutiveHungCount).toBe(2)

    // 3회 연속 응답 없음 도달 -> FORCE_KILL_AND_RESTART
    nowSec = 206n
    const a3 = sm.evaluateTick(createSnapshot(false, 5000), false, true)
    expect(a3.type).toBe('FORCE_KILL_AND_RESTART')
    expect(a3.pid).toBe(5000)
  })

  it('retryWindowSec 내 maxRetriesInWindow회 이상 연속 재시작 실패 시 서킷 브레이커(CIRCUIT_OPEN)가 작동한다', () => {
    let nowSec = 300n
    const clock = (): bigint => nowSec * 1_000_000_000n
    const target = createSampleTarget({
      restartDelaySec: 2,
      startupGraceSec: 3,
      maxRetriesInWindow: 3,
      retryWindowSec: 60
    })
    const sm = new ProcessStateMachine(target, clock)

    // 3회 연속 기동 후 즉시 크래시 시뮬레이션
    for (let i = 0; i < 3; i++) {
      nowSec += 3n
      const spawnAct = sm.evaluateTick(null, false, true)
      expect(spawnAct.type).toBe('SPAWN')
      sm.markSpawnSuccess(1000 + i, true)

      // 유예 시간 경과 후에도 프로세스 미감지(즉시 종료됨)
      nowSec += 4n
      sm.evaluateTick(null, false, true)
    }

    // 3회 실패 누적 후에는 CIRCUIT_OPEN 상태로 차단되어야 함
    expect(sm.getRuntimeStatus().state).toBe('CIRCUIT_OPEN')

    // 차단 해제 시 다시 RESTART_PENDING으로 복귀
    sm.resetCircuitBreaker()
    expect(sm.getRuntimeStatus().state).toBe('RESTART_PENDING')
  })

  it('수동 종료 요청 시 정상 종료 유예 시간(gracefulTimeoutSec) 경과 후 강제 종료를 수행한다', () => {
    let nowSec = 500n
    const clock = (): bigint => nowSec * 1_000_000_000n
    const target = createSampleTarget({ gracefulTimeoutSec: 4 })
    const sm = new ProcessStateMachine(target, clock)

    sm.evaluateTick(createSnapshot(true, 7777), false, true)
    expect(sm.getRuntimeStatus().state).toBe('RUNNING')

    const stopAct = sm.requestManualStop(false)
    expect(stopAct.type).toBe('GRACEFUL_STOP')
    expect(stopAct.pid).toBe(7777)
    expect(sm.getRuntimeStatus().state).toBe('STOPPING')

    // 수동 종료 시 자동 감시가 꺼져도(enabled=false) STOPPING 단계별 강제 종료가 끝까지 수행되어야 함
    sm.updateConfig({ ...target, enabled: false })
    expect(sm.getRuntimeStatus().state).toBe('STOPPING')

    // 2초 경과: 아직 프로세스가 살아있으면 대기 유지
    nowSec = 502n
    expect(sm.evaluateTick(createSnapshot(true, 7777), false, true).type).toBe('NONE')

    // 4초 경과: 여전히 종료되지 않았으면 FORCE_KILL_ONLY 반환
    nowSec = 504n
    const forceAct = sm.evaluateTick(createSnapshot(true, 7777), false, true)
    expect(forceAct.type).toBe('FORCE_KILL_ONLY')
    expect(forceAct.pid).toBe(7777)
  })

  it('주기적 자동 재시작(periodicRestartEnabled) 설정 시 지정된 초 경과마다 서킷 브레이커 차단 없이 프로세스를 재기동한다', () => {
    let nowSec = 1000n
    const clock = (): bigint => nowSec * 1_000_000_000n
    const target = createSampleTarget({
      periodicRestartEnabled: true,
      periodicRestartIntervalSec: 30,
      gracefulTimeoutSec: 4,
      maxRetriesInWindow: 2,
      retryWindowSec: 180
    })
    const sm = new ProcessStateMachine(target, clock)

    // 최초 실행 감지
    sm.evaluateTick(createSnapshot(true, 8001), false, true)
    expect(sm.getRuntimeStatus().state).toBe('RUNNING')
    expect(sm.getRuntimeStatus().periodicRemainingSec).toBe(30)

    // 20초 경과: 남은 주기 10초
    nowSec = 1020n
    expect(sm.evaluateTick(createSnapshot(true, 8001), false, true).type).toBe('NONE')
    expect(sm.getRuntimeStatus().periodicRemainingSec).toBe(10)

    // 30초 경과: 주기적 재시작 도달 -> GRACEFUL_STOP 반환 및 STOPPING 진입
    nowSec = 1030n
    const periodicStop = sm.evaluateTick(createSnapshot(true, 8001), false, true)
    expect(periodicStop.type).toBe('GRACEFUL_STOP')
    expect(periodicStop.pid).toBe(8001)
    expect(periodicStop.isPeriodic).toBe(true)
    expect(sm.getRuntimeStatus().state).toBe('STOPPING')

    // 프로세스가 정상 종료되어 스냅샷이 사라지면 즉시 SPAWN(isPeriodic=true) 반환
    nowSec = 1032n
    const periodicSpawn = sm.evaluateTick(null, false, true)
    expect(periodicSpawn.type).toBe('SPAWN')
    expect(periodicSpawn.isPeriodic).toBe(true)

    // 주기적 재시작으로 기동 성공 시 총 재시작 횟수는 증가하되 연속 실패(recentRetryCount)에는 누적되지 않음
    sm.markSpawnSuccess(8002, true, new Date().toISOString(), !periodicSpawn.isPeriodic)
    expect(sm.getRuntimeStatus().totalRestartCount).toBe(1)
    expect(sm.getRuntimeStatus().recentRetryCount).toBe(0)
  })
})

describe('evaluateRebootSchedule (정기 시스템 재시작 월·일 선택 및 미실행 보완/중복 방지 검증)', () => {
  const baseRebootConfig: RebootScheduleConfig = {
    enabled: true,
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

  it('지정 시각이 지났으나 시스템이 지정 시각 이전부터 계속 켜져 있었고 미실행 상태면 보완 실행(shouldTrigger=true)을 반환한다', () => {
    const now = new Date(2026, 10, 18, 4, 25, 0) // 11월 18일 04:25
    const bootBeforeSchedule = new Date(2026, 10, 17, 22, 0, 0).getTime() // 전날 22:00 부팅

    const res = evaluateRebootSchedule(baseRebootConfig, now, bootBeforeSchedule, false)
    expect(res.shouldTrigger).toBe(true)
    expect(res.markExecutedToday).toBe(false)
    expect(res.todayDateStr).toBe('2026-11-18')
  })

  it('금일 지정 시각 이후에 이미 부팅된 경우 무한 재부팅 방지를 위해 재시작하지 않고 실행 완료 마킹만 요청한다', () => {
    const now = new Date(2026, 10, 18, 4, 5, 0) // 11월 18일 04:05
    const bootAfterSchedule = new Date(2026, 10, 18, 4, 1, 0).getTime() // 04:01 부팅 완료

    const res = evaluateRebootSchedule(baseRebootConfig, now, bootAfterSchedule, false)
    expect(res.shouldTrigger).toBe(false)
    expect(res.markExecutedToday).toBe(true)
  })

  it('선택 해제된 월이나 일자에서는 지정 시각이 되어도 재시작하지 않는다', () => {
    const now = new Date(2026, 10, 18, 4, 0, 10) // 11월 18일 04:00:10
    const bootBeforeSchedule = new Date(2026, 10, 17, 20, 0, 0).getTime()

    // 11월이 해제된 경우
    const noNov = { ...baseRebootConfig, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12] }
    expect(evaluateRebootSchedule(noNov, now, bootBeforeSchedule, false).shouldTrigger).toBe(false)

    // 일자별 모드에서 18일이 해제된 경우
    const byDateNo18: RebootScheduleConfig = {
      ...baseRebootConfig,
      ruleMode: 'DAYS_OF_MONTH',
      daysOfMonth: [1, 15, 30]
    }
    expect(evaluateRebootSchedule(byDateNo18, now, bootBeforeSchedule, false).shouldTrigger).toBe(false)
  })
})

