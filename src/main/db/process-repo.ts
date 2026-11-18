import Database from 'better-sqlite3'
import {
  DailyProcessStat,
  EventSeverity,
  HistoryQueryFilter,
  ProcessEventRecord,
  ProcessEventType,
  ProcessTargetConfig
} from '@shared/types/domain'

export class ProcessRepository {
  constructor(private readonly db: Database.Database) {}

  syncTargets(targets: ProcessTargetConfig[]): void {
    const now = new Date().toISOString()
    const upsertStmt = this.db.prepare(`
      INSERT INTO process_targets (
        id, name, process_name, watch_process_name, window_title, exec_path, args, work_dir,
        window_style, enabled, restart_delay_sec, startup_grace_sec, graceful_timeout_sec,
        check_not_responding, hung_threshold_count, max_retries_in_window, retry_window_sec, updated_at
      ) VALUES (
        @id, @name, @processName, @watchProcessName, @windowTitle, @execPath, @args, @workDir,
        @windowStyle, @enabled, @restartDelaySec, @startupGraceSec, @gracefulTimeoutSec,
        @checkNotResponding, @hungThresholdCount, @maxRetriesInWindow, @retryWindowSec, @updatedAt
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        process_name = excluded.process_name,
        watch_process_name = excluded.watch_process_name,
        window_title = excluded.window_title,
        exec_path = excluded.exec_path,
        args = excluded.args,
        work_dir = excluded.work_dir,
        window_style = excluded.window_style,
        enabled = excluded.enabled,
        restart_delay_sec = excluded.restart_delay_sec,
        startup_grace_sec = excluded.startup_grace_sec,
        graceful_timeout_sec = excluded.graceful_timeout_sec,
        check_not_responding = excluded.check_not_responding,
        hung_threshold_count = excluded.hung_threshold_count,
        max_retries_in_window = excluded.max_retries_in_window,
        retry_window_sec = excluded.retry_window_sec,
        updated_at = excluded.updated_at
    `)

    const tx = this.db.transaction((items: ProcessTargetConfig[]) => {
      for (const item of items) {
        upsertStmt.run({
          id: item.id,
          name: item.name,
          processName: item.processName,
          watchProcessName: item.watchProcessName ?? null,
          windowTitle: item.windowTitle,
          execPath: item.execPath,
          args: item.args,
          workDir: item.workDir,
          windowStyle: item.windowStyle,
          enabled: item.enabled ? 1 : 0,
          restartDelaySec: item.restartDelaySec,
          startupGraceSec: item.startupGraceSec,
          gracefulTimeoutSec: item.gracefulTimeoutSec,
          checkNotResponding: item.checkNotResponding ? 1 : 0,
          hungThresholdCount: item.hungThresholdCount,
          maxRetriesInWindow: item.maxRetriesInWindow,
          retryWindowSec: item.retryWindowSec,
          updatedAt: now
        })
      }
    })

    tx(targets)
  }

  getTargetMeta(targetId: string): { totalRestartCount: number; lastStartedAt: string | null; lastFailureAt: string | null } {
    const row = this.db
      .prepare(
        `SELECT total_restart_count, last_started_at, last_failure_at
         FROM process_targets WHERE id = ?`
      )
      .get(targetId) as { total_restart_count: number; last_started_at: string | null; last_failure_at: string | null } | undefined

    if (!row) {
      return { totalRestartCount: 0, lastStartedAt: null, lastFailureAt: null }
    }
    return {
      totalRestartCount: row.total_restart_count,
      lastStartedAt: row.last_started_at,
      lastFailureAt: row.last_failure_at
    }
  }

  incrementRestart(targetId: string, startedAtIso: string): void {
    this.db
      .prepare(
        `UPDATE process_targets
         SET total_restart_count = total_restart_count + 1,
             last_started_at = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .run(startedAtIso, startedAtIso, targetId)
  }

  recordStarted(targetId: string, startedAtIso: string): void {
    this.db
      .prepare(
        `UPDATE process_targets
         SET last_started_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(startedAtIso, startedAtIso, targetId)
  }

  recordFailure(targetId: string, failureAtIso: string): void {
    this.db
      .prepare(
        `UPDATE process_targets
         SET last_failure_at = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(failureAtIso, failureAtIso, targetId)
  }

  insertEvent(params: {
    targetId: string
    targetName: string
    eventType: ProcessEventType
    severity: EventSeverity
    pid: number | null
    message: string
    createdAt?: string
  }): ProcessEventRecord {
    const createdAt = params.createdAt || new Date().toISOString()
    const info = this.db
      .prepare(
        `INSERT INTO process_events (target_id, target_name, event_type, severity, pid, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        params.targetId,
        params.targetName,
        params.eventType,
        params.severity,
        params.pid,
        params.message,
        createdAt
      )

    return {
      id: Number(info.lastInsertRowid),
      targetId: params.targetId,
      targetName: params.targetName,
      eventType: params.eventType,
      severity: params.severity,
      pid: params.pid,
      message: params.message,
      createdAt
    }
  }

  recordSampleBatch(
    statDate: string,
    samples: Array<{
      targetId: string
      targetName: string
      isRunning: boolean
      restartedDelta: number
      hungDelta: number
    }>
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO daily_stats (
        stat_date, target_id, target_name, running_samples, total_samples, restart_count, hung_count
      ) VALUES (
        @statDate, @targetId, @targetName, @runningInc, 1, @restartDelta, @hungDelta
      )
      ON CONFLICT(stat_date, target_id) DO UPDATE SET
        target_name = excluded.target_name,
        running_samples = daily_stats.running_samples + @runningInc,
        total_samples = daily_stats.total_samples + 1,
        restart_count = daily_stats.restart_count + @restartDelta,
        hung_count = daily_stats.hung_count + @hungDelta
    `)

    const tx = this.db.transaction((rows: typeof samples) => {
      for (const row of rows) {
        stmt.run({
          statDate,
          targetId: row.targetId,
          targetName: row.targetName,
          runningInc: row.isRunning ? 1 : 0,
          restartDelta: row.restartedDelta,
          hungDelta: row.hungDelta
        })
      }
    })
    tx(samples)
  }

  queryEvents(filter: HistoryQueryFilter = {}): ProcessEventRecord[] {
    const conditions: string[] = []
    const params: Record<string, unknown> = {
      limit: Math.min(Math.max(filter.limit ?? 200, 1), 1000)
    }

    if (filter.targetId && filter.targetId !== 'ALL') {
      conditions.push('target_id = @targetId')
      params.targetId = filter.targetId
    }
    if (filter.severity && filter.severity !== 'ALL') {
      conditions.push('severity = @severity')
      params.severity = filter.severity
    }
    if (filter.search && filter.search.trim()) {
      conditions.push('(target_name LIKE @search OR message LIKE @search)')
      params.search = `%${filter.search.trim()}%`
    }
    if (filter.dateFrom) {
      conditions.push('created_at >= @dateFrom')
      params.dateFrom = filter.dateFrom
    }
    if (filter.dateTo) {
      conditions.push('created_at <= @dateTo')
      params.dateTo = `${filter.dateTo}T23:59:59.999Z`
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const rows = this.db
      .prepare(
        `SELECT id, target_id, target_name, event_type, severity, pid, message, created_at
         FROM process_events
         ${whereSql}
         ORDER BY id DESC
         LIMIT @limit`
      )
      .all(params) as Array<{
      id: number
      target_id: string
      target_name: string
      event_type: ProcessEventType
      severity: EventSeverity
      pid: number | null
      message: string
      created_at: string
    }>

    return rows.map((r) => ({
      id: r.id,
      targetId: r.target_id,
      targetName: r.target_name,
      eventType: r.event_type,
      severity: r.severity,
      pid: r.pid,
      message: r.message,
      createdAt: r.created_at
    }))
  }

  queryDailyStats(days = 30): DailyProcessStat[] {
    const rows = this.db
      .prepare(
        `SELECT stat_date, target_id, target_name, running_samples, total_samples, restart_count, hung_count
         FROM daily_stats
         ORDER BY stat_date DESC, target_name ASC
         LIMIT ?`
      )
      .all(days * 20) as Array<{
      stat_date: string
      target_id: string
      target_name: string
      running_samples: number
      total_samples: number
      restart_count: number
      hung_count: number
    }>

    return rows.map((r) => ({
      statDate: r.stat_date,
      targetId: r.target_id,
      targetName: r.target_name,
      runningSamples: r.running_samples,
      totalSamples: r.total_samples,
      uptimePercent:
        r.total_samples > 0 ? Number(((r.running_samples / r.total_samples) * 100).toFixed(2)) : 100,
      restartCount: r.restart_count,
      hungCount: r.hung_count
    }))
  }

  deleteOlderThan(cutoffIso: string, cutoffDate: string): number {
    const r1 = this.db.prepare(`DELETE FROM process_events WHERE created_at < ?`).run(cutoffIso)
    const r2 = this.db.prepare(`DELETE FROM daily_stats WHERE stat_date < ?`).run(cutoffDate)
    return r1.changes + r2.changes
  }
}
