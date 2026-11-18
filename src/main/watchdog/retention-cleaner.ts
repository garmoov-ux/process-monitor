import fs from 'fs'
import path from 'path'
import { resolveAppPaths } from '../config/app-paths'
import { ProcessRepository } from '../db/process-repo'
import { NtpRepository } from '../db/ntp-repo'
import { writeSystemLog } from './file-logger'

export function runRetentionCleanup(
  retentionDays: number,
  processRepo: ProcessRepository,
  ntpRepo: NtpRepository
): void {
  const safeDays = Math.max(1, retentionDays)
  const cutoffMs = Date.now() - safeDays * 24 * 60 * 60 * 1000
  const cutoffDateObj = new Date(cutoffMs)
  const cutoffIso = cutoffDateObj.toISOString()
  const cutoffDateStr = cutoffIso.slice(0, 10)

  try {
    const deletedEvents = processRepo.deleteOlderThan(cutoffIso, cutoffDateStr)
    const deletedNtp = ntpRepo.deleteOlderThan(cutoffIso)

    const { logDir } = resolveAppPaths()
    let deletedLogFiles = 0
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

    if (deletedEvents > 0 || deletedNtp > 0 || deletedLogFiles > 0) {
      writeSystemLog(
        'INFO',
        `보관 기간(${safeDays}일) 경과 데이터 정리 완료: 이벤트/통계 ${deletedEvents}건, 시간동기화 ${deletedNtp}건, 로그파일 ${deletedLogFiles}개`
      )
    }
  } catch (err) {
    writeSystemLog('WARN', `오래된 로그/이력 정리 중 오류 발생: ${(err as Error).message}`)
  }
}
