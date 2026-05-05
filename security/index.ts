export { initAuditLogger, auditLog, pruneOldLogs } from './audit-logger.js'
export type { AuditEvent, AuditOutcome } from './audit-logger.js'

export { validateInput, safeValidateInput, sanitizePrompt, AgentInputSchema, TrustLevelEnum } from './input-validator.js'
export type { AgentInput } from './input-validator.js'

export { detectPII, configurePolicy } from './pii-detector.js'
export type { PIIType, PIIPolicy, PIIDetectionResult } from './pii-detector.js'

export { encrypt, decrypt, rotateNamespaceKey, deriveKey, getNamespaceMetadata, assertNamespaceAccess } from './namespace-isolator.js'
export type { EncryptedPayload } from './namespace-isolator.js'

export { assertTrustLevel, evaluateTrust, downgradeTrust, recordViolation, resetTrust } from './trust-policy.js'
export type { TrustLevel } from './trust-policy.js'

export { guardPrompt } from './prompt-injection-guard.js'
export type { GuardResult } from './prompt-injection-guard.js'

export { scanOutput } from './secret-scanner.js'
export type { ScanResult, SecretFinding } from './secret-scanner.js'

export { runCVEAudit, generateReport } from './cve-monitor.js'
export type { CVEReport, Advisory } from './cve-monitor.js'

import { initAuditLogger, auditLog } from './audit-logger.js'
import { AgentInputSchema, validateInput, sanitizePrompt } from './input-validator.js'
import { detectPII } from './pii-detector.js'
import { guardPrompt } from './prompt-injection-guard.js'
import { scanOutput } from './secret-scanner.js'
import type { TrustLevel } from './trust-policy.js'

export interface AgentCallContext {
  agentName: string
  namespace: string
  trustLevel: TrustLevel
  sessionId?: string
}

export type AgentFn = (input: string, context: AgentCallContext) => Promise<string>

export async function initSecurity(): Promise<void> {
  const encKey = process.env['NEXUS_MEMORY_ENCRYPTION_KEY']
  if (!encKey) {
    throw new Error('NEXUS_MEMORY_ENCRYPTION_KEY is required. Generate with: openssl rand -base64 32')
  }
  if (Buffer.from(encKey, 'base64').length < 32) {
    throw new Error('NEXUS_MEMORY_ENCRYPTION_KEY must be at least 32 bytes (base64-encoded)')
  }

  const claudeSettings = process.env['NEXUS_SKIP_CVE2026_CHECK'] !== 'true'
  if (claudeSettings) {
    checkCVE202621852()
  }

  await initAuditLogger()

  await auditLog({
    agentName: 'nexus-security',
    action: 'SECURITY_LAYER_INITIALIZED',
    namespace: 'system',
    outcome: 'ALLOWED',
    metadata: {
      bankingMode: process.env['NEXUS_BANKING_MODE'] === 'true',
      trustLevel: process.env['NEXUS_TRUST_LEVEL'] ?? 'VERIFIED',
      piiPolicy: process.env['NEXUS_PII_POLICY'] ?? 'REDACT',
    },
  })
}

function checkCVE202621852(): void {
  const baseUrl = process.env['ANTHROPIC_BASE_URL']
  if (baseUrl && !baseUrl.includes('api.anthropic.com')) {
    throw new Error(
      `CVE-2026-21852: ANTHROPIC_BASE_URL is set to "${baseUrl}" which redirects API calls away from Anthropic. ` +
        'This is a known attack vector. Remove ANTHROPIC_BASE_URL from your environment or repo config.'
    )
  }
}

export async function withSecurityContext(agentFn: AgentFn, input: string, context: AgentCallContext): Promise<string> {
  const { agentName, namespace } = context

  const sanitized = sanitizePrompt(input)

  const guardResult = await guardPrompt(sanitized, agentName, namespace)
  if (!guardResult.safe) {
    throw new Error(`Prompt injection detected [${guardResult.category}]: ${guardResult.pattern}`)
  }

  validateInput(
    AgentInputSchema,
    { prompt: sanitized, namespace, agentName, trustLevel: context.trustLevel },
    agentName,
    namespace
  )

  const inputPII = await detectPII(sanitized, namespace, agentName)
  if (inputPII.blocked) {
    throw new Error(`Input blocked: PII detected (types: ${inputPII.detectedTypes.join(', ')})`)
  }

  const cleanInput = inputPII.redactedText

  const start = Date.now()
  const rawOutput = await agentFn(cleanInput, context)
  const durationMs = Date.now() - start

  const outputPII = await detectPII(rawOutput, namespace, agentName)
  if (outputPII.blocked) {
    throw new Error(`Output blocked: PII detected in agent output (types: ${outputPII.detectedTypes.join(', ')})`)
  }

  const scanResult = await scanOutput(outputPII.redactedText, agentName, namespace)

  await auditLog({
    agentName,
    action: 'AGENT_CALL_COMPLETE',
    namespace,
    trustLevel: context.trustLevel,
    piiDetected: !inputPII.clean || !outputPII.clean,
    outcome: 'ALLOWED',
    durationMs,
    metadata: { secretsFound: scanResult.findings.length },
  })

  return scanResult.sanitizedOutput
}
