import React, { useEffect, useMemo, useState } from 'react'
import { FolderSearch, RefreshCw, X } from 'lucide-react'
import {
  ProcessTargetConfig,
  RunningProcessSnapshot,
  WindowStyleOption
} from '@shared/types/domain'
import { PillButton } from '../../components/ui/PillButton'
import { SearchInput } from '../../components/ui/SearchInput'

interface TargetModalProps {
  open: boolean
  initialTarget: ProcessTargetConfig | null
  onClose: () => void
  onSave: (target: Partial<ProcessTargetConfig>) => Promise<void>
  onScanRunning: () => Promise<RunningProcessSnapshot[]>
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

  const [name, setName] = useState('')
  const [processName, setProcessName] = useState('')
  const [watchProcessName, setWatchProcessName] = useState('')
  const [windowTitle, setWindowTitle] = useState('')
  const [execPath, setExecPath] = useState('')
  const [args, setArgs] = useState('')
  const [workDir, setWorkDir] = useState('')
  const [windowStyle, setWindowStyle] = useState<WindowStyleOption>('normal')
  const [enabled, setEnabled] = useState(true)
  const [restartDelaySec, setRestartDelaySec] = useState(5)
  const [startupGraceSec, setStartupGraceSec] = useState(15)
  const [gracefulTimeoutSec, setGracefulTimeoutSec] = useState(5)
  const [checkNotResponding, setCheckNotResponding] = useState(true)
  const [hungThresholdCount, setHungThresholdCount] = useState(3)
  const [maxRetriesInWindow, setMaxRetriesInWindow] = useState(5)
  const [retryWindowSec, setRetryWindowSec] = useState(180)
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
      setName(initialTarget.name)
      setProcessName(initialTarget.processName)
      setWatchProcessName(initialTarget.watchProcessName || '')
      setWindowTitle(initialTarget.windowTitle)
      setExecPath(initialTarget.execPath)
      setArgs(initialTarget.args)
      setWorkDir(initialTarget.workDir)
      setWindowStyle(initialTarget.windowStyle)
      setEnabled(initialTarget.enabled)
      setRestartDelaySec(initialTarget.restartDelaySec)
      setStartupGraceSec(initialTarget.startupGraceSec)
      setGracefulTimeoutSec(initialTarget.gracefulTimeoutSec)
      setCheckNotResponding(initialTarget.checkNotResponding)
      setHungThresholdCount(initialTarget.hungThresholdCount)
      setMaxRetriesInWindow(initialTarget.maxRetriesInWindow)
      setRetryWindowSec(initialTarget.retryWindowSec)
    } else {
      setModeTab('RUNNING')
      setName('')
      setProcessName('')
      setWatchProcessName('')
      setWindowTitle('')
      setExecPath('')
      setArgs('')
      setWorkDir('')
      setWindowStyle('normal')
      setEnabled(true)
      setRestartDelaySec(5)
      setStartupGraceSec(15)
      setGracefulTimeoutSec(5)
      setCheckNotResponding(true)
      setHungThresholdCount(3)
      setMaxRetriesInWindow(5)
      setRetryWindowSec(180)
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

  const handleSelectRunning = (proc: RunningProcessSnapshot): void => {
    setName(proc.windowTitle || proc.processName.replace(/\.exe$/i, ''))
    setProcessName(proc.processName)
    setWindowTitle(proc.windowTitle)
    if (proc.execPath) {
      setExecPath(proc.execPath)
      const lastSlash = Math.max(proc.execPath.lastIndexOf('\\'), proc.execPath.lastIndexOf('/'))
      if (lastSlash > 0) {
        setWorkDir(proc.execPath.slice(0, lastSlash))
      }
    }
    setModeTab('MANUAL')
  }

  const handlePickExe = async (): Promise<void> => {
    const picked = await window.processMonitorApi.pickExecutableFile()
    if (!picked) return
    setExecPath(picked.execPath)
    setProcessName(picked.processName)
    setWorkDir(picked.workDir)
    if (!name.trim()) {
      setName(picked.processName.replace(/\.exe$/i, ''))
    }
  }

  const handlePickWorkDir = async (): Promise<void> => {
    const dir = await window.processMonitorApi.pickDirectory()
    if (dir) setWorkDir(dir)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!execPath.trim()) {
      setErrorMsg('실행 파일(.exe) 전체 경로를 지정해 주세요.')
      return
    }
    await onSave({
      id: initialTarget?.id,
      name: name.trim() || processName.trim(),
      processName: processName.trim(),
      watchProcessName: watchProcessName.trim() || undefined,
      windowTitle: windowTitle.trim(),
      execPath: execPath.trim(),
      args: args.trim(),
      workDir: workDir.trim(),
      windowStyle,
      enabled,
      restartDelaySec,
      startupGraceSec,
      gracefulTimeoutSec,
      checkNotResponding,
      hungThresholdCount,
      maxRetriesInWindow,
      retryWindowSec
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-6">
      <div className="bg-[#ffffff] border border-[#e0e0e0] rounded-[18px] w-full max-w-[820px] max-h-[86vh] flex flex-col overflow-hidden">
        <header className="px-6 py-4 border-b border-[#e0e0e0] flex items-center justify-between bg-[#f5f5f7]">
          <div>
            <h3 className="text-[16px] font-semibold text-[#1d1d1f]">
              {initialTarget ? '감시 대상 프로세스 설정 편집' : '새 감시 대상 프로세스 등록'}
            </h3>
            <p className="text-[12px] text-[#7a7a7a]">
              실행 중인 윈도우/프로세스를 선택하거나 직접 실행 파일(.exe) 경로와 개별 타이머를 지정합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#ffffff] border border-[#e0e0e0] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4 text-[#1d1d1f]" />
          </button>
        </header>

        {/* 상단 세그먼트 탭 */}
        <div className="px-6 pt-4 shrink-0">
          <div className="inline-flex p-1 rounded-[10px] bg-[#e8e8ed]">
            <button
              type="button"
              onClick={() => {
                setModeTab('RUNNING')
                if (runningList.length === 0) void refreshRunningList()
              }}
              className={`h-[30px] px-4 rounded-[8px] text-[12.5px] font-medium whitespace-nowrap cursor-pointer ${
                modeTab === 'RUNNING' ? 'bg-[#0066cc] text-white' : 'text-[#1d1d1f]'
              }`}
            >
              1. 실행 중인 프로세스 선택
            </button>
            <button
              type="button"
              onClick={() => setModeTab('MANUAL')}
              className={`h-[30px] px-4 rounded-[8px] text-[12.5px] font-medium whitespace-nowrap cursor-pointer ${
                modeTab === 'MANUAL' ? 'bg-[#0066cc] text-white' : 'text-[#1d1d1f]'
              }`}
            >
              2. 수동 파일 지정 및 타이머 상세 설정
            </button>
          </div>
        </div>

        {modeTab === 'RUNNING' ? (
          <div className="flex-1 min-h-0 flex flex-col px-6 py-4 gap-3">
            <div className="flex items-center justify-between gap-2">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="실행 중인 프로세스명, 창 타이틀, 경로 검색..."
                className="flex-1"
              />
              <PillButton
                variant="pearl-capsule"
                size="sm"
                onClick={() => void refreshRunningList()}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                <span>목록 새로고침</span>
              </PillButton>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto border border-[#e0e0e0] rounded-[12px]">
              <table className="w-full text-left border-collapse text-[12px]">
                <thead className="sticky top-0 bg-[#f5f5f7] border-b border-[#e0e0e0]">
                  <tr>
                    <th className="py-2 px-3 font-semibold whitespace-nowrap">프로세스명 (번호)</th>
                    <th className="py-2 px-3 font-semibold whitespace-nowrap">창 타이틀</th>
                    <th className="py-2 px-3 font-semibold whitespace-nowrap">실행 파일 경로</th>
                    <th className="py-2 px-3 font-semibold whitespace-nowrap text-right">선택</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {filteredRunning.map((proc) => (
                    <tr key={proc.pid} className="hover:bg-[#fafafc]">
                      <td className="py-2 px-3 whitespace-nowrap font-medium text-[#1d1d1f]">
                        {proc.processName} <span className="text-[#7a7a7a]">({proc.pid})</span>
                      </td>
                      <td className="py-2 px-3 max-w-[200px] truncate text-[#1d1d1f]">
                        {proc.windowTitle || '-'}
                      </td>
                      <td className="py-2 px-3 max-w-[280px] truncate text-[#7a7a7a]" title={proc.execPath}>
                        {proc.execPath || '권한 제한 또는 시스템 프로세스'}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap">
                        <PillButton
                          variant="primary"
                          size="sm"
                          onClick={() => handleSelectRunning(proc)}
                        >
                          불러오기
                        </PillButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-[10px] bg-rose-50 border border-rose-200 text-rose-700 text-[12.5px]">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
                  프로그램 표시 이름
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 메인 제어 프로그램"
                  className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
                  기본 프로세스명 (Primary Key 보조)
                </label>
                <input
                  type="text"
                  value={processName}
                  onChange={(e) => setProcessName(e.target.value)}
                  placeholder="예: MainController.exe"
                  className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
                실행 파일 전체 경로 (.exe) [필수 식별자]
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={execPath}
                  onChange={(e) => setExecPath(e.target.value)}
                  placeholder="C:\App\Controller\MainController.exe"
                  className="flex-1 h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px]"
                />
                <PillButton type="button" variant="pearl-capsule" size="sm" onClick={() => void handlePickExe()}>
                  <FolderSearch className="w-3.5 h-3.5 text-[#0066cc]" />
                  <span>파일 찾아보기</span>
                </PillButton>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
                  실행 옵션 (Arguments)
                </label>
                <input
                  type="text"
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  placeholder="예: --mode=production"
                  className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
                  작업 폴더 (Working Directory)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={workDir}
                    onChange={(e) => setWorkDir(e.target.value)}
                    placeholder="C:\App\Controller"
                    className="flex-1 h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px]"
                  />
                  <PillButton
                    type="button"
                    variant="pearl-capsule"
                    size="sm"
                    onClick={() => void handlePickWorkDir()}
                  >
                    폴더 선택
                  </PillButton>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
                  창 타이틀 (UI 보조 표시용)
                </label>
                <input
                  type="text"
                  value={windowTitle}
                  onChange={(e) => setWindowTitle(e.target.value)}
                  placeholder="예: MainController v1.0"
                  className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
                  런처 감시 대상 프로세스명 (선택)
                </label>
                <input
                  type="text"
                  value={watchProcessName}
                  onChange={(e) => setWatchProcessName(e.target.value)}
                  placeholder="런처 사용 시 실제 프로세스명"
                  className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#1d1d1f] mb-1">
                  실행 시 창 표시 모드
                </label>
                <select
                  value={windowStyle}
                  onChange={(e) => setWindowStyle(e.target.value as WindowStyleOption)}
                  className="w-full h-[34px] px-3 rounded-[10px] border border-[#e0e0e0] text-[13px] bg-white"
                >
                  <option value="normal">기본 창으로 실행</option>
                  <option value="minimized">최소화 상태로 실행</option>
                  <option value="hidden">백그라운드 숨김 실행</option>
                </select>
              </div>
            </div>

            <div className="p-3.5 rounded-[14px] bg-[#f5f5f7] border border-[#e0e0e0] grid grid-cols-4 gap-3">
              <div>
                <label className="block text-[11.5px] font-semibold text-[#1d1d1f] mb-1 whitespace-nowrap">
                  재시작 대기 시간(초)
                </label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={restartDelaySec}
                  onChange={(e) => setRestartDelaySec(Number(e.target.value))}
                  className="w-full h-[32px] px-2.5 rounded-[8px] border border-[#e0e0e0] bg-white text-[12.5px]"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-semibold text-[#1d1d1f] mb-1 whitespace-nowrap">
                  초기 구동 유예 시간(초)
                </label>
                <input
                  type="number"
                  min={1}
                  max={600}
                  value={startupGraceSec}
                  onChange={(e) => setStartupGraceSec(Number(e.target.value))}
                  className="w-full h-[32px] px-2.5 rounded-[8px] border border-[#e0e0e0] bg-white text-[12.5px]"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-semibold text-[#1d1d1f] mb-1 whitespace-nowrap">
                  정상 종료 유예 시간(초)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={gracefulTimeoutSec}
                  onChange={(e) => setGracefulTimeoutSec(Number(e.target.value))}
                  className="w-full h-[32px] px-2.5 rounded-[8px] border border-[#e0e0e0] bg-white text-[12.5px]"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-semibold text-[#1d1d1f] mb-1 whitespace-nowrap">
                  응답 없음 연속 감지 횟수
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={hungThresholdCount}
                  onChange={(e) => setHungThresholdCount(Number(e.target.value))}
                  className="w-full h-[32px] px-2.5 rounded-[8px] border border-[#e0e0e0] bg-white text-[12.5px]"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-[14px] bg-[#f5f5f7] border border-[#e0e0e0] grid grid-cols-3 gap-3 items-center">
              <div>
                <label className="block text-[11.5px] font-semibold text-[#1d1d1f] mb-1 whitespace-nowrap">
                  연속 실패 판정 시간 창(초)
                </label>
                <input
                  type="number"
                  min={10}
                  max={3600}
                  value={retryWindowSec}
                  onChange={(e) => setRetryWindowSec(Number(e.target.value))}
                  className="w-full h-[32px] px-2.5 rounded-[8px] border border-[#e0e0e0] bg-white text-[12.5px]"
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-semibold text-[#1d1d1f] mb-1 whitespace-nowrap">
                  시간 창 내 최대 허용 재시작(회)
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={maxRetriesInWindow}
                  onChange={(e) => setMaxRetriesInWindow(Number(e.target.value))}
                  className="w-full h-[32px] px-2.5 rounded-[8px] border border-[#e0e0e0] bg-white text-[12.5px]"
                />
              </div>
              <div className="flex flex-col gap-1.5 pt-2">
                <label className="inline-flex items-center gap-2 text-[12px] text-[#1d1d1f] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkNotResponding}
                    onChange={(e) => setCheckNotResponding(e.target.checked)}
                    className="accent-[#0066cc]"
                  />
                  <span>응답 없음(멈춤) 감지 시 강제 재시작</span>
                </label>
                <label className="inline-flex items-center gap-2 text-[12px] text-[#1d1d1f] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="accent-[#0066cc]"
                  />
                  <span>저장 즉시 자동 감시 활성화</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e0e0e0]">
              <PillButton type="button" variant="pearl-capsule" onClick={onClose}>
                취소
              </PillButton>
              <PillButton type="submit" variant="primary">
                감시 대상 저장하기
              </PillButton>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
