import { readFile, writeFile, mkdir, unlink, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { encrypt, decrypt, assertNamespaceAccess } from '../security/namespace-isolator.js'
import { detectPII } from '../security/pii-detector.js'
import { auditLog } from '../security/audit-logger.js'
import type { EncryptedPayload } from '../security/namespace-isolator.js'

const MEMORY_DIR = join(process.cwd(), 'memory', 'store')

export interface NamespaceEntry {
  keyVersion: number
  createdAt: string
  lastAccessed: string
  entryCount: number
}

export interface MemoryEntry {
  key: string
  namespace: string
  storedAt: string
}

interface StoredMemory {
  key: string
  value: EncryptedPayload
  storedAt: string
  namespace: string
}

const registry = new Map<string, NamespaceEntry>()

async function ensureDir(): Promise<void> {
  await mkdir(MEMORY_DIR, { recursive: true })
}

function namespacePath(namespace: string, keyVersion: number): string {
  const safe = namespace.replace(/[^a-zA-Z0-9\-_]/g, '_')
  return join(MEMORY_DIR, `${safe}-v${keyVersion}.enc.json`)
}

async function loadStore(namespace: string, keyVersion: number): Promise<Map<string, StoredMemory>> {
  const path = namespacePath(namespace, keyVersion)
  try {
    const raw = await readFile(path, 'utf8')
    const entries = JSON.parse(raw) as StoredMemory[]
    const map = new Map<string, StoredMemory>()
    for (const entry of entries) {
      map.set(entry.key, entry)
    }
    return map
  } catch {
    return new Map()
  }
}

async function saveStore(namespace: string, keyVersion: number, store: Map<string, StoredMemory>): Promise<void> {
  await ensureDir()
  const path = namespacePath(namespace, keyVersion)
  const entries = [...store.values()]
  await writeFile(path, JSON.stringify(entries, null, 2), 'utf8')
}

function getOrCreateMeta(namespace: string): NamespaceEntry {
  const existing = registry.get(namespace)
  if (existing) return existing
  const meta: NamespaceEntry = {
    keyVersion: 1,
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
    entryCount: 0,
  }
  registry.set(namespace, meta)
  return meta
}

export async function memoryStore(
  key: string,
  value: unknown,
  namespace: string,
  agentName = 'unknown'
): Promise<void> {
  const meta = getOrCreateMeta(namespace)
  meta.lastAccessed = new Date().toISOString()

  const serialized = JSON.stringify(value)

  const piiResult = await detectPII(serialized, namespace, agentName)
  if (piiResult.blocked) {
    throw new Error(`Memory storage blocked: PII detected (types: ${piiResult.detectedTypes.join(', ')})`)
  }

  const payload = await encrypt(piiResult.redactedText, namespace)
  const store = await loadStore(namespace, meta.keyVersion)

  const entry: StoredMemory = {
    key,
    value: payload,
    storedAt: new Date().toISOString(),
    namespace,
  }

  store.set(key, entry)
  await saveStore(namespace, meta.keyVersion, store)

  meta.entryCount = store.size
  registry.set(namespace, meta)

  await auditLog({
    agentName,
    action: 'MEMORY_STORE',
    namespace,
    outcome: 'ALLOWED',
    metadata: { key, piiRedacted: !piiResult.clean },
  })
}

export async function memorySearch(
  query: string,
  namespace: string,
  agentName = 'unknown',
  requestingNamespace?: string
): Promise<MemoryEntry[]> {
  if (requestingNamespace !== undefined) {
    assertNamespaceAccess(agentName, namespace, requestingNamespace)
  }

  const meta = getOrCreateMeta(namespace)
  meta.lastAccessed = new Date().toISOString()
  registry.set(namespace, meta)

  const store = await loadStore(namespace, meta.keyVersion)
  const queryLower = query.toLowerCase()
  const results: MemoryEntry[] = []

  for (const [key, entry] of store) {
    try {
      const decrypted = await decrypt(entry.value, namespace)
      if (decrypted.toLowerCase().includes(queryLower) || key.toLowerCase().includes(queryLower)) {
        results.push({ key, namespace, storedAt: entry.storedAt })
      }
    } catch {
      // skip corrupted entries
    }
  }

  await auditLog({
    agentName,
    action: 'MEMORY_SEARCH',
    namespace,
    outcome: 'ALLOWED',
    metadata: { query: query.slice(0, 64), resultCount: results.length },
  })

  return results
}

export async function memoryGet(
  key: string,
  namespace: string,
  agentName = 'unknown'
): Promise<string | null> {
  const meta = getOrCreateMeta(namespace)
  const store = await loadStore(namespace, meta.keyVersion)
  const entry = store.get(key)
  if (!entry) return null

  const decrypted = await decrypt(entry.value, namespace)

  await auditLog({
    agentName,
    action: 'MEMORY_GET',
    namespace,
    outcome: 'ALLOWED',
    metadata: { key },
  })

  return decrypted
}

export async function memoryDelete(key: string, namespace: string, agentName = 'unknown'): Promise<boolean> {
  const meta = getOrCreateMeta(namespace)
  const store = await loadStore(namespace, meta.keyVersion)
  const existed = store.delete(key)

  if (existed) {
    await saveStore(namespace, meta.keyVersion, store)
    meta.entryCount = store.size
    registry.set(namespace, meta)

    await auditLog({
      agentName,
      action: 'MEMORY_DELETE',
      namespace,
      outcome: 'ALLOWED',
      metadata: { key },
    })
  }

  return existed
}

export async function pruneNamespace(namespace: string, agentName = 'unknown'): Promise<void> {
  await ensureDir()
  const files = await readdir(MEMORY_DIR)
  const safe = namespace.replace(/[^a-zA-Z0-9\-_]/g, '_')

  for (const file of files) {
    if (file.startsWith(`${safe}-v`) && file.endsWith('.enc.json')) {
      await unlink(join(MEMORY_DIR, file))
    }
  }

  registry.delete(namespace)

  await auditLog({
    agentName,
    action: 'NAMESPACE_PRUNED',
    namespace,
    outcome: 'ALLOWED',
  })
}

export function getNamespaceRegistry(): ReadonlyMap<string, NamespaceEntry> {
  return registry
}
