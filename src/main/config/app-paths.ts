import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()

export interface ResolvedAppPaths {
  baseDir: string
  configPath: string
  dbPath: string
  logDir: string
}

export function resolveAppPaths(): ResolvedAppPaths {
  let baseDir = process.cwd()

  try {
    if (app && app.isPackaged) {
      baseDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe'))
    }
  } catch {
    baseDir = process.cwd()
  }

  const configPath = path.resolve(baseDir, 'config.json')
  const dbPath = path.resolve(
    baseDir,
    process.env.PROCESS_MONITOR_DB_PATH || './data/app.db'
  )
  const logDir = path.resolve(
    baseDir,
    process.env.PROCESS_MONITOR_LOG_DIR || './logs'
  )

  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  fs.mkdirSync(logDir, { recursive: true })

  return {
    baseDir,
    configPath,
    dbPath,
    logDir
  }
}
