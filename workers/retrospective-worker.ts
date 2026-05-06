import { initSecurity, auditLog } from '../security/index.js'
import { memorySearch, memoryStore } from '../memory/namespaces.js'

const FAILURE_TYPES = ['PII_BLOCK', 'SECRET_SCAN', 'POLICY_VIOLATION'] as const
type FailureType = typeof FAILURE_TYPES[number]

interface FailurePatternSummary {
  type: FailureType
  count: number
  domain: string
  detectedAt: string
}

interface RetrospectiveReport {
  sprintId: string
  namespace: string
  generatedAt: string
  wentWell: string[]
  improvements: string[]
  actionItems: string[]
  velocityEstimate: number
  topFailures: FailurePatternSummary[]
}

async function captureFailurePatterns(namespace: string): Promise<FailurePatternSummary[]> {
  const domains = ['strategy', 'design', 'content', 'dev', 'qa', 'data', 'devops', 'security', 'client']
  const summaries: FailurePatternSummary[] = []

  for (const type of FAILURE_TYPES) {
    for (const domain of domains) {
      const entries = await memorySearch(`failure-pattern-${type}-${domain}`, namespace, 'retrospective-worker')
      if (entries.length === 0) continue

      const summary: FailurePatternSummary = {
        type,
        count: entries.length,
        domain,
        detectedAt: new Date().toISOString(),
      }

      summaries.push(summary)

      await memoryStore(
        `failure-pattern-${type}-${domain}`,
        summary,
        namespace,
        'retrospective-worker'
      )
    }
  }

  return summaries
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
}

async function generateRetrospective(namespace: string, sprintId: string): Promise<RetrospectiveReport> {
  const [qualityEntries, blockedEntries, patternEntries, topFailures] = await Promise.all([
    memorySearch('quality-score', namespace, 'retrospective-worker'),
    memorySearch('BLOCKED error', namespace, 'retrospective-worker'),
    memorySearch('pattern-', namespace, 'retrospective-worker'),
    captureFailurePatterns(namespace),
  ])

  const wentWell: string[] = []
  const improvements: string[] = []
  const actionItems: string[] = []

  if (qualityEntries.length > 0) {
    wentWell.push(`${qualityEntries.length} quality scores recorded — quality tracking is active`)
  }
  if (patternEntries.length > 0) {
    wentWell.push(`${patternEntries.length} reusable patterns captured in memory`)
  }
  if (blockedEntries.length > 3) {
    improvements.push(`${blockedEntries.length} security blocks detected — review PII handling in inputs`)
    actionItems.push('Review agent inputs for PII before sending to memory')
  }
  if (patternEntries.length < 5) {
    improvements.push('Few patterns captured — encourage agents to store successful approaches')
    actionItems.push('Enable pattern-optimizer-worker for nightly distillation')
  }

  for (const failure of topFailures) {
    improvements.push(`Recurring failure: ${failure.type} in ${failure.domain} (${failure.count}x)`)
    actionItems.push(`Fix ${failure.type} pattern in ${failure.domain} domain`)
  }

  const velocityEstimate = Math.max(1, qualityEntries.length + patternEntries.length)

  return {
    sprintId,
    namespace,
    generatedAt: new Date().toISOString(),
    wentWell,
    improvements,
    actionItems,
    velocityEstimate,
    topFailures,
  }
}

async function runRetrospective(): Promise<void> {
  const namespaces = (process.env['NEXUS_ACTIVE_NAMESPACES'] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const sprintId = `sprint-${new Date().toISOString().slice(0, 7)}`

  for (const ns of namespaces) {
    const report = await generateRetrospective(ns, sprintId)

    await memoryStore(
      `retrospective-${sprintId}`,
      report,
      ns,
      'retrospective-worker'
    )

    await auditLog({
      agentName: 'retrospective-worker',
      action: 'RETROSPECTIVE_GENERATED',
      namespace: ns,
      outcome: 'ALLOWED',
      metadata: {
        sprintId,
        wentWellCount: report.wentWell.length,
        improvementsCount: report.improvements.length,
        actionItemsCount: report.actionItems.length,
        topFailuresCount: report.topFailures.length,
      },
    })

    console.log(`[retrospective-worker] ${ns} — Sprint ${sprintId}:`)
    console.log(`  ✓ Went well: ${report.wentWell.length} items`)
    console.log(`  ↑ Improvements: ${report.improvements.length} items`)
    console.log(`  → Action items: ${report.actionItems.length} items`)
    if (report.topFailures.length > 0) {
      console.log(`  ✗ Top failures: ${report.topFailures.map((f) => `${f.type}@${f.domain}(${f.count}x)`).join(', ')}`)
    }
  }
}

async function main(): Promise<void> {
  await initSecurity()

  await auditLog({
    agentName: 'retrospective-worker',
    action: 'WORKER_STARTED',
    namespace: 'system',
    outcome: 'ALLOWED',
  })

  await runRetrospective()
}

main().catch((err) => {
  console.error('[retrospective-worker] Fatal error:', err)
  process.exit(1)
})
