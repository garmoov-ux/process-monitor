import fs from 'fs'
import path from 'path'
import { resolveAppPaths } from '../config/app-paths'

function getDateStamp(date = new Date()): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

function getTimeStamp(date = new Date()): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  const ss = String(date.getSeconds()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

export function writeSystemLog(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
  try {
    const { logDir } = resolveAppPaths()
    const now = new Date()
    const filePath = path.join(logDir, `${getDateStamp(now)}_system.log`)
    const line = `[${getTimeStamp(now)}] [${level}] ${message}\n`
    fs.appendFileSync(filePath, line, 'utf-8')
  } catch {
    // 파일 로깅 실패 시 메인 루프 중단 방지
  }
}

export function writeProcessLog(
  level: 'INFO' | 'WARN' | 'ERROR',
  targetName: string,
  eventType: string,
  message: string
): void {
  try {
    const { logDir } = resolveAppPaths()
    const now = new Date()
    const filePath = path.join(logDir, `${getDateStamp(now)}_process.log`)
    const line = `[${getTimeStamp(now)}] [${level}] [${targetName}] [${eventType}] ${message}\n`
    fs.appendFileSync(filePath, line, 'utf-8')
  } catch {
    // 파일 로깅 실패 시 메인 루프 중단 방지
  }
}
