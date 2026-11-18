import {
  ProcessRuntimeStatus,
  ProcessTargetConfig,
  ProcessTargetState,
  RunningProcessSnapshot
} from '@shared/types/domain'

export type MonotonicClockFn = () => bigint

export interface StateTransitionAction {
  type: 'NONE' | 'SPAWN' | 'GRACEFUL_STOP' | 'FORCE_KILL_AND_RESTART' | 'FORCE_KILL_ONLY'
  pid?: number
  reason?: string
}

export class ProcessStateMachine {
  private state: ProcessTargetState = 'PAUSED'
  private pid: number | null = null
  private detectedWindowTitle = ''
  private responding = true
  private memoryKb = 0
  private stateEnteredAtNs: bigint
  private runningSinceNs: bigint | null = null
  private consecutiveHungCount = 0
  private retryTimestampsNs: bigint[] = []
  private totalRestartCount = 0
  private lastStartedAt: string | null = null
  private lastFailureAt: string | null = null
  private lastMessage = '감시 대기 중'
  private stopThenRestart = false

  constructor(
    private target: ProcessTargetConfig,
    private readonly clockNs: MonotonicClockFn = () => process.hrtime.bigint(),
    meta?: { totalRestartCount: number; lastStartedAt: string | null; lastFailureAt: string | null }
  ) {
    this.stateEnteredAtNs = this.clockNs()
    if (meta) {
      this.totalRestartCount = meta.totalRestartCount
      this.lastStartedAt = meta.lastStartedAt
      this.lastFailureAt = meta.lastFailureAt
    }
    this.state = target.enabled ? 'RESTART_PENDING' : 'PAUSED'
  }

  updateConfig(nextTarget: ProcessTargetConfig): void {
    const wasEnabled = this.target.enabled
    this.target = nextTarget
    if (!nextTarget.enabled) {
      this.transitionTo('PAUSED', '개별 감시 일시정지됨')
    } else if (!wasEnabled && nextTarget.enabled && this.state === 'PAUSED') {
      this.transitionTo('RESTART_PENDING', '감시 활성화됨')
    }
  }

  getTarget(): ProcessTargetConfig {
    return this.target
  }

  private elapsedSecSince(sinceNs: bigint, nowNs: bigint): number {
    const diffNs = nowNs > sinceNs ? nowNs - sinceNs : 0n
    return Number(diffNs / 1_000_000_000n)
  }

  private pruneRetryWindow(nowNs: bigint): void {
    const windowNs = BigInt(this.target.retryWindowSec) * 1_000_000_000n
    this.retryTimestampsNs = this.retryTimestampsNs.filter((ts) => nowNs - ts <= windowNs)
  }

  private transitionTo(nextState: ProcessTargetState, message: string, nowNs = this.clockNs()): void {
    this.state = nextState
    this.stateEnteredAtNs = nowNs
    this.lastMessage = message
  }

  markPathInvalid(reason: string): void {
    this.runningSinceNs = null
    this.pid = null
    this.lastFailureAt = new Date().toISOString()
    this.transitionTo('INVALID_PATH', reason)
  }

  markSpawnSuccess(pid: number | null, isAutoRestart: boolean, nowIso = new Date().toISOString()): void {
    const nowNs = this.clockNs()
    if (isAutoRestart) {
      this.retryTimestampsNs.push(nowNs)
      this.totalRestartCount += 1
    }
    this.pid = pid
    this.runningSinceNs = nowNs
    this.consecutiveHungCount = 0
    this.lastStartedAt = nowIso
    this.transitionTo('STARTUP_GRACE', `구동 유예 중 (${this.target.startupGraceSec}초)`, nowNs)
  }

  requestManualStop(thenRestart = false): StateTransitionAction {
    const nowNs = this.clockNs()
    this.stopThenRestart = thenRestart
    if (this.pid) {
      const targetPid = this.pid
      this.transitionTo(
        'STOPPING',
        thenRestart ? '재시작을 위한 정상 종료 대기 중' : '정상 종료 유도 중',
        nowNs
      )
      return { type: 'GRACEFUL_STOP', pid: targetPid, reason: '수동 종료 요청' }
    }

    if (thenRestart) {
      this.transitionTo('STARTUP_GRACE', '수동 즉시 실행 중', nowNs)
      return { type: 'SPAWN', reason: '수동 시작 요청' }
    }

    this.transitionTo('PAUSED', '수동 정지됨', nowNs)
    return { type: 'NONE' }
  }

  resetCircuitBreaker(): void {
    const nowNs = this.clockNs()
    this.retryTimestampsNs = []
    this.consecutiveHungCount = 0
    this.transitionTo('RESTART_PENDING', '차단 해제 후 감시 재개', nowNs)
  }

  evaluateTick(
    snapshot: RunningProcessSnapshot | null,
    maintenanceMode: boolean,
    pathValid = true,
    pathErrorReason?: string
  ): StateTransitionAction {
    const nowNs = this.clockNs()
    this.pruneRetryWindow(nowNs)

    if (maintenanceMode || !this.target.enabled) {
      if (snapshot) {
        this.pid = snapshot.pid
        this.detectedWindowTitle = snapshot.windowTitle
        this.responding = snapshot.responding
        this.memoryKb = snapshot.memoryKb
      } else {
        this.pid = null
        this.memoryKb = 0
      }
      this.transitionTo(
        'PAUSED',
        maintenanceMode ? '전체 점검 모드로 감시 일시정지' : '개별 감시 일시정지',
        nowNs
      )
      return { type: 'NONE' }
    }

    if (!pathValid) {
      this.markPathInvalid(pathErrorReason || '실행 파일 경로 오류')
      return { type: 'NONE' }
    }

    if (this.state === 'CIRCUIT_OPEN') {
      if (snapshot && snapshot.responding) {
        this.pid = snapshot.pid
        this.runningSinceNs = this.runningSinceNs ?? nowNs
        this.transitionTo('RUNNING', '수동 기동 감지되어 정상 복귀', nowNs)
      }
      return { type: 'NONE' }
    }

    if (this.state === 'STOPPING') {
      if (!snapshot) {
        this.pid = null
        this.runningSinceNs = null
        if (this.stopThenRestart) {
          this.stopThenRestart = false
          return { type: 'SPAWN', reason: '정상 종료 완료 후 재기동' }
        }
        this.transitionTo('PAUSED', '정상 종료 완료', nowNs)
        return { type: 'NONE' }
      }

      const elapsed = this.elapsedSecSince(this.stateEnteredAtNs, nowNs)
      if (elapsed >= this.target.gracefulTimeoutSec) {
        const killPid = snapshot.pid
        const shouldRestart = this.stopThenRestart
        this.stopThenRestart = false
        this.pid = null
        this.runningSinceNs = null
        if (shouldRestart) {
          return { type: 'FORCE_KILL_AND_RESTART', pid: killPid, reason: '정상 종료 유예 초과로 강제 재시작' }
        }
        this.transitionTo('PAUSED', '유예 시간 초과로 강제 종료 완료', nowNs)
        return { type: 'FORCE_KILL_ONLY', pid: killPid, reason: '정상 종료 유예 초과 강제 종료' }
      }
      return { type: 'NONE' }
    }

    if (this.state === 'STARTUP_GRACE') {
      if (snapshot) {
        this.pid = snapshot.pid
        this.detectedWindowTitle = snapshot.windowTitle
        this.responding = snapshot.responding
        this.memoryKb = snapshot.memoryKb
      }
      const elapsed = this.elapsedSecSince(this.stateEnteredAtNs, nowNs)
      if (elapsed >= this.target.startupGraceSec) {
        if (snapshot) {
          this.transitionTo('RUNNING', '초기 구동 유예 완료 (정상 가동)', nowNs)
        } else {
          this.lastFailureAt = new Date().toISOString()
          return this.handleMissingOrCrash(nowNs, '구동 유예 시간 내 프로세스 미감지')
        }
      }
      return { type: 'NONE' }
    }

    if (snapshot) {
      this.pid = snapshot.pid
      this.detectedWindowTitle = snapshot.windowTitle
      this.responding = snapshot.responding
      this.memoryKb = snapshot.memoryKb
      if (!this.runningSinceNs) {
        this.runningSinceNs = nowNs
      }

      if (this.target.checkNotResponding && !snapshot.responding) {
        this.consecutiveHungCount += 1
        if (this.consecutiveHungCount >= this.target.hungThresholdCount) {
          this.lastFailureAt = new Date().toISOString()
          if (this.retryTimestampsNs.length >= this.target.maxRetriesInWindow) {
            this.transitionTo(
              'CIRCUIT_OPEN',
              `연속 실패 한도(${this.target.maxRetriesInWindow}회) 초과로 자동 재시작 차단`,
              nowNs
            )
            return { type: 'NONE' }
          }
          const hungPid = snapshot.pid
          this.consecutiveHungCount = 0
          return {
            type: 'FORCE_KILL_AND_RESTART',
            pid: hungPid,
            reason: `응답 없음 연속 ${this.target.hungThresholdCount}회 감지`
          }
        }
        this.transitionTo(
          'HUNG_DETECTED',
          `응답 없음 감지 (${this.consecutiveHungCount}/${this.target.hungThresholdCount}회)`,
          nowNs
        )
        return { type: 'NONE' }
      }

      this.consecutiveHungCount = 0
      if (this.state !== 'RUNNING') {
        this.transitionTo('RUNNING', '정상 가동 중', nowNs)
      }
      return { type: 'NONE' }
    }

    // 프로세스가 스냅샷에 존재하지 않는 경우
    this.pid = null
    this.memoryKb = 0
    this.runningSinceNs = null
    this.consecutiveHungCount = 0
    return this.handleMissingOrCrash(nowNs, '프로세스 종료 또는 미감지')
  }

  private handleMissingOrCrash(nowNs: bigint, reason: string): StateTransitionAction {
    if (this.retryTimestampsNs.length >= this.target.maxRetriesInWindow) {
      this.transitionTo(
        'CIRCUIT_OPEN',
        `${this.target.retryWindowSec}초 내 ${this.target.maxRetriesInWindow}회 재시작 실패로 자동 복구 차단`,
        nowNs
      )
      return { type: 'NONE' }
    }

    if (this.state !== 'RESTART_PENDING') {
      this.lastFailureAt = new Date().toISOString()
      this.transitionTo('RESTART_PENDING', `${reason} - ${this.target.restartDelaySec}초 후 재실행`, nowNs)
      return { type: 'NONE' }
    }

    const elapsed = this.elapsedSecSince(this.stateEnteredAtNs, nowNs)
    if (elapsed >= this.target.restartDelaySec) {
      return { type: 'SPAWN', reason: `재시작 대기(${this.target.restartDelaySec}초) 경과` }
    }
    return { type: 'NONE' }
  }

  getRuntimeStatus(): ProcessRuntimeStatus {
    const nowNs = this.clockNs()
    this.pruneRetryWindow(nowNs)

    let countdownSec = 0
    if (this.state === 'RESTART_PENDING') {
      countdownSec = Math.max(0, this.target.restartDelaySec - this.elapsedSecSince(this.stateEnteredAtNs, nowNs))
    } else if (this.state === 'STARTUP_GRACE') {
      countdownSec = Math.max(0, this.target.startupGraceSec - this.elapsedSecSince(this.stateEnteredAtNs, nowNs))
    } else if (this.state === 'STOPPING') {
      countdownSec = Math.max(0, this.target.gracefulTimeoutSec - this.elapsedSecSince(this.stateEnteredAtNs, nowNs))
    }

    const uptimeSec =
      this.pid && this.runningSinceNs ? this.elapsedSecSince(this.runningSinceNs, nowNs) : 0

    return {
      target: this.target,
      state: this.state,
      pid: this.pid,
      detectedWindowTitle: this.detectedWindowTitle || this.target.windowTitle,
      responding: this.responding,
      memoryKb: this.memoryKb,
      uptimeSec,
      countdownSec,
      consecutiveHungCount: this.consecutiveHungCount,
      recentRetryCount: this.retryTimestampsNs.length,
      totalRestartCount: this.totalRestartCount,
      lastStartedAt: this.lastStartedAt,
      lastFailureAt: this.lastFailureAt,
      lastMessage: this.lastMessage
    }
  }
}
