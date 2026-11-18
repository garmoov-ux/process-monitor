import { useCallback, useEffect, useState } from 'react'
import {
  AppConfig,
  HistoryQueryFilter,
  MonitorStateSnapshot,
  ProcessEventRecord,
  ProcessTargetConfig,
  RunningProcessSnapshot
} from '@shared/types/domain'

export function useProcessMonitorState() {
  const [snapshot, setSnapshot] = useState<MonitorStateSnapshot | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev))
    }, 3200)
  }, [])

  useEffect(() => {
    let mounted = true
    window.processMonitorApi
      .getInitialState()
      .then((initial) => {
        if (mounted) {
          setSnapshot(initial)
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) setLoading(false)
      })

    const unsubscribe = window.processMonitorApi.onStateUpdated((next) => {
      if (mounted) {
        setSnapshot(next)
      }
    })

    return () => {
      mounted = false
      unsubscribe()
    }
  }, [])

  const upsertTarget = useCallback(
    async (target: Partial<ProcessTargetConfig>) => {
      try {
        const next = await window.processMonitorApi.upsertTarget(target)
        if (next) setSnapshot(next)
        showToast('감시 대상 프로그램 설정이 저장되었습니다.')
      } catch (err) {
        showToast(`대상 저장 중 오류: ${(err as Error).message}`)
      }
    },
    [showToast]
  )

  const deleteTarget = useCallback(
    async (targetId: string) => {
      try {
        const next = await window.processMonitorApi.deleteTarget(targetId)
        if (next) setSnapshot(next)
        showToast('감시 대상이 삭제되었습니다.')
      } catch (err) {
        showToast(`삭제 중 오류: ${(err as Error).message}`)
      }
    },
    [showToast]
  )

  const toggleTargetEnabled = useCallback(
    async (targetId: string, enabled: boolean) => {
      try {
        const next = await window.processMonitorApi.toggleTargetEnabled(targetId, enabled)
        if (next) setSnapshot(next)
        showToast(enabled ? '개별 감시가 활성화되었습니다.' : '개별 감시가 일시정지되었습니다.')
      } catch (err) {
        showToast(`감시 상태 변경 중 오류: ${(err as Error).message}`)
      }
    },
    [showToast]
  )

  const controlTarget = useCallback(
    async (targetId: string, command: 'START' | 'STOP' | 'RESTART') => {
      try {
        const next = await window.processMonitorApi.controlTarget(targetId, command)
        if (next) setSnapshot(next)
        const label = command === 'START' ? '시작' : command === 'STOP' ? '종료' : '재시작'
        showToast(`프로세스 ${label} 명령을 전송했습니다.`)
      } catch (err) {
        showToast(`제어 명령 오류: ${(err as Error).message}`)
      }
    },
    [showToast]
  )

  const resetCircuitBreaker = useCallback(
    async (targetId: string) => {
      try {
        const next = await window.processMonitorApi.resetCircuitBreaker(targetId)
        if (next) setSnapshot(next)
        showToast('연속 실패 차단이 해제되어 감시를 재개합니다.')
      } catch (err) {
        showToast(`차단 해제 오류: ${(err as Error).message}`)
      }
    },
    [showToast]
  )

  const toggleMaintenanceMode = useCallback(
    async (maintenanceMode: boolean) => {
      try {
        const next = await window.processMonitorApi.toggleMaintenanceMode(maintenanceMode)
        if (next) setSnapshot(next)
        showToast(
          maintenanceMode
            ? '전체 점검 모드가 켜졌습니다. 모든 자동 복구가 일시 보류됩니다.'
            : '전체 점검 모드가 해제되어 실시간 감시를 재개합니다.'
        )
      } catch (err) {
        showToast(`점검 모드 전환 오류: ${(err as Error).message}`)
      }
    },
    [showToast]
  )

  const updateConfig = useCallback(
    async (nextConfig: AppConfig) => {
      try {
        const next = await window.processMonitorApi.updateConfig(nextConfig)
        if (next) setSnapshot(next)
        showToast('환경 설정이 안전하게 저장 및 즉시 반영되었습니다.')
      } catch (err) {
        showToast(`설정 저장 중 오류: ${(err as Error).message}`)
      }
    },
    [showToast]
  )

  const syncNtpNow = useCallback(async () => {
    try {
      const res = await window.processMonitorApi.syncNtpNow()
      if (res?.snapshot) setSnapshot(res.snapshot)
      if (res?.record?.message) showToast(res.record.message)
      return res?.record
    } catch (err) {
      showToast(`시간 동기화 실행 중 오류: ${(err as Error).message}`)
      return null
    }
  }, [showToast])

  const runCleanupNow = useCallback(async () => {
    try {
      if (typeof window.processMonitorApi.runCleanupNow === 'function') {
        const next = await window.processMonitorApi.runCleanupNow()
        if (next) setSnapshot(next)
      } else {
        const initial = await window.processMonitorApi.getInitialState()
        if (initial) setSnapshot(initial)
      }
      showToast('보관 기간이 경과된 오래된 로그 및 이력을 정리했습니다.')
    } catch (err) {
      showToast(`데이터 정리 중 오류: ${(err as Error).message}`)
    }
  }, [showToast])

  const scanRunning = useCallback(async (): Promise<RunningProcessSnapshot[]> => {
    try {
      return await window.processMonitorApi.scanRunningProcesses()
    } catch {
      return []
    }
  }, [])

  const queryEvents = useCallback(async (filter: HistoryQueryFilter): Promise<ProcessEventRecord[]> => {
    try {
      return await window.processMonitorApi.queryEventHistory(filter)
    } catch {
      return []
    }
  }, [])

  return {
    snapshot,
    loading,
    toastMessage,
    showToast,
    upsertTarget,
    deleteTarget,
    toggleTargetEnabled,
    controlTarget,
    resetCircuitBreaker,
    toggleMaintenanceMode,
    updateConfig,
    syncNtpNow,
    runCleanupNow,
    scanRunning,
    queryEvents
  }
}
