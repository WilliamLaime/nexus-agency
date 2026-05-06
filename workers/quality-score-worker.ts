/** STATUS: STUB — reads from memory store only, no real data sources connected */
import { initSecurity, auditLog } from '../security/index.js'
import { memoryStore, memorySearch } from '../memory/namespaces.js'

interface QualityScore {
  namespace: string
  timestamp: string
  scores: {
    ux: number
    performance: number
    accessibility: number
    seo: number
    security: number
    codeQuality: number
  }
  globalScore: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
}

const WEIGHTS = {
  ux: 0.2,
  performance: 0.2,
  accessibility: 0.2,
  seo: 0.1,
  security: 0.2,
  codeQuality: 0.1,
}

function computeGrade(score: number): QualityScore['grade'] {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

async function computeQualityScore(namespace: string): Promise<QualityScore> {
  const [uxEntries, perfEntries, a11yEntries, seoEntries, secEntries, codeEntries] = await Promise.all([
    memorySearch('ux-score lighthouse', namespace, 'quality-score-worker'),
    memorySearch('performance-score core-web-vitals', namespace, 'quality-score-worker'),
    memorySearch('accessibility-score wcag rgaa', namespace, 'quality-score-worker'),
    memorySearch('seo-score', namespace, 'quality-score-worker'),
    memorySearch('security-score owasp', namespace, 'quality-score-worker'),
    memorySearch('code-quality coverage', namespace, 'quality-score-worker'),
  ])

  const toScore = (entries: { key: string; namespace: string; storedAt: string }[]) =>
    entries.length > 0 ? Math.min(100, entries.length * 10) : 50

  const scores = {
    ux: toScore(uxEntries),
    performance: toScore(perfEntries),
    accessibility: toScore(a11yEntries),
    seo: toScore(seoEntries),
    security: toScore(secEntries),
    codeQuality: toScore(codeEntries),
  }

  const globalScore = Math.round(
    Object.entries(scores).reduce((sum, [key, val]) => {
      const weight = WEIGHTS[key as keyof typeof WEIGHTS] ?? 0
      return sum + val * weight
    }, 0)
  )

  return {
    namespace,
    timestamp: new Date().toISOString(),
    scores,
    globalScore,
    grade: computeGrade(globalScore),
  }
}

async function runScoring(): Promise<void> {
  const namespaces = (process.env['NEXUS_ACTIVE_NAMESPACES'] ?? '').split(',').map((s) => s.trim()).filter(Boolean)

  for (const ns of namespaces) {
    const score = await computeQualityScore(ns)

    await memoryStore(
      `quality-score-${new Date().toISOString().slice(0, 10)}`,
      score,
      ns,
      'quality-score-worker'
    )

    await auditLog({
      agentName: 'quality-score-worker',
      action: 'QUALITY_SCORE_COMPUTED',
      namespace: ns,
      outcome: 'ALLOWED',
      metadata: { globalScore: score.globalScore, grade: score.grade },
    })

    console.log(`[quality-score-worker] ${ns}: ${score.globalScore}/100 (${score.grade})`)
  }
}

async function main(): Promise<void> {
  await initSecurity()

  await auditLog({
    agentName: 'quality-score-worker',
    action: 'WORKER_STARTED',
    namespace: 'system',
    outcome: 'ALLOWED',
  })

  await runScoring()
}

main().catch((err) => {
  console.error('[quality-score-worker] Fatal error:', err)
  process.exit(1)
})
