import { initSecurity, auditLog } from '../security/index.js'

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
const ROTATION_THRESHOLD_DAYS = parseInt(process.env['NEXUS_KEY_ROTATION_DAYS'] ?? '30', 10)

interface TrackedSecret {
  name: string
  envVar: string
  lastRotatedEnvVar: string
}

const TRACKED_SECRETS: TrackedSecret[] = [
  { name: 'Anthropic API Key', envVar: 'ANTHROPIC_API_KEY', lastRotatedEnvVar: 'NEXUS_ANTHROPIC_KEY_ROTATED_AT' },
  { name: 'Memory Encryption Key', envVar: 'NEXUS_MEMORY_ENCRYPTION_KEY', lastRotatedEnvVar: 'NEXUS_ENC_KEY_ROTATED_AT' },
  { name: 'Agent Secret', envVar: 'NEXUS_AGENT_SECRET', lastRotatedEnvVar: 'NEXUS_AGENT_SECRET_ROTATED_AT' },
  { name: 'OpenAI API Key', envVar: 'OPENAI_API_KEY', lastRotatedEnvVar: 'NEXUS_OPENAI_KEY_ROTATED_AT' },
]

function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime()
  if (isNaN(then)) return 999
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24))
}

async function checkRotations(): Promise<void> {
  for (const secret of TRACKED_SECRETS) {
    if (!process.env[secret.envVar]) continue

    const lastRotated = process.env[secret.lastRotatedEnvVar]
    if (!lastRotated) {
      await auditLog({
        agentName: 'secret-rotation-reminder-worker',
        action: 'KEY_ROTATION_DATE_MISSING',
        namespace: 'system',
        outcome: 'ALLOWED',
        metadata: { secretName: secret.name, hint: `Set ${secret.lastRotatedEnvVar}=YYYY-MM-DD in .env` },
      })
      console.warn(`[secret-rotation-reminder] ${secret.name}: rotation date not tracked. Set ${secret.lastRotatedEnvVar}`)
      continue
    }

    const age = daysSince(lastRotated)
    if (age >= ROTATION_THRESHOLD_DAYS) {
      await auditLog({
        agentName: 'secret-rotation-reminder-worker',
        action: 'KEY_ROTATION_OVERDUE',
        namespace: 'system',
        outcome: 'ALLOWED',
        metadata: { secretName: secret.name, ageDays: age, thresholdDays: ROTATION_THRESHOLD_DAYS },
      })
      console.warn(
        `[secret-rotation-reminder] ROTATION OVERDUE: ${secret.name} is ${age} days old (threshold: ${ROTATION_THRESHOLD_DAYS}d)`
      )
    }
  }
}

async function main(): Promise<void> {
  await initSecurity()

  await auditLog({
    agentName: 'secret-rotation-reminder-worker',
    action: 'WORKER_STARTED',
    namespace: 'system',
    outcome: 'ALLOWED',
    metadata: { thresholdDays: ROTATION_THRESHOLD_DAYS },
  })

  await checkRotations()
  setInterval(() => { void checkRotations() }, CHECK_INTERVAL_MS)
}

main().catch((err) => {
  console.error('[secret-rotation-reminder-worker] Fatal error:', err)
  process.exit(1)
})
