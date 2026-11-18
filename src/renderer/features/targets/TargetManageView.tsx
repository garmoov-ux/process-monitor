import React, { useEffect, useMemo, useState } from 'react'
import { Check, RefreshCw, Trash2 } from 'lucide-react'
import {
  ProcessRuntimeStatus,
  ProcessTargetConfig,
  RunningProcessSnapshot
} from '@shared/types/domain'
import { OptionChip } from '../../components/ui/OptionChip'
import { PillButton } from '../../components/ui/PillButton'
import { SearchInput } from '../../components/ui/SearchInput'
import { TargetFormCard } from './TargetFormCard'
import { TargetFormValues } from './TargetManualFormTab'

interface TargetManageViewProps {
  processes: ProcessRuntimeStatus[]
  initialEditTarget: ProcessTargetConfig | null
  onClearInitialEdit: () => void
  onSaveTarget: (target: Partial<ProcessTargetConfig>) => Promise<void>
  onDeleteTarget: (targetId: string) => Promise<void>
  onScanRunning: () => Promise<RunningProcessSnapshot[]>
}

const DEFAULT_VALUES: TargetFormValues = {
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

export const TargetManageView: React.FC<TargetManageViewProps> = ({
  processes,
  initialEditTarget,
  onClearInitialEdit,
  onSaveTarget,
  onDeleteTarget,
  onScanRunning
}) => {
  const [rightMode, setRightMode] = useState<'RUNNING' | 'REGISTERED'>('RUNNING')
  const [onlyWindowed, setOnlyWindowed] = useState<boolean>(true)
  const [runningList, setRunningList] = useState<RunningProcessSnapshot[]>([])
  const [scanning, setScanning] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [values, setValues] = useState<TargetFormValues>(DEFAULT_VALUES)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const refreshRunning = async (): Promise<void> => {
    setScanning(true)
    try {
      const list = await onScanRunning()
      setRunningList(list)
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    void refreshRunning()
  }, [])

  useEffect(() => {
    if (initialEditTarget) {
      loadTargetIntoForm(initialEditTarget)
      onClearInitialEdit()
    }
  }, [initialEditTarget])

  const loadTargetIntoForm = (t: ProcessTargetConfig): void => {
    setEditingId(t.id)
    setErrorMsg(null)
    setValues({
      name: t.name,
      processName: t.processName,
      watchProcessName: t.watchProcessName || '',
      windowTitle: t.windowTitle,
      execPath: t.execPath,
      args: t.args,
      workDir: t.workDir,
      windowStyle: t.windowStyle,
      enabled: t.enabled,
      restartDelaySec: t.restartDelaySec,
      startupGraceSec: t.startupGraceSec,
      gracefulTimeoutSec: t.gracefulTimeoutSec,
      checkNotResponding: t.checkNotResponding,
      hungThresholdCount: t.hungThresholdCount,
      maxRetriesInWindow: t.maxRetriesInWindow,
      retryWindowSec: t.retryWindowSec
    })
  }

  const handleResetNew = (): void => {
    setEditingId(null)
    setErrorMsg(null)
    setValues(DEFAULT_VALUES)
  }

  const updateField = <K extends keyof TargetFormValues>(
    key: K,
    val: TargetFormValues[K]
  ): void => {
    setValues((prev) => ({ ...prev, [key]: val }))
  }

  const handleSelectRunning = (proc: RunningProcessSnapshot): void => {
    setErrorMsg(null)
    let workDir = ''
    if (proc.execPath) {
      const idx = Math.max(proc.execPath.lastIndexOf('\\'), proc.execPath.lastIndexOf('/'))
      if (idx > 0) workDir = proc.execPath.slice(0, idx)
    }
    setEditingId(null)
    setValues((prev) => ({
      ...prev,
      name: proc.windowTitle || proc.processName.replace(/\.exe$/i, ''),
      processName: proc.processName,
      windowTitle: proc.windowTitle,
      execPath: proc.execPath || prev.execPath,
      workDir: workDir || prev.workDir
    }))
  }

  const handlePickExe = async (): Promise<void> => {
    const picked = await window.processMonitorApi.pickExecutableFile()
    if (!picked) return
    setErrorMsg(null)
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
      setErrorMsg('실행 파일 경로를 선택하거나 입력해 주세요.')
      return
    }
    await onSaveTarget({
      id: editingId || undefined,
      ...values,
      name: values.name.trim() || values.processName.trim(),
      watchProcessName: values.watchProcessName.trim() || undefined
    })
    if (!editingId) {
      handleResetNew()
    }
  }

  const registeredPaths = useMemo(
    () => new Set(processes.map((p) => p.target.execPath.toLowerCase())),
    [processes]
  )

  const filteredRunning = useMemo(() => {
    return runningList.filter((item) => {
      if (onlyWindowed && !item.windowTitle.trim()) return false
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        return (
          item.processName.toLowerCase().includes(q) ||
          item.windowTitle.toLowerCase().includes(q) ||
          item.execPath.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [runningList, onlyWindowed, search])

  const filteredRegistered = useMemo(() => {
    if (!search.trim()) return processes
    const q = search.trim().toLowerCase()
    return processes.filter(
      (p) =>
        p.target.name.toLowerCase().includes(q) ||
        p.target.processName.toLowerCase().includes(q) ||
        p.target.execPath.toLowerCase().includes(q)
    )
  }, [processes, search])

  return (
    <div className="flex-1 min-h-0 grid grid-cols-12 gap-2.5">
      {/* 좌측 5칸: 감시 대상 등록/수정 입력 폼 */}
      <div className="col-span-5 min-h-0 flex flex-col">
        <TargetFormCard
          values={values}
          editingId={editingId}
          errorMsg={errorMsg}
          onChange={updateField}
          onPickExe={() => void handlePickExe()}
          onPickWorkDir={() => void handlePickWorkDir()}
          onResetNew={handleResetNew}
          onSubmit={(e) => void handleSubmit(e)}
        />
      </div>

      {/* 우측 7칸: 실행 중 프로세스 원클릭 불러오기 & 등록 대상 목록 (창 잘림 없는 고정 비율 테이블) */}
      <section className="col-span-7 bg-[#111827] border border-[#1e293b] rounded-[10px] p-3 flex flex-col min-h-0">
        <header className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <div className="inline-flex p-0.5 rounded-[7px] bg-[#090d16] border border-[#1e293b]">
            <button
              type="button"
              onClick={() => setRightMode('RUNNING')}
              className={`h-[25px] px-2.5 rounded-[5px] text-[11.5px] font-medium whitespace-nowrap cursor-pointer ${
                rightMode === 'RUNNING'
                  ? 'bg-[#2563eb] text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              실행 중인 프로그램 선택 ({filteredRunning.length})
            </button>
            <button
              type="button"
              onClick={() => setRightMode('REGISTERED')}
              className={`h-[25px] px-2.5 rounded-[5px] text-[11.5px] font-medium whitespace-nowrap cursor-pointer ${
                rightMode === 'REGISTERED'
                  ? 'bg-[#2563eb] text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              등록된 감시 목록 ({processes.length})
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {rightMode === 'RUNNING' && (
              <>
                <OptionChip
                  label={onlyWindowed ? '창 있는 프로그램만' : '전체 프로세스'}
                  selected={onlyWindowed}
                  onClick={() => setOnlyWindowed(!onlyWindowed)}
                />
                <PillButton
                  variant="pearl-capsule"
                  size="sm"
                  onClick={() => void refreshRunning()}
                >
                  <RefreshCw className={`w-3 h-3 text-[#38bdf8] ${scanning ? 'animate-spin' : ''}`} />
                  <span>새로고침</span>
                </PillButton>
              </>
            )}
          </div>
        </header>

        <div className="mb-2 shrink-0">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={
              rightMode === 'RUNNING'
                ? '실행 중인 프로그램 이름, 창 제목, 경로 검색 (행 클릭 시 좌측에 자동 입력)...'
                : '등록된 감시 대상 검색 (행 클릭 시 좌측에서 수정)...'
            }
            className="w-full"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto border border-[#1e293b] rounded-[8px] bg-[#0b0f19]/70">
          {rightMode === 'RUNNING' ? (
            <table className="w-full table-fixed text-left border-collapse text-[11.5px]">
              <thead className="sticky top-0 bg-[#111827] border-b border-[#1e293b] text-slate-300 z-10">
                <tr>
                  <th className="w-[32%] py-2 px-2.5 font-semibold whitespace-nowrap">프로세스명 (번호)</th>
                  <th className="w-[28%] py-2 px-2.5 font-semibold whitespace-nowrap">창 제목</th>
                  <th className="w-[26%] py-2 px-2.5 font-semibold whitespace-nowrap">실행 경로</th>
                  <th className="w-[14%] py-2 px-2.5 font-semibold whitespace-nowrap text-right">선택</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/70">
                {filteredRunning.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      조회된 실행 중 프로그램이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRunning.map((proc) => {
                    const already =
                      proc.execPath && registeredPaths.has(proc.execPath.toLowerCase())
                    return (
                      <tr
                        key={proc.pid}
                        onClick={() => handleSelectRunning(proc)}
                        className="hover:bg-[#1e293b]/60 cursor-pointer transition-colors"
                      >
                        <td className="py-1.5 px-2.5 truncate font-semibold text-slate-100" title={proc.processName}>
                          {proc.processName}{' '}
                          <span className="text-slate-500 font-normal">({proc.pid})</span>
                        </td>
                        <td className="py-1.5 px-2.5 truncate text-[#38bdf8]" title={proc.windowTitle}>
                          {proc.windowTitle || '-'}
                        </td>
                        <td className="py-1.5 px-2.5 truncate text-slate-400" title={proc.execPath}>
                          {proc.execPath || '권한 제한 경로'}
                        </td>
                        <td className="py-1.5 px-2.5 text-right whitespace-nowrap">
                          {already ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-[5px] bg-emerald-500/15 text-[#34d399] text-[10px] font-semibold">
                              <Check className="w-3 h-3" />
                              등록됨
                            </span>
                          ) : (
                            <PillButton
                              type="button"
                              variant="primary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSelectRunning(proc)
                              }}
                            >
                              불러오기
                            </PillButton>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full table-fixed text-left border-collapse text-[11.5px]">
              <thead className="sticky top-0 bg-[#111827] border-b border-[#1e293b] text-slate-300 z-10">
                <tr>
                  <th className="w-[28%] py-2 px-2.5 font-semibold whitespace-nowrap">프로그램 이름</th>
                  <th className="w-[24%] py-2 px-2.5 font-semibold whitespace-nowrap">프로세스명</th>
                  <th className="w-[34%] py-2 px-2.5 font-semibold whitespace-nowrap">실행 파일 경로</th>
                  <th className="w-[14%] py-2 px-2.5 font-semibold whitespace-nowrap text-right">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/70">
                {filteredRegistered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      등록된 감시 대상이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredRegistered.map((item) => {
                    const selected = editingId === item.target.id
                    return (
                      <tr
                        key={item.target.id}
                        onClick={() => loadTargetIntoForm(item.target)}
                        className={`cursor-pointer transition-colors ${
                          selected ? 'bg-[#2563eb]/20' : 'hover:bg-[#1e293b]/50'
                        }`}
                      >
                        <td className="py-2 px-2.5 truncate font-semibold text-slate-100">
                          {item.target.name}
                        </td>
                        <td className="py-2 px-2.5 truncate text-slate-300">
                          {item.target.processName}
                        </td>
                        <td className="py-2 px-2.5 truncate text-slate-400" title={item.target.execPath}>
                          {item.target.execPath}
                        </td>
                        <td
                          className="py-2 px-2.5 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => void onDeleteTarget(item.target.id)}
                            className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                            title="삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
