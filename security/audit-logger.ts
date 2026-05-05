import { createWriteStream } from 'node:fs'
import { mkdir, readdir, unlink, stat } from 'node:fs/promises'
import { join } from 'node:path'
import pino from 'pino'

export type TrustLevel = 'TRUSTED' | 'VERIFIED' | 'UNTRUSTED'
export type AuditOutcome = 'ALLOWED' | 'BLOCKED' | 'REDACTED'

export interface AuditEvent {
  agentName: string
  action: string
  namespace: string
  trustLevel?: TrustLevel
  piiDetected?: boolean
  injectionAttempt?: boolean
  outcome: AuditOutcome
  durationMs?: number
  metadata?: Record<string, string | number | boolean>
}

interface AuditLogEntry extends AuditEvent {
  timestamp: string
  sessionId: string
}

const REPORTS_DIR = join(process.cwd(), 'reports', 'security')
const SESSION_ID = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

let logger: pino.Logger | null = null

function getTodayLogPath(): string {
  const date = new Date().toISOString().slice(0, 10)
  return join(REPORTS_DIR, `audit-${date}.jsonl`)
}

export async function initAuditLogger(): Promise<void> {
  await mkdir(REPORTS_DIR, { recursive: true })

  const logPath = getTodayLogPath()
  const stream = createWriteStream(logPath, { flags: 'a' })

  logger = pino(
    {
      level: process.env['NEXUS_LOG_LEVEL'] ?? 'info',
      redact: {
        paths: [
          'metadata.email',
          'metadata.phone',
          'metadata.iban',
          'metadata.password',
          'metadata.token',
          'metadata.api_key',
          'metadata.nir',
          'metadata.credit_card',
        ],
        censor: '[REDACTED]',
      },
      base: null,
      timestamp: false,
    },
    stream
  )

  const retentionDays = parseInt(process.env['NEXUS_AUDIT_LOG_RETENTION_DAYS'] ?? '90', 10)
  await pruneOldLogs(retentionDays)
}

export async function auditLog(event: AuditEvent): Promise<void> {
  if (!logger) {
    await initAuditLogger()
  }

  const entry: AuditLogEntry = {
    ...event,
    timestamp: new Date().toISOString(),
    sessionId: SESSION_ID,
  }

  logger!.info(entry)
}

export async function pruneOldLogs(retentionDays: number): Promise<void> {
  let files: string[]
  try {
    files = await readdir(REPORTS_DIR)
  } catch {
    return
  }

  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000

  for (const file of files) {
    if (!file.startsWith('audit-') || !file.endsWith('.jsonl')) continue
    const filePath = join(REPORTS_DIR, file)
    try {
      const { mtime } = await stat(filePath)
      if (mtime.getTime() < cutoff) {
        await unlink(filePath)
      }
    } catch {
      // file may have been deleted by another process
    }
  }
}
