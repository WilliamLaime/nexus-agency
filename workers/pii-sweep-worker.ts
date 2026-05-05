import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { initSecurity, detectPII, auditLog } from '../security/index.js'

const MEMORY_DIR = join(process.cwd(), 'memory', 'store')
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000

async function sweepMemory(): Promise<void> {
  let files: string[]
  try {
    files = await readdir(MEMORY_DIR)
  } catch {
    return
  }

  let totalEntries = 0
  let flaggedFiles = 0

  for (const file of files) {
    if (!file.endsWith('.enc.json')) continue

    try {
      const raw = await readFile(join(MEMORY_DIR, file), 'utf8')
      const entries = JSON.parse(raw) as Array<{ key: string; value: unknown }>

      for (const entry of entries) {
        totalEntries++
        const serialized = JSON.stringify(entry.value)
        const result = await detectPII(serialized, 'memory-sweep', 'pii-sweep-worker')

        if (!result.clean) {
          flaggedFiles++
          await auditLog({
            agentName: 'pii-sweep-worker',
            action: 'PII_RESIDUAL_DETECTED',
            namespace: 'memory-sweep',
            piiDetected: true,
            outcome: 'BLOCKED',
            metadata: {
              file,
              entryKey: String(entry.key).slice(0, 64),
              types: result.detectedTypes.join(','),
            },
          })
        }
      }
    } catch {
      // skip unreadable or invalid files
    }
  }

  await auditLog({
    agentName: 'pii-sweep-worker',
    action: 'PII_SWEEP_COMPLETE',
    namespace: 'system',
    outcome: 'ALLOWED',
    metadata: { totalEntries, flaggedFiles },
  })
}

async function main(): Promise<void> {
  await initSecurity()

  await auditLog({
    agentName: 'pii-sweep-worker',
    action: 'WORKER_STARTED',
    namespace: 'system',
    outcome: 'ALLOWED',
  })

  await sweepMemory()
  setInterval(() => { void sweepMemory() }, SWEEP_INTERVAL_MS)
}

main().catch((err) => {
  console.error('[pii-sweep-worker] Fatal error:', err)
  process.exit(1)
})
