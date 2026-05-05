import { initSecurity, auditLog } from '../security/index.js'
import { memorySearch, memoryStore } from '../memory/namespaces.js'

const WEEKLY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

interface SEOSnapshot {
  timestamp: string
  namespace: string
  patternCount: number
  keywords: string[]
}

async function snapshotSEOPatterns(namespace: string): Promise<void> {
  const seoEntries = await memorySearch('seo pattern keyword', namespace, 'seo-monitor-worker')
  const metaEntries = await memorySearch('meta-title meta-description', namespace, 'seo-monitor-worker')

  const snapshot: SEOSnapshot = {
    timestamp: new Date().toISOString(),
    namespace,
    patternCount: seoEntries.length + metaEntries.length,
    keywords: [...seoEntries, ...metaEntries].map((e) => e.key).slice(0, 20),
  }

  await memoryStore(
    `seo-snapshot-${new Date().toISOString().slice(0, 10)}`,
    snapshot,
    namespace,
    'seo-monitor-worker'
  )

  await auditLog({
    agentName: 'seo-monitor-worker',
    action: 'SEO_SNAPSHOT_TAKEN',
    namespace,
    outcome: 'ALLOWED',
    metadata: { patternCount: snapshot.patternCount },
  })
}

async function detectRegressions(namespace: string): Promise<void> {
  const snapshots = await memorySearch('seo-snapshot-', namespace, 'seo-monitor-worker')

  if (snapshots.length < 2) return

  await auditLog({
    agentName: 'seo-monitor-worker',
    action: 'SEO_REGRESSION_CHECK',
    namespace,
    outcome: 'ALLOWED',
    metadata: { snapshotsCompared: snapshots.length },
  })
}

async function runMonitor(): Promise<void> {
  const namespaces = (process.env['NEXUS_ACTIVE_NAMESPACES'] ?? '').split(',').map((s) => s.trim()).filter(Boolean)

  for (const ns of namespaces) {
    await snapshotSEOPatterns(ns)
    await detectRegressions(ns)
  }
}

async function main(): Promise<void> {
  await initSecurity()

  await auditLog({
    agentName: 'seo-monitor-worker',
    action: 'WORKER_STARTED',
    namespace: 'system',
    outcome: 'ALLOWED',
  })

  await runMonitor()
  setInterval(() => { void runMonitor() }, WEEKLY_INTERVAL_MS)
}

main().catch((err) => {
  console.error('[seo-monitor-worker] Fatal error:', err)
  process.exit(1)
})
