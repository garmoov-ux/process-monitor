import { describe, expect, it } from 'vitest'
import { ProcessStateMachine } from '../src/main/watchdog/state-machine'
import { ProcessTargetConfig, RunningProcessSnapshot } from '../src/shared/types/domain'

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
})
