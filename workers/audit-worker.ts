import { initSecurity, auditLog, pruneOldLogs } from '../security/index.js'

const ROTATION_INTERVAL_MS = 24 * 60 * 60 * 1000
const RETENTION_DAYS = parseInt(process.env['NEXUS_AUDIT_LOG_RETENTION_DAYS'] ?? '90', 10)

async function main(): Promise<void> {
  await initSecurity()

  await auditLog({
    agentName: 'audit-worker',
    action: 'WORKER_STARTED',
    namespace: 'system',
    outcome: 'ALLOWED',
  })

  async function rotate(): Promise<void> {
    await pruneOldLogs(RETENTION_DAYS)
    await auditLog({
      agentName: 'audit-worker',
      action: 'LOG_ROTATION_COMPLETE',
      namespace: 'system',
      outcome: 'ALLOWED',
      metadata: { retentionDays: RETENTION_DAYS },
    })
  }

  await rotate()
  setInterval(() => { void rotate() }, ROTATION_INTERVAL_MS)
}

main().catch((err) => {
  console.error('[audit-worker] Fatal error:', err)
  process.exit(1)
})
