import {
  EventSeverity,
  ProcessEventType,
  ProcessTargetConfig
} from '@shared/types/domain'
import { ProcessRepository } from '../db/process-repo'
import {
  forceKillProcessTree,
  requestGracefulStop,
  spawnTargetProcess
} from './process-controller'
import { ProcessStateMachine, StateTransitionAction } from './state-machine'
import { writeProcessLog } from './file-logger'

export function recordTargetEvent(
  processRepo: ProcessRepository,
  target: ProcessTargetConfig,
  eventType: ProcessEventType,
  severity: EventSeverity,
  pid: number | null,
  message: string
): void {
  processRepo.insertEvent({
    targetId: target.id,
    targetName: target.name,
    eventType,
    severity,
    pid,
    message
  })
  writeProcessLog(severity, target.name, eventType, message)
}

export async function executeTransitionAction(params: {
  target: ProcessTargetConfig
  machine: ProcessStateMachine
  action: StateTransitionAction
  processRepo: ProcessRepository
}): Promise<{ restartedDelta: number; hungDelta: number }> {
  const { target, machine, action, processRepo } = params
  let restartedDelta = 0
  let hungDelta = 0

  if (action.type === 'SPAWN') {
    const spawnRes = await spawnTargetProcess(target)
    if (spawnRes.ok) {
      const nowIso = new Date().toISOString()
      machine.markSpawnSuccess(spawnRes.pid, true, nowIso)
      processRepo.incrementRestart(target.id, nowIso)
      restartedDelta = 1
      recordTargetEvent(
        processRepo,
        target,
        'RESTART',
        'INFO',
        spawnRes.pid,
        `${action.reason || '자동 복구 실행'} (프로세스 번호: ${spawnRes.pid ?? '-'})`
      )
    } else {
      machine.markPathInvalid(spawnRes.error || '실행 실패')
      recordTargetEvent(
        processRepo,
        target,
        'PATH_ERROR',
        'ERROR',
        null,
        `실행 실패: ${spawnRes.error || '알 수 없는 오류'}`
      )
    }
  } else if (action.type === 'FORCE_KILL_AND_RESTART' && action.pid) {
    await forceKillProcessTree(action.pid)
    recordTargetEvent(
      processRepo,
      target,
      'FORCE_KILL',
      'WARN',
      action.pid,
      `${action.reason || '응답 없음 감지'}로 강제 종료(하위 트리 포함) 수행`
    )
    const spawnRes = await spawnTargetProcess(target)
    if (spawnRes.ok) {
      const nowIso = new Date().toISOString()
      machine.markSpawnSuccess(spawnRes.pid, true, nowIso)
      processRepo.incrementRestart(target.id, nowIso)
      restartedDelta = 1
      hungDelta = 1
      recordTargetEvent(
        processRepo,
        target,
        'RESTART',
        'INFO',
        spawnRes.pid,
        `강제 종료 후 자동 재기동 완료 (프로세스 번호: ${spawnRes.pid ?? '-'})`
      )
    }
  } else if (action.type === 'FORCE_KILL_ONLY' && action.pid) {
    await forceKillProcessTree(action.pid)
    recordTargetEvent(
      processRepo,
      target,
      'FORCE_KILL',
      'WARN',
      action.pid,
      `${action.reason || '정상 종료 대기 초과'}로 강제 종료 완료`
    )
  }

  return { restartedDelta, hungDelta }
}

export async function executeManualTargetControl(params: {
  target: ProcessTargetConfig
  machine: ProcessStateMachine
  command: 'START' | 'STOP' | 'RESTART'
  processRepo: ProcessRepository
  onDisableTarget: () => Promise<void>
}): Promise<void> {
  const { target, machine, command, processRepo, onDisableTarget } = params

  if (command === 'START') {
    const spawnRes = await spawnTargetProcess(target)
    if (spawnRes.ok) {
      const nowIso = new Date().toISOString()
      machine.markSpawnSuccess(spawnRes.pid, false, nowIso)
      processRepo.recordStarted(target.id, nowIso)
      recordTargetEvent(
        processRepo,
        target,
        'START',
        'INFO',
        spawnRes.pid,
        `수동 실행 완료 (프로세스 번호: ${spawnRes.pid ?? '-'})`
      )
    } else {
      machine.markPathInvalid(spawnRes.error || '실행 실패')
      recordTargetEvent(processRepo, target, 'PATH_ERROR', 'ERROR', null, `수동 실행 실패: ${spawnRes.error}`)
    }
  } else if (command === 'STOP') {
    if (target.enabled) {
      await onDisableTarget()
    }
    const action = machine.requestManualStop(false)
    if (action.type === 'GRACEFUL_STOP' && action.pid) {
      await requestGracefulStop(action.pid)
      recordTargetEvent(
        processRepo,
        target,
        'STOP',
        'INFO',
        action.pid,
        `수동 종료 요청 전송 (정상 종료 대기 ${target.gracefulTimeoutSec}초)`
      )
    }
  } else if (command === 'RESTART') {
    const action = machine.requestManualStop(true)
    if (action.type === 'GRACEFUL_STOP' && action.pid) {
      await requestGracefulStop(action.pid)
      recordTargetEvent(processRepo, target, 'RESTART', 'INFO', action.pid, '수동 재시작 요청 (정상 종료 유도 중)')
    } else if (action.type === 'SPAWN') {
      const spawnRes = await spawnTargetProcess(target)
      if (spawnRes.ok) {
        const nowIso = new Date().toISOString()
        machine.markSpawnSuccess(spawnRes.pid, false, nowIso)
        processRepo.incrementRestart(target.id, nowIso)
        recordTargetEvent(processRepo, target, 'RESTART', 'INFO', spawnRes.pid, '수동 재시작 기동 완료')
      }
    }
  }
}
