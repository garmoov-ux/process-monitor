import dgram from 'dgram'

const NTP_EPOCH_OFFSET_SEC = 2208988800

export interface SntpQueryResult {
  ok: boolean
  serverUsed: string
  offsetMs: number
  rttMs: number
  serverTimeMs: number
  error?: string
}

function parseHostPort(serverStr: string): { host: string; port: number } {
  const trimmed = (serverStr || '').trim()
  const idx = trimmed.lastIndexOf(':')
  if (idx > 0) {
    const maybePort = Number(trimmed.slice(idx + 1))
    if (Number.isInteger(maybePort) && maybePort > 0 && maybePort <= 65535) {
      return { host: trimmed.slice(0, idx), port: maybePort }
    }
  }
  return { host: trimmed, port: 123 }
}

export function buildSntpRequestPacket(): Buffer {
  const buf = Buffer.alloc(48)
  // LI = 0, VN = 4, Mode = 3 (Client) -> 0x23
  buf[0] = 0x23
  return buf
}

export function parseSntpResponsePacket(
  packet: Buffer,
  t1Ms: number,
  t4Ms: number
): { offsetMs: number; rttMs: number; serverTimeMs: number } | null {
  if (!packet || packet.length < 48) return null

  const mode = packet[0] & 0x07
  const stratum = packet[1]
  if ((mode !== 4 && mode !== 5) || stratum === 0 || stratum > 15) {
    return null
  }

  // Receive Timestamp (bytes 32..39), Transmit Timestamp (bytes 40..47)
  const rxSec = packet.readUInt32BE(32)
  const rxFrac = packet.readUInt32BE(36)
  const txSec = packet.readUInt32BE(40)
  const txFrac = packet.readUInt32BE(44)

  if (txSec < NTP_EPOCH_OFFSET_SEC) return null

  const t2Ms = (rxSec - NTP_EPOCH_OFFSET_SEC) * 1000 + (rxFrac * 1000) / 0x100000000
  const t3Ms = (txSec - NTP_EPOCH_OFFSET_SEC) * 1000 + (txFrac * 1000) / 0x100000000

  const rttMs = Math.max(0, t4Ms - t1Ms - Math.max(0, t3Ms - t2Ms))
  const offsetMs = (t2Ms - t1Ms + (t3Ms - t4Ms)) / 2

  return {
    offsetMs: Number(offsetMs.toFixed(2)),
    rttMs: Number(rttMs.toFixed(2)),
    serverTimeMs: Math.round(t3Ms + rttMs / 2)
  }
}

export async function querySingleNtpServer(
  serverAddress: string,
  timeoutMs = 2000
): Promise<SntpQueryResult> {
  const { host, port } = parseHostPort(serverAddress)
  if (!host || !/^[a-zA-Z0-9.-]+$/.test(host)) {
    return {
      ok: false,
      serverUsed: serverAddress,
      offsetMs: 0,
      rttMs: 0,
      serverTimeMs: 0,
      error: `유효하지 않은 NTP 서버 주소: ${serverAddress}`
    }
  }

  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4')
    let settled = false
    const t1Ms = Date.now()

    const finish = (res: SntpQueryResult): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        socket.close()
      } catch {
        // ignore close error
      }
      resolve(res)
    }

    const timer = setTimeout(() => {
      finish({
        ok: false,
        serverUsed: serverAddress,
        offsetMs: 0,
        rttMs: timeoutMs,
        serverTimeMs: 0,
        error: `응답 시간 초과 (${timeoutMs}ms)`
      })
    }, Math.max(200, timeoutMs))

    socket.once('error', (err) => {
      finish({
        ok: false,
        serverUsed: serverAddress,
        offsetMs: 0,
        rttMs: 0,
        serverTimeMs: 0,
        error: err.message
      })
    })

    socket.once('message', (msg) => {
      const t4Ms = Date.now()
      const parsed = parseSntpResponsePacket(msg, t1Ms, t4Ms)
      if (!parsed) {
        finish({
          ok: false,
          serverUsed: serverAddress,
          offsetMs: 0,
          rttMs: t4Ms - t1Ms,
          serverTimeMs: 0,
          error: '유효하지 않은 NTP 응답 패킷'
        })
        return
      }

      finish({
        ok: true,
        serverUsed: serverAddress,
        offsetMs: parsed.offsetMs,
        rttMs: parsed.rttMs,
        serverTimeMs: parsed.serverTimeMs
      })
    })

    const packet = buildSntpRequestPacket()
    socket.send(packet, 0, packet.length, port, host, (err) => {
      if (err) {
        finish({
          ok: false,
          serverUsed: serverAddress,
          offsetMs: 0,
          rttMs: 0,
          serverTimeMs: 0,
          error: err.message
        })
      }
    })
  })
}

export async function queryMultiNtpWithFailover(
  servers: string[],
  timeoutMs = 2000
): Promise<SntpQueryResult> {
  const validServers = servers.map((s) => s.trim()).filter(Boolean)
  const errors: string[] = []

  for (const srv of validServers) {
    const res = await querySingleNtpServer(srv, timeoutMs)
    if (res.ok) {
      return res
    }
    errors.push(`${srv}(${res.error || '실패'})`)
  }

  return {
    ok: false,
    serverUsed: validServers.join(' -> ') || '미지정',
    offsetMs: 0,
    rttMs: 0,
    serverTimeMs: 0,
    error: `모든 NTP 서버 응답 실패: ${errors.join(', ')}`
  }
}
