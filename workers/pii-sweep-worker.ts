import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { initSecurity, detectPII, auditLog, decrypt } from '../security/index.js'
import type { EncryptedPayload } from '../security/index.js'

const MEMORY_DIR = join(process.cwd(), 'memory', 'store')
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000

interface StoredEntry {
  key: string
  value: EncryptedPayload
  namespace: string
  storedAt: string
}

async function sweepMemory(): Promise<void> {
  let files: string[]
  try {
    files = await readdir(MEMORY_DIR)
  } catch {
    return
  }

  let totalEntries = 0
  let flaggedEntries = 0
  let errorEntries = 0

  for (const file of files) {
    if (!file.endsWith('.enc.json') || file === 'registry.json') continue

    try {
      const raw = await readFile(join(MEMORY_DIR, file), 'utf8')
      const entries = JSON.parse(raw) as StoredEntry[]

      for (const entry of entries) {
        totalEntries++
        try {
          const plaintext = await decrypt(entry.value, entry.namespace)
          const result = await detectPII(plaintext, 'memory-sweep', 'pii-sweep-worker')

          if (!result.clean) {
            flaggedEntries++
            await auditLog({
              agentName: 'pii-sweep-worker',
              action: 'PII_RESIDUAL_DETECTED',
              namespace: entry.namespace,
              piiDetected: true,
              outcome: 'BLOCKED',
              metadata: {
                file,
                entryKey: String(entry.key).slice(0, 64),
                types: result.detectedTypes.join(','),
              },
            })
          }
        } catch {
          // corrupted entry or missing key version — skip without stopping the sweep
          errorEntries++
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
    metadata: { totalEntries, flaggedEntries, errorEntries },
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

  const once = process.argv.includes('--once')
  if (!once) {
    setInterval(() => { void sweepMemory() }, SWEEP_INTERVAL_MS)
  }
}

main().catch((err) => {
  console.error('[pii-sweep-worker] Fatal error:', err)
  process.exit(1)
})
