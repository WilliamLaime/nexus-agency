import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { initSecurity, withSecurityContext, auditLog } from '../../security/index.js'
import { runCVEAudit, generateReport } from '../../security/cve-monitor.js'
import type { NexusOrchestrator } from '../nexus-core/index.js'
import type { AgentFn } from '../../security/index.js'

export { initSecurity, withSecurityContext }

export interface SecurityStats {
  totalEvents: number
  blocked: number
  allowed: number
  redacted: number
  piiDetected: number
  injectionAttempts: number
  secretsFound: number
}

interface AuditLogLine {
  outcome?: string
  piiDetected?: boolean
  injectionAttempt?: boolean
  metadata?: { secretsFound?: number }
}

const REPORTS_DIR = join(process.cwd(), 'reports', 'security')

export async function getSecurityStats(): Promise<SecurityStats> {
  const stats: SecurityStats = {
    totalEvents: 0,
    blocked: 0,
    allowed: 0,
    redacted: 0,
    piiDetected: 0,
    injectionAttempts: 0,
    secretsFound: 0,
  }

  let files: string[]
  try {
    files = await readdir(REPORTS_DIR)
  } catch {
    return stats
  }

  const today = new Date().toISOString().slice(0, 10)
  const todayLog = files.find((f) => f === `audit-${today}.jsonl`)
  if (!todayLog) return stats

  const content = await readFile(join(REPORTS_DIR, todayLog), 'utf8')
  const lines = content.trim().split('\n').filter(Boolean)

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as AuditLogLine
      stats.totalEvents++
      if (entry.outcome === 'BLOCKED') stats.blocked++
      if (entry.outcome === 'ALLOWED') stats.allowed++
      if (entry.outcome === 'REDACTED') stats.redacted++
      if (entry.piiDetected) stats.piiDetected++
      if (entry.injectionAttempt) stats.injectionAttempts++
      if (typeof entry.metadata?.secretsFound === 'number') {
        stats.secretsFound += entry.metadata.secretsFound
      }
    } catch {
      // skip malformed lines
    }
  }

  return stats
}

export class NexusSecurityPlugin {
  async register(orch: NexusOrchestrator): Promise<void> {
    await initSecurity()

    await auditLog({
      agentName: 'nexus-security-plugin',
      action: 'PLUGIN_REGISTERED',
      namespace: 'system',
      outcome: 'ALLOWED',
    })
  }

  wrapAgentFn(fn: AgentFn, agentName: string): AgentFn {
    return async (input, context) => {
      return withSecurityContext(fn, input, { ...context, agentName })
    }
  }

  async runCVEAudit(): Promise<string> {
    const report = await runCVEAudit()
    const path = await generateReport(report)
    return path
  }

  async getStats(): Promise<SecurityStats> {
    return getSecurityStats()
  }
}

export const securityPlugin = new NexusSecurityPlugin()
