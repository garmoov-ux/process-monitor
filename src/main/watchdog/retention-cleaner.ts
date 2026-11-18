import fs from 'fs'
import path from 'path'
import { StorageFolderItem } from '@shared/types/domain'
import { resolveAppPaths } from '../config/app-paths'
import { ProcessRepository } from '../db/process-repo'
import { NtpRepository } from '../db/ntp-repo'
import { writeSystemLog } from './file-logger'

function computeFolderStats(targetPath: string): { fileCount: number; totalBytes: number } {
  try {
    if (!fs.existsSync(targetPath)) return { fileCount: 0, totalBytes: 0 }
    const stat = fs.statSync(targetPath)
    if (stat.isFile()) {
      return { fileCount: 1, totalBytes: stat.size }
    }
    const entries = fs.readdirSync(targetPath)
    let fileCount = 0
    let totalBytes = 0
    for (const entry of entries) {
      const full = path.join(targetPath, entry)
      const s = fs.statSync(full)
      if (s.isFile()) {
        fileCount += 1
        totalBytes += s.size
      }
    }
    return { fileCount, totalBytes }
  } catch {
    return { fileCount: 0, totalBytes: 0 }
  }
}

export function collectStorageInfo(): StorageFolderItem[] {
  const paths = resolveAppPaths()
  const configStats = computeFolderStats(paths.configPath)
  const dataDir = path.dirname(paths.dbPath)
  const dataStats = computeFolderStats(dataDir)
  const logStats = computeFolderStats(paths.logDir)

  return [
    {
      key: 'CONFIG',
      label: '환경 설정 파일',
      description: '감시 대상 프로세스 목록, 타이머 및 다중 시간 서버 설정 파일',
      resolvedPath: paths.configPath,
      fileCount: configStats.fileCount,
      totalBytes: configStats.totalBytes
    },
    {
      key: 'DATA',
      label: '내장 데이터베이스 폴더',
      description: '프로세스 기동/장애 이력, 시간 동기화 기록 및 일별 가동률 통계 저장소',
      resolvedPath: dataDir,
      fileCount: dataStats.fileCount,
      totalBytes: dataStats.totalBytes
    },
    {
      key: 'LOGS',
      label: '일자별 운영 로그 폴더',
      description: '일자별 시스템 로그 및 프로세스 제어 상세 기록 텍스트 파일',
      resolvedPath: paths.logDir,
      fileCount: logStats.fileCount,
      totalBytes: logStats.totalBytes
    }
  ]
}

export function runRetentionCleanup(
  retentionDays: number,
  processRepo: ProcessRepository,
  ntpRepo: NtpRepository
): { deletedRecords: number; deletedLogFiles: number } {
  const safeDays = Math.max(1, retentionDays)
  const cutoffMs = Date.now() - safeDays * 24 * 60 * 60 * 1000
  const cutoffDateObj = new Date(cutoffMs)
  const cutoffIso = cutoffDateObj.toISOString()
  const cutoffDateStr = cutoffIso.slice(0, 10)

  let deletedRecords = 0
  let deletedLogFiles = 0

  try {
    const deletedEvents = processRepo.deleteOlderThan(cutoffIso, cutoffDateStr)
    const deletedNtp = ntpRepo.deleteOlderThan(cutoffIso)
    deletedRecords = deletedEvents + deletedNtp

    const { logDir } = resolveAppPaths()
    if (fs.existsSync(logDir)) {
      const files = fs.readdirSync(logDir)
      for (const file of files) {
        if (!file.endsWith('.log')) continue
        const fullPath = path.join(logDir, file)
        const stat = fs.statSync(fullPath)
        if (stat.mtimeMs < cutoffMs) {
          fs.unlinkSync(fullPath)
          deletedLogFiles += 1
        }
      }
    }

    if (deletedRecords > 0 || deletedLogFiles > 0) {
      writeSystemLog(
        'INFO',
        `보관 기간(${safeDays}일) 경과 데이터 정리 완료: 이력 ${deletedRecords}건, 로그파일 ${deletedLogFiles}개`
      )
    }
  } catch (err) {
    writeSystemLog('WARN', `오래된 로그/이력 정리 중 오류 발생: ${(err as Error).message}`)
  }

  return { deletedRecords, deletedLogFiles }
}
