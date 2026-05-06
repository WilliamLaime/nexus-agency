import { describe, it, expect, beforeEach } from 'vitest'
import { writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { verifyAuditChain, initAuditLogger, auditLog } from '../../security/audit-logger.js'

const GENESIS = '0'.repeat(64)

function makeEntry(prevHash: string, index: number): object {
  const base = {
    agentName: 'test',
    action: `ACTION_${index}`,
    namespace: 'test/audit',
    outcome: 'ALLOWED',
    timestamp: new Date().toISOString(),
    sessionId: 'test-session',
    prevHash,
  }
  const hash = createHash('sha256').update(JSON.stringify(base)).digest('hex')
  return { ...base, hash }
}

async function writeChain(path: string, count: number): Promise<void> {
  const lines: string[] = []
  let prev = GENESIS
  for (let i = 0; i < count; i++) {
    const entry = makeEntry(prev, i) as Record<string, unknown>
    const hash = entry['hash'] as string
    lines.push(JSON.stringify(entry))
    prev = hash
  }
  await writeFile(path, lines.join('\n') + '\n', 'utf8')
}

describe('Audit Chain', () => {
  const tmpPath = join(tmpdir(), `nexus-audit-chain-test-${Date.now()}.jsonl`)

  it('verifies a valid chain of 5 entries', async () => {
    await writeChain(tmpPath, 5)
    const result = await verifyAuditChain(tmpPath)
    expect(result.valid).toBe(true)
    expect(result.brokenAt).toBeUndefined()
  })

  it('detects a break when line 3 is modified', async () => {
    await writeChain(tmpPath, 5)
    const content = await import('node:fs/promises').then((fs) => fs.readFile(tmpPath, 'utf8'))
    const lines = content.trimEnd().split('\n')
    // Tamper line 3 (index 2)
    const line2 = lines[2]
    if (line2) {
      const entry = JSON.parse(line2) as Record<string, unknown>
      entry['action'] = 'TAMPERED'
      lines[2] = JSON.stringify(entry)
    }
    await writeFile(tmpPath, lines.join('\n') + '\n', 'utf8')

    const result = await verifyAuditChain(tmpPath)
    expect(result.valid).toBe(false)
    expect(result.brokenAt).toBe(3)
  })

  it('returns valid for non-existent file', async () => {
    const result = await verifyAuditChain('/tmp/nexus-does-not-exist.jsonl')
    expect(result.valid).toBe(true)
  })
})
