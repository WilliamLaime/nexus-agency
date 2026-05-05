import { createHmac, timingSafeEqual } from 'node:crypto'
import { auditLog } from './audit-logger.js'

export type TrustLevel = 'TRUSTED' | 'VERIFIED' | 'UNTRUSTED'

const TRUST_RANK: Record<TrustLevel, number> = {
  TRUSTED: 3,
  VERIFIED: 2,
  UNTRUSTED: 1,
}

const violations = new Map<string, number>()
const downgrades = new Map<string, TrustLevel>()

export function assertTrustLevel(actual: TrustLevel, required: TrustLevel, agentName = 'unknown'): void {
  if (TRUST_RANK[actual] < TRUST_RANK[required]) {
    void auditLog({
      agentName,
      action: 'TRUST_ASSERTION_FAILED',
      namespace: 'system',
      trustLevel: actual,
      outcome: 'BLOCKED',
      metadata: { required, actual },
    })
    throw new Error(`Trust level insufficient: required "${required}", got "${actual}" for agent "${agentName}"`)
  }
}

export async function evaluateTrust(agentName: string, token?: string): Promise<TrustLevel> {
  const downgraded = downgrades.get(agentName)
  if (downgraded !== undefined) return downgraded

  const trustedAgents = (process.env['NEXUS_TRUSTED_AGENTS'] ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (trustedAgents.includes(agentName)) return 'TRUSTED'

  if (token !== undefined && token.length > 0) {
    const isValid = await verifyAgentToken(agentName, token)
    if (isValid) return 'VERIFIED'
  }

  return 'UNTRUSTED'
}

async function verifyAgentToken(agentName: string, token: string): Promise<boolean> {
  const secret = process.env['NEXUS_AGENT_SECRET']
  if (!secret) return false

  try {
    const [header, payload, signature] = token.split('.')
    if (!header || !payload || !signature) return false

    const expectedSig = createHmac('sha256', secret)
      .update(`${header}.${payload}`)
      .digest('base64url')

    const sigBuf = Buffer.from(signature, 'base64url')
    const expectedBuf = Buffer.from(expectedSig, 'base64url')

    if (sigBuf.length !== expectedBuf.length) return false
    if (!timingSafeEqual(sigBuf, expectedBuf)) return false

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>
    if (decoded['sub'] !== agentName) return false

    const exp = decoded['exp']
    if (typeof exp === 'number' && exp < Math.floor(Date.now() / 1000)) return false

    return true
  } catch {
    return false
  }
}

export async function downgradeTrust(agentName: string, reason: string): Promise<void> {
  const current = downgrades.get(agentName) ?? 'VERIFIED'
  const newLevel: TrustLevel = current === 'TRUSTED' ? 'VERIFIED' : 'UNTRUSTED'
  downgrades.set(agentName, newLevel)

  await auditLog({
    agentName,
    action: 'TRUST_DOWNGRADE',
    namespace: 'system',
    trustLevel: newLevel,
    outcome: 'ALLOWED',
    metadata: { reason, previousLevel: current, newLevel },
  })
}

export async function recordViolation(agentName: string, namespace: string): Promise<void> {
  const count = (violations.get(agentName) ?? 0) + 1
  violations.set(agentName, count)

  if (count >= 3) {
    await downgradeTrust(agentName, `${count} violations recorded`)
    violations.set(agentName, 0)
  }
}

export function resetTrust(agentName: string): void {
  downgrades.delete(agentName)
  violations.delete(agentName)
}
