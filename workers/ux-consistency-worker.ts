import { initSecurity, auditLog } from '../security/index.js'
import { memorySearch } from '../memory/namespaces.js'

const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000

interface ConsistencyCheck {
  namespace: string
  issues: string[]
}

async function checkUXConsistency(namespace: string): Promise<ConsistencyCheck> {
  const issues: string[] = []

  const colorEntries = await memorySearch('design-token color', namespace, 'ux-consistency-worker')
  const spacingEntries = await memorySearch('design-token spacing', namespace, 'ux-consistency-worker')
  const componentEntries = await memorySearch('component', namespace, 'ux-consistency-worker')

  if (colorEntries.length === 0) {
    issues.push('No design tokens (colors) found in memory for this namespace')
  }
  if (spacingEntries.length === 0) {
    issues.push('No design tokens (spacing) found in memory for this namespace')
  }
  if (componentEntries.length === 0) {
    issues.push('No component definitions found in memory for this namespace')
  }

  return { namespace, issues }
}

async function runCheck(): Promise<void> {
  const namespaces = (process.env['NEXUS_ACTIVE_NAMESPACES'] ?? '').split(',').map((s) => s.trim()).filter(Boolean)

  if (namespaces.length === 0) {
    return
  }

  for (const ns of namespaces) {
    const result = await checkUXConsistency(ns)

    await auditLog({
      agentName: 'ux-consistency-worker',
      action: 'UX_CONSISTENCY_CHECK',
      namespace: ns,
      outcome: result.issues.length === 0 ? 'ALLOWED' : 'ALLOWED',
      metadata: { issueCount: result.issues.length },
    })

    if (result.issues.length > 0) {
      console.warn(`[ux-consistency-worker] Issues in ${ns}:`)
      result.issues.forEach((issue) => console.warn(`  - ${issue}`))
    }
  }
}

async function main(): Promise<void> {
  await initSecurity()

  await auditLog({
    agentName: 'ux-consistency-worker',
    action: 'WORKER_STARTED',
    namespace: 'system',
    outcome: 'ALLOWED',
  })

  await runCheck()
  setInterval(() => { void runCheck() }, DAILY_INTERVAL_MS)
}

main().catch((err) => {
  console.error('[ux-consistency-worker] Fatal error:', err)
  process.exit(1)
})
