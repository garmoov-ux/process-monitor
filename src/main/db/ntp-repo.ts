import Database from 'better-sqlite3'
import { NtpSyncRecord } from '@shared/types/domain'

export class NtpRepository {
  constructor(private readonly db: Database.Database) {}

  insertSyncRecord(params: {
    serverUsed: string
    offsetMs: number
    rttMs: number
    applied: boolean
    status: 'SUCCESS' | 'OFFSET_EXCEEDED' | 'FAILED'
    message: string
    syncedAt?: string
  }): NtpSyncRecord {
    const syncedAt = params.syncedAt || new Date().toISOString()
    const info = this.db
      .prepare(
        `INSERT INTO ntp_history (server_used, offset_ms, rtt_ms, applied, status, message, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        params.serverUsed,
        params.offsetMs,
        params.rttMs,
        params.applied ? 1 : 0,
        params.status,
        params.message,
        syncedAt
      )

    return {
      id: Number(info.lastInsertRowid),
      serverUsed: params.serverUsed,
      offsetMs: params.offsetMs,
      rttMs: params.rttMs,
      applied: params.applied,
      status: params.status,
      message: params.message,
      syncedAt
    }
  }

  getRecentHistory(limit = 50): NtpSyncRecord[] {
    const rows = this.db
      .prepare(
        `SELECT id, server_used, offset_ms, rtt_ms, applied, status, message, synced_at
         FROM ntp_history
         ORDER BY id DESC
         LIMIT ?`
      )
      .all(Math.min(Math.max(limit, 1), 500)) as Array<{
      id: number
      server_used: string
      offset_ms: number
      rtt_ms: number
      applied: number
      status: 'SUCCESS' | 'OFFSET_EXCEEDED' | 'FAILED'
      message: string
      synced_at: string
    }>

    return rows.map((r) => ({
      id: r.id,
      serverUsed: r.server_used,
      offsetMs: r.offset_ms,
      rttMs: r.rtt_ms,
      applied: Boolean(r.applied),
      status: r.status,
      message: r.message,
      syncedAt: r.synced_at
    }))
  }

  getSummaryCounts(): { successCount: number; failCount: number; latest: NtpSyncRecord | null } {
    const counts = this.db
      .prepare(
        `SELECT
           SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) AS success_cnt,
           SUM(CASE WHEN status != 'SUCCESS' THEN 1 ELSE 0 END) AS fail_cnt
         FROM ntp_history`
      )
      .get() as { success_cnt: number | null; fail_cnt: number | null }

    const recent = this.getRecentHistory(1)
    return {
      successCount: Number(counts?.success_cnt ?? 0),
      failCount: Number(counts?.fail_cnt ?? 0),
      latest: recent[0] ?? null
    }
  }

  deleteOlderThan(cutoffIso: string): number {
    const info = this.db.prepare(`DELETE FROM ntp_history WHERE synced_at < ?`).run(cutoffIso)
    return info.changes
  }
}
