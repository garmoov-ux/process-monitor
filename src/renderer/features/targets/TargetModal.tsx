import React, { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import {
  ProcessTargetConfig,
  RunningProcessSnapshot
} from '@shared/types/domain'
import { RunningProcessPickerTab } from './RunningProcessPickerTab'
import { TargetFormValues, TargetManualFormTab } from './TargetManualFormTab'

interface TargetModalProps {
  open: boolean
  initialTarget: ProcessTargetConfig | null
  onClose: () => void
  onSave: (target: Partial<ProcessTargetConfig>) => Promise<void>
  onScanRunning: () => Promise<RunningProcessSnapshot[]>
}

const DEFAULT_FORM_VALUES: TargetFormValues = {
  name: '',
  processName: '',
  watchProcessName: '',
  windowTitle: '',
  execPath: '',
  args: '',
  workDir: '',
  windowStyle: 'normal',
  enabled: true,
  restartDelaySec: 5,
  startupGraceSec: 15,
  gracefulTimeoutSec: 5,
  checkNotResponding: true,
  hungThresholdCount: 3,
  maxRetriesInWindow: 5,
  retryWindowSec: 180
}

export const TargetModal: React.FC<TargetModalProps> = ({
  open,
  initialTarget,
  onClose,
  onSave,
  onScanRunning
}) => {
  const [modeTab, setModeTab] = useState<'RUNNING' | 'MANUAL'>('RUNNING')
  const [runningList, setRunningList] = useState<RunningProcessSnapshot[]>([])
  const [scanning, setScanning] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [values, setValues] = useState<TargetFormValues>(DEFAULT_FORM_VALUES)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const refreshRunningList = async (): Promise<void> => {
    setScanning(true)
    try {
      const list = await onScanRunning()
      setRunningList(list)
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setErrorMsg(null)
    if (initialTarget) {
      setModeTab('MANUAL')
      setValues({
        name: initialTarget.name,
        processName: initialTarget.processName,
        watchProcessName: initialTarget.watchProcessName || '',
        windowTitle: initialTarget.windowTitle,
        execPath: initialTarget.execPath,
        args: initialTarget.args,
        workDir: initialTarget.workDir,
        windowStyle: initialTarget.windowStyle,
        enabled: initialTarget.enabled,
        restartDelaySec: initialTarget.restartDelaySec,
        startupGraceSec: initialTarget.startupGraceSec,
        gracefulTimeoutSec: initialTarget.gracefulTimeoutSec,
        checkNotResponding: initialTarget.checkNotResponding,
        hungThresholdCount: initialTarget.hungThresholdCount,
        maxRetriesInWindow: initialTarget.maxRetriesInWindow,
        retryWindowSec: initialTarget.retryWindowSec
      })
    } else {
      setModeTab('RUNNING')
      setValues(DEFAULT_FORM_VALUES)
      void refreshRunningList()
    }
  }, [open, initialTarget])

  const filteredRunning = useMemo(() => {
    if (!searchQuery.trim()) return runningList
    const q = searchQuery.trim().toLowerCase()
    return runningList.filter(
      (item) =>
        item.processName.toLowerCase().includes(q) ||
        item.windowTitle.toLowerCase().includes(q) ||
        item.execPath.toLowerCase().includes(q)
    )
  }, [runningList, searchQuery])

  if (!open) return null

  const updateField = <K extends keyof TargetFormValues>(
    key: K,
    val: TargetFormValues[K]
  ): void => {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  const handleSelectRunning = (proc: RunningProcessSnapshot): void => {
    let workDir = ''
    if (proc.execPath) {
      const lastSlash = Math.max(proc.execPath.lastIndexOf('\\'), proc.execPath.lastIndexOf('/'))
      if (lastSlash > 0) workDir = proc.execPath.slice(0, lastSlash)
    }
    setValues((prev) => ({
      ...prev,
      name: proc.windowTitle || proc.processName.replace(/\.exe$/i, ''),
      processName: proc.processName,
      windowTitle: proc.windowTitle,
      execPath: proc.execPath || prev.execPath,
      workDir: workDir || prev.workDir
    }))
    setModeTab('MANUAL')
  }

  const handlePickExe = async (): Promise<void> => {
    const picked = await window.processMonitorApi.pickExecutableFile()
    if (!picked) return
    setValues((prev) => ({
      ...prev,
      execPath: picked.execPath,
      processName: picked.processName,
      workDir: picked.workDir,
      name: prev.name.trim() ? prev.name : picked.processName.replace(/\.exe$/i, '')
    }))
  }

  const handlePickWorkDir = async (): Promise<void> => {
    const dir = await window.processMonitorApi.pickDirectory()
    if (dir) updateField('workDir', dir)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!values.execPath.trim()) {
      setErrorMsg('실행 파일(.exe) 전체 경로를 지정해 주세요.')
      return
    }
    await onSave({
      id: initialTarget?.id,
      ...values,
      name: values.name.trim() || values.processName.trim(),
      watchProcessName: values.watchProcessName.trim() || undefined
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-[#1e293b] rounded-[12px] w-full max-w-[740px] max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        <header className="px-4 py-3 border-b border-[#1e293b] flex items-center justify-between bg-[#090d16]">
          <div>
            <h3 className="text-[14px] font-semibold text-slate-100">
              {initialTarget ? '감시 프로세스 설정 편집' : '새 감시 대상 프로세스 등록'}
            </h3>
            <p className="text-[11px] text-slate-400">
              실행 중인 윈도우/프로세스를 선택하거나 직접 실행 파일(.exe) 경로와 개별 타이머를 지정합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-[6px] bg-[#111827] hover:bg-[#1e293b] border border-[#1e293b] flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </header>

        <div className="px-4 pt-3 shrink-0">
          <div className="inline-flex p-0.5 rounded-[8px] bg-[#090d16] border border-[#1e293b]">
            <button
              type="button"
              onClick={() => {
                setModeTab('RUNNING')
                if (runningList.length === 0) void refreshRunningList()
              }}
              className={`h-[26px] px-3 rounded-[6px] text-[11.5px] font-medium whitespace-nowrap cursor-pointer ${
                modeTab === 'RUNNING' ? 'bg-[#2563eb] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. 실행 중인 프로세스 선택
            </button>
            <button
              type="button"
              onClick={() => setModeTab('MANUAL')}
              className={`h-[26px] px-3 rounded-[6px] text-[11.5px] font-medium whitespace-nowrap cursor-pointer ${
                modeTab === 'MANUAL' ? 'bg-[#2563eb] text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2. 수동 파일 지정 및 타이머 설정
            </button>
          </div>
        </div>

        {modeTab === 'RUNNING' ? (
          <RunningProcessPickerTab
            runningList={filteredRunning}
            scanning={scanning}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={() => void refreshRunningList()}
            onSelectProcess={handleSelectRunning}
          />
        ) : (
          <TargetManualFormTab
            values={values}
            errorMsg={errorMsg}
            onChange={updateField}
            onPickExe={() => void handlePickExe()}
            onPickWorkDir={() => void handlePickWorkDir()}
            onCancel={onClose}
            onSubmit={(e) => void handleSubmit(e)}
          />
        )}
      </div>
    </div>
  )
}
