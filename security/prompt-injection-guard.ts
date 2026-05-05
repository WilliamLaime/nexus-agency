import { auditLog } from './audit-logger.js'
import { downgradeTrust } from './trust-policy.js'

export interface GuardResult {
  safe: boolean
  pattern?: string
  category?: string
}

interface InjectionPattern {
  category: string
  regex: RegExp
  description: string
}

const INJECTION_PATTERNS: InjectionPattern[] = [
  // Direct override
  {
    category: 'DIRECT_OVERRIDE',
    regex: /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/i,
    description: 'ignore previous instructions',
  },
  {
    category: 'DIRECT_OVERRIDE',
    regex: /disregard\s+(?:everything|all|the|your)/i,
    description: 'disregard directive',
  },
  {
    category: 'DIRECT_OVERRIDE',
    regex: /forget\s+(?:your|all|the|everything)/i,
    description: 'forget directive',
  },
  {
    category: 'DIRECT_OVERRIDE',
    regex: /new\s+instructions?\s*:/i,
    description: 'new instructions injection',
  },
  {
    category: 'DIRECT_OVERRIDE',
    regex: /\[SYSTEM\]/,
    description: '[SYSTEM] tag',
  },
  {
    category: 'DIRECT_OVERRIDE',
    regex: /<\|system\|>/,
    description: '<|system|> tag',
  },
  {
    category: 'DIRECT_OVERRIDE',
    regex: /###\s*INSTRUCTION/i,
    description: '### INSTRUCTION block',
  },
  // Role hijacking
  {
    category: 'ROLE_HIJACKING',
    regex: /you\s+are\s+now\s+(?:a|an|the)\s/i,
    description: 'you are now [role]',
  },
  {
    category: 'ROLE_HIJACKING',
    regex: /act\s+as\s+(?:if\s+)?(?:a|an|the|you|though)/i,
    description: 'act as [role]',
  },
  {
    category: 'ROLE_HIJACKING',
    regex: /pretend\s+(?:you\s+are|to\s+be|that)/i,
    description: 'pretend to be [role]',
  },
  {
    category: 'ROLE_HIJACKING',
    regex: /roleplay\s+as\b/i,
    description: 'roleplay as [role]',
  },
  {
    category: 'ROLE_HIJACKING',
    regex: /simulate\s+being\b/i,
    description: 'simulate being [role]',
  },
  // Jailbreak
  {
    category: 'JAILBREAK',
    regex: /\bDAN\s+(?:mode|prompt)\b/i,
    description: 'DAN mode/prompt',
  },
  {
    category: 'JAILBREAK',
    regex: /developer\s+mode\s+(?:enabled|on|active)/i,
    description: 'developer mode activation',
  },
  {
    category: 'JAILBREAK',
    regex: /jailbreak/i,
    description: 'jailbreak keyword',
  },
  {
    category: 'JAILBREAK',
    regex: /bypass\s+(?:safety|filter|restriction|guard|check)/i,
    description: 'bypass safety filter',
  },
  {
    category: 'JAILBREAK',
    regex: /no\s+restrictions?\s*(?:mode|enabled|on)?/i,
    description: 'no restrictions mode',
  },
  {
    category: 'JAILBREAK',
    regex: /without\s+(?:any\s+)?(?:restrictions?|limits?|rules?|guidelines?)/i,
    description: 'without restrictions',
  },
  // Context injection
  {
    category: 'CONTEXT_INJECTION',
    regex: /```\s*(?:system|instructions?)\b/i,
    description: 'system code block',
  },
  {
    category: 'CONTEXT_INJECTION',
    regex: /<!--\s*(?:system|override|instructions?)/i,
    description: 'HTML comment override',
  },
  {
    category: 'CONTEXT_INJECTION',
    regex: /\[INST\]/,
    description: '[INST] tag',
  },
  {
    category: 'CONTEXT_INJECTION',
    regex: /<<SYS>>/,
    description: '<<SYS>> tag',
  },
  {
    category: 'CONTEXT_INJECTION',
    regex: /<\/?s>\s*\[INST\]/,
    description: 'Llama-style injection',
  },
]

function tryDecodeBase64(text: string): string | null {
  try {
    const decoded = Buffer.from(text, 'base64').toString('utf8')
    if (/[\x00-\x08\x0E-\x1F\x7F]/.test(decoded)) return null
    return decoded
  } catch {
    return null
  }
}

function checkEncodedInjection(text: string): GuardResult {
  const b64Pattern = /[A-Za-z0-9+/]{20,}={0,2}/g
  const matches = text.match(b64Pattern) ?? []

  for (const match of matches) {
    const decoded = tryDecodeBase64(match)
    if (!decoded) continue

    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.regex.test(decoded)) {
        return {
          safe: false,
          pattern: `base64(${pattern.description})`,
          category: `ENCODED_${pattern.category}`,
        }
      }
    }
  }

  return { safe: true }
}

export async function guardPrompt(prompt: string, agentName: string, namespace: string): Promise<GuardResult> {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.regex.test(prompt)) {
      const result: GuardResult = {
        safe: false,
        pattern: pattern.description,
        category: pattern.category,
      }

      await auditLog({
        agentName,
        action: 'INJECTION_ATTEMPT',
        namespace,
        injectionAttempt: true,
        outcome: 'BLOCKED',
        metadata: { category: pattern.category, pattern: pattern.description },
      })

      await downgradeTrust(agentName, `prompt injection attempt: ${pattern.description}`)

      return result
    }
  }

  const encodedResult = checkEncodedInjection(prompt)
  if (!encodedResult.safe) {
    await auditLog({
      agentName,
      action: 'INJECTION_ATTEMPT_ENCODED',
      namespace,
      injectionAttempt: true,
      outcome: 'BLOCKED',
      metadata: {
        category: encodedResult.category ?? 'ENCODED',
        pattern: encodedResult.pattern ?? 'unknown',
      },
    })

    await downgradeTrust(agentName, `encoded injection attempt: ${encodedResult.pattern ?? 'unknown'}`)

    return encodedResult
  }

  return { safe: true }
}
