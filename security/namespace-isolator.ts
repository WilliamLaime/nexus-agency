import { createCipheriv, createDecipheriv, randomBytes, createHmac } from 'node:crypto'
import { auditLog } from './audit-logger.js'

export interface EncryptedPayload {
  iv: string
  authTag: string
  ciphertext: string
  keyVersion: number
}

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

export async function encrypt(plaintext: string, namespace: string, keyVersion = 1): Promise<EncryptedPayload> {
  const masterKey = getMasterKey()
  const key = deriveKey(masterKey, namespace, keyVersion)

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
    keyVersion,
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

// Namespace format: "{clientId}/{domain}" — slash is the guaranteed delimiter.
// Client slugs must not contain slashes. Example: "acme-corp/strategy".
export function assertNamespaceAccess(requestingAgent: string, requestedNamespace: string, agentNamespace: string): void {
  const [agentClient] = agentNamespace.split('/', 2)
  const [requestedClient] = requestedNamespace.split('/', 2)

  if (!agentClient || !requestedClient || agentClient !== requestedClient) {
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
