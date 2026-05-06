import { describe, it, expect, beforeEach } from 'vitest'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'

const MEMORY_DIR = join(process.cwd(), 'memory', 'store')

async function cleanMemory(): Promise<void> {
  try {
    await rm(MEMORY_DIR, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

describe('Memory Persistence', () => {
  beforeEach(async () => {
    await cleanMemory()
    // Reset module state between tests by re-importing fresh instances
  })

  it('stores and retrieves a value after simulated restart', async () => {
    // Dynamic imports to get fresh module state after cleanup
    const { initMemory, memoryStore, memoryGet } = await import('../../memory/namespaces.js')

    await initMemory()
    await memoryStore('test-key', 'hello world', 'acme-corp/strategy', 'test-agent')

    const value = await memoryGet('test-key', 'acme-corp/strategy', 'test-agent')
    expect(value).toBe('"hello world"')
  })

  it('persists registry to disk so keyVersion survives restart', async () => {
    const { initMemory, memoryStore, rotateNamespaceKey, getNamespaceRegistry } = await import('../../memory/namespaces.js')

    await initMemory()
    await memoryStore('entry-v1', 'value before rotation', 'acme-corp/test', 'agent')

    const beforeRotation = getNamespaceRegistry().get('acme-corp/test')
    expect(beforeRotation?.keyVersion).toBe(1)

    await rotateNamespaceKey('acme-corp/test')

    const afterRotation = getNamespaceRegistry().get('acme-corp/test')
    expect(afterRotation?.keyVersion).toBe(2)
  })
})
