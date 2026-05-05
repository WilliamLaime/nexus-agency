import { initSecurity, auditLog } from '../security/index.js'
import { memorySearch, memoryStore } from '../memory/namespaces.js'

const NIGHTLY_INTERVAL_MS = 24 * 60 * 60 * 1000

interface OptimizedPattern {
  domain: string
  patternKey: string
  usageCount: number
  distilledAt: string
  namespace: string
}

async function distillPatterns(namespace: string): Promise<void> {
  const domains = ['strategy', 'design', 'content', 'dev', 'qa', 'data', 'devops', 'security', 'client']

  for (const domain of domains) {
    const entries = await memorySearch(`pattern-${domain}`, namespace, 'pattern-optimizer-worker')

    if (entries.length < 3) continue

    const optimized: OptimizedPattern = {
      domain,
      patternKey: `optimized-patterns-${domain}`,
      usageCount: entries.length,
      distilledAt: new Date().toISOString(),
      namespace,
    }

    await memoryStore(
      `optimized-pattern-${domain}-${new Date().toISOString().slice(0, 10)}`,
      optimized,
      namespace,
      'pattern-optimizer-worker'
    )

    await auditLog({
      agentName: 'pattern-optimizer-worker',
      action: 'PATTERNS_DISTILLED',
      namespace,
      outcome: 'ALLOWED',
      metadata: { domain, patternCount: entries.length },
    })
  }
}

async function runOptimization(): Promise<void> {
  const namespaces = (process.env['NEXUS_ACTIVE_NAMESPACES'] ?? '').split(',').map((s) => s.trim()).filter(Boolean)

  for (const ns of namespaces) {
    await distillPatterns(ns)
  }

  await auditLog({
    agentName: 'pattern-optimizer-worker',
    action: 'OPTIMIZATION_COMPLETE',
    namespace: 'system',
    outcome: 'ALLOWED',
    metadata: { namespacesProcessed: namespaces.length },
  })
}

async function main(): Promise<void> {
  await initSecurity()

  await auditLog({
    agentName: 'pattern-optimizer-worker',
    action: 'WORKER_STARTED',
    namespace: 'system',
    outcome: 'ALLOWED',
  })

  await runOptimization()
  setInterval(() => { void runOptimization() }, NIGHTLY_INTERVAL_MS)
}

main().catch((err) => {
  console.error('[pattern-optimizer-worker] Fatal error:', err)
  process.exit(1)
})
