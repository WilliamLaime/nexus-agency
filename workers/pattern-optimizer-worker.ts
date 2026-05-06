/** STATUS: STUB — reads from memory store only, no real data sources connected */
import { initSecurity, auditLog } from '../security/index.js'
import { memorySearch, memoryStore } from '../memory/namespaces.js'

const NIGHTLY_INTERVAL_MS = 24 * 60 * 60 * 1000

const DOMAINS = ['strategy', 'design', 'content', 'dev', 'qa', 'data', 'devops', 'security', 'client'] as const

interface OptimizedPattern {
  domain: string
  patternKey: string
  usageCount: number
  distilledAt: string
  namespace: string
  type: 'FOLLOW' | 'AVOID'
}

async function distillPatterns(namespace: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)

  for (const domain of DOMAINS) {
    // Success patterns
    const entries = await memorySearch(`pattern-${domain}`, namespace, 'pattern-optimizer-worker')

    if (entries.length >= 3) {
      const optimized: OptimizedPattern = {
        domain,
        patternKey: `optimized-patterns-${domain}`,
        usageCount: entries.length,
        distilledAt: new Date().toISOString(),
        namespace,
        type: 'FOLLOW',
      }

      await memoryStore(
        `optimized-pattern-${domain}-${today}`,
        optimized,
        namespace,
        'pattern-optimizer-worker'
      )

      await auditLog({
        agentName: 'pattern-optimizer-worker',
        action: 'PATTERNS_DISTILLED',
        namespace,
        outcome: 'ALLOWED',
        metadata: { domain, patternCount: entries.length, type: 'FOLLOW' },
      })
    }

    // Anti-patterns — distill failure-pattern-* entries with ≥3 occurrences
    const failureEntries = await memorySearch(`failure-pattern-`, namespace, 'pattern-optimizer-worker')
    const domainFailures = failureEntries.filter((e) => e.key.endsWith(`-${domain}`))

    if (domainFailures.length >= 3) {
      const antiPattern: OptimizedPattern = {
        domain,
        patternKey: `anti-pattern-distilled-${domain}`,
        usageCount: domainFailures.length,
        distilledAt: new Date().toISOString(),
        namespace,
        type: 'AVOID',
      }

      await memoryStore(
        `anti-pattern-distilled-${domain}-${today}`,
        antiPattern,
        namespace,
        'pattern-optimizer-worker'
      )

      await auditLog({
        agentName: 'pattern-optimizer-worker',
        action: 'ANTI_PATTERNS_DISTILLED',
        namespace,
        outcome: 'ALLOWED',
        metadata: { domain, failureCount: domainFailures.length, type: 'AVOID' },
      })

      console.log(`[pattern-optimizer-worker] ${namespace}/${domain} — ${domainFailures.length} anti-patterns distilled`)
    }
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
    metadata: { namespacesProcessed: namespaces.length, includesAntiPatterns: true },
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
