import Database from 'better-sqlite3'
import { resolveAppPaths } from '../config/app-paths'
import { initializeDatabaseSchema } from './schema'

let dbInstance: Database.Database | null = null

export function createDatabaseConnection(dbFilePath: string): Database.Database {
  const db = new Database(dbFilePath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  initializeDatabaseSchema(db)
  return db
}

export function getDatabase(): Database.Database {
  if (!dbInstance) {
    const { dbPath } = resolveAppPaths()
    dbInstance = createDatabaseConnection(dbPath)
  }
  return dbInstance
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
