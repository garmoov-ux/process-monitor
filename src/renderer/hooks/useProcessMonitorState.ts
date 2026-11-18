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
      const next = await window.processMonitorApi.upsertTarget(target)
      setSnapshot(next)
      showToast('감시 대상 프로그램 설정이 저장되었습니다.')
    },
    [showToast]
  )

  const deleteTarget = useCallback(
    async (targetId: string) => {
      const next = await window.processMonitorApi.deleteTarget(targetId)
      setSnapshot(next)
      showToast('감시 대상이 삭제되었습니다.')
    },
    [showToast]
  )

  const toggleTargetEnabled = useCallback(
    async (targetId: string, enabled: boolean) => {
      const next = await window.processMonitorApi.toggleTargetEnabled(targetId, enabled)
      setSnapshot(next)
      showToast(enabled ? '개별 감시가 활성화되었습니다.' : '개별 감시가 일시정지되었습니다.')
    },
    [showToast]
  )

  const controlTarget = useCallback(
    async (targetId: string, command: 'START' | 'STOP' | 'RESTART') => {
      const next = await window.processMonitorApi.controlTarget(targetId, command)
      setSnapshot(next)
      const label = command === 'START' ? '시작' : command === 'STOP' ? '종료' : '재시작'
      showToast(`프로세스 ${label} 명령을 전송했습니다.`)
    },
    [showToast]
  )

  const resetCircuitBreaker = useCallback(
    async (targetId: string) => {
      const next = await window.processMonitorApi.resetCircuitBreaker(targetId)
      setSnapshot(next)
      showToast('연속 실패 차단이 해제되어 감시를 재개합니다.')
    },
    [showToast]
  )

  const toggleMaintenanceMode = useCallback(
    async (maintenanceMode: boolean) => {
      const next = await window.processMonitorApi.toggleMaintenanceMode(maintenanceMode)
      setSnapshot(next)
      showToast(
        maintenanceMode
          ? '전체 점검 모드가 켜졌습니다. 모든 자동 복구가 일시 보류됩니다.'
          : '전체 점검 모드가 해제되어 실시간 감시를 재개합니다.'
      )
    },
    [showToast]
  )

  const updateConfig = useCallback(
    async (nextConfig: AppConfig) => {
      const next = await window.processMonitorApi.updateConfig(nextConfig)
      setSnapshot(next)
      showToast('환경 설정이 원자적으로 저장 및 반영되었습니다.')
    },
    [showToast]
  )

  const syncNtpNow = useCallback(async () => {
    const res = await window.processMonitorApi.syncNtpNow()
    setSnapshot(res.snapshot)
    showToast(res.record.message)
    return res.record
  }, [showToast])

  const runCleanupNow = useCallback(async () => {
    const next = await window.processMonitorApi.runCleanupNow()
    setSnapshot(next)
    showToast('보관 기간이 경과된 오래된 로그 및 이력을 정리했습니다.')
  }, [showToast])

  const scanRunning = useCallback(async (): Promise<RunningProcessSnapshot[]> => {
    return window.processMonitorApi.scanRunningProcesses()
  }, [])

  const queryEvents = useCallback(async (filter: HistoryQueryFilter): Promise<ProcessEventRecord[]> => {
    return window.processMonitorApi.queryEventHistory(filter)
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
