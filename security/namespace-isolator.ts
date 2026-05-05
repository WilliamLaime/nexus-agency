import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'node:crypto'
import { auditLog } from './audit-logger.js'

export interface EncryptedPayload {
  iv: string
  authTag: string
  ciphertext: string
  keyVersion: number
}

interface NamespaceMetadata {
  keyVersion: number
  createdAt: string
  lastRotatedAt: string
}

const namespaceRegistry = new Map<string, NamespaceMetadata>()

function getMasterKey(): Buffer {
  const raw = process.env['NEXUS_MEMORY_ENCRYPTION_KEY']
  if (!raw) throw new Error('NEXUS_MEMORY_ENCRYPTION_KEY is not set')
  const buf = Buffer.from(raw, 'base64')
  if (buf.length < 32) throw new Error('NEXUS_MEMORY_ENCRYPTION_KEY must be at least 32 bytes (base64-encoded)')
  return buf.slice(0, 32)
}

export function deriveKey(masterKey: Buffer, namespace: string, version = 1): Buffer {
  const salt = `${namespace}:v${version}`
  return createHmac('sha256', masterKey).update(salt).update('nexus-namespace').digest()
}

function getOrCreateMetadata(namespace: string): NamespaceMetadata {
  const existing = namespaceRegistry.get(namespace)
  if (existing) return existing
  const meta: NamespaceMetadata = {
    keyVersion: 1,
    createdAt: new Date().toISOString(),
    lastRotatedAt: new Date().toISOString(),
  }
  namespaceRegistry.set(namespace, meta)
  return meta
}

export async function encrypt(plaintext: string, namespace: string): Promise<EncryptedPayload> {
  const masterKey = getMasterKey()
  const meta = getOrCreateMetadata(namespace)
  const key = deriveKey(masterKey, namespace, meta.keyVersion)

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
    keyVersion: meta.keyVersion,
  }
}

export async function decrypt(payload: EncryptedPayload, namespace: string): Promise<string> {
  const masterKey = getMasterKey()
  const key = deriveKey(masterKey, namespace, payload.keyVersion)

  const iv = Buffer.from(payload.iv, 'hex')
  const authTag = Buffer.from(payload.authTag, 'hex')
  const ciphertext = Buffer.from(payload.ciphertext, 'hex')

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return decrypted.toString('utf8')
}

export async function rotateNamespaceKey(namespace: string): Promise<void> {
  const meta = getOrCreateMetadata(namespace)
  const oldVersion = meta.keyVersion
  meta.keyVersion += 1
  meta.lastRotatedAt = new Date().toISOString()
  namespaceRegistry.set(namespace, meta)

  await auditLog({
    agentName: 'namespace-isolator',
    action: 'KEY_ROTATION',
    namespace,
    outcome: 'ALLOWED',
    metadata: { oldVersion, newVersion: meta.keyVersion },
  })
}

export function getNamespaceMetadata(namespace: string): NamespaceMetadata | undefined {
  return namespaceRegistry.get(namespace)
}

export function assertNamespaceAccess(requestingAgent: string, requestedNamespace: string, agentNamespace: string): void {
  const [agentClient] = agentNamespace.split('-')
  const [requestedClient] = requestedNamespace.split('-')

  if (agentClient !== requestedClient) {
    void auditLog({
      agentName: requestingAgent,
      action: 'NAMESPACE_ACCESS_VIOLATION',
      namespace: requestedNamespace,
      outcome: 'BLOCKED',
      metadata: { agentNamespace, requestedNamespace },
    })
    throw new Error(
      `Namespace isolation violation: agent in namespace "${agentNamespace}" cannot access "${requestedNamespace}"`
    )
  }
}
