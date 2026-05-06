import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, readdir, readFile, unlink, stat } from 'node:fs/promises'
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
  prevHash: string
  hash: string
}

const REPORTS_DIR = join(process.cwd(), 'reports', 'security')
const SESSION_ID = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const GENESIS_HASH = '0'.repeat(64)

let logger: pino.Logger | null = null
let lastHash = GENESIS_HASH

function computeHash(entry: Omit<AuditLogEntry, 'hash'>): string {
  return createHash('sha256').update(JSON.stringify(entry)).digest('hex')
}

function getTodayLogPath(): string {
  const date = new Date().toISOString().slice(0, 10)
  return join(REPORTS_DIR, `audit-${date}.jsonl`)
}

async function loadLastHash(): Promise<string> {
  const logPath = getTodayLogPath()
  try {
    const content = await readFile(logPath, 'utf8')
    const lines = content.trimEnd().split('\n').filter(Boolean)
    const lastLine = lines[lines.length - 1]
    if (!lastLine) return GENESIS_HASH
    const entry = JSON.parse(lastLine) as { hash?: string }
    return entry.hash ?? GENESIS_HASH
  } catch {
    return GENESIS_HASH
  }
}

export async function verifyAuditChain(filePath: string): Promise<{ valid: boolean; brokenAt?: number }> {
  let content: string
  try {
    content = await readFile(filePath, 'utf8')
  } catch {
    return { valid: true }
  }

  const lines = content.trimEnd().split('\n').filter(Boolean)
  let prevHash = GENESIS_HASH

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    let entry: AuditLogEntry
    try {
      entry = JSON.parse(line) as AuditLogEntry
    } catch {
      return { valid: false, brokenAt: i + 1 }
    }

    if (entry.prevHash !== prevHash) {
      return { valid: false, brokenAt: i + 1 }
    }

    const { hash, ...entryWithoutHash } = entry
    const expectedHash = computeHash(entryWithoutHash)
    if (hash !== expectedHash) {
      return { valid: false, brokenAt: i + 1 }
    }

    prevHash = hash
  }

  return { valid: true }
}

export async function initAuditLogger(): Promise<void> {
  await mkdir(REPORTS_DIR, { recursive: true })

  lastHash = await loadLastHash()

  if (process.env['NEXUS_VERIFY_AUDIT_CHAIN'] === 'true') {
    const logPath = getTodayLogPath()
    const result = await verifyAuditChain(logPath)
    if (!result.valid) {
      console.error(`[audit-logger] Chain integrity broken at line ${result.brokenAt ?? 'unknown'}`)
    }
  }

  const logPath = getTodayLogPath()
  const stream = createWriteStream(logPath, { flags: 'a' })

  logger = pino(
    {
      level: process.env['NEXUS_LOG_LEVEL'] ?? 'info',
      // We log type names and counts, never PII values themselves.
      // These redact paths are defensive against future code that might accidentally include a raw value.
      redact: {
        paths: [
          'metadata.rawInput',
          'metadata.rawOutput',
          'metadata.value',
          'metadata.password',
          'metadata.token',
          'metadata.query',
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

  const entryWithoutHash = {
    ...event,
    timestamp: new Date().toISOString(),
    sessionId: SESSION_ID,
    prevHash: lastHash,
  }

  const hash = computeHash(entryWithoutHash)
  const entry: AuditLogEntry = { ...entryWithoutHash, hash }
  lastHash = hash

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
