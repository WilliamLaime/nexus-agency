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

// Patterns ordered by category. Add language-specific patterns explicitly — do NOT rely on autotranslation.
const INJECTION_PATTERNS: InjectionPattern[] = [
  // ── DIRECT_OVERRIDE — EN ──────────────────────────────────────────────────
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
    regex: /follow\s+these\s+new\s+directives?\s+instead/i,
    description: 'follow new directives',
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
  // ── DIRECT_OVERRIDE — FR ──────────────────────────────────────────────────
  {
    category: 'DIRECT_OVERRIDE',
    regex: /ignore[rz]?\s+(?:les?\s+|toutes\s+(?:les\s+)?)?instructions?\s+(?:précédent|antérieur|au-dessus|précédant)/i,
    description: 'ignore previous instructions (FR)',
  },
  {
    category: 'DIRECT_OVERRIDE',
    regex: /oubli[ez]?\s+(?:tes?|tout|les?|toutes?)/i,
    description: 'forget directive (FR)',
  },
  {
    category: 'DIRECT_OVERRIDE',
    regex: /nouvelles?\s+instructions?\s*:/i,
    description: 'new instructions (FR)',
  },
  {
    category: 'DIRECT_OVERRIDE',
    regex: /ne\s+tiens\s+(?:plus\s+)?compte\s+(?:de\s+)?(?:tes|les|tout)/i,
    description: 'disregard (FR)',
  },
  // ── ROLE_HIJACKING — EN ───────────────────────────────────────────────────
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
  // ── ROLE_HIJACKING — FR ───────────────────────────────────────────────────
  {
    category: 'ROLE_HIJACKING',
    regex: /tu\s+es\s+(?:maintenant|désormais)\s+(?:un|une|le|la)\s/i,
    description: 'you are now [role] (FR)',
  },
  {
    category: 'ROLE_HIJACKING',
    regex: /agis\s+comme\s+(?:si\s+)?(?:un|une|tu)/i,
    description: 'act as (FR)',
  },
  {
    category: 'ROLE_HIJACKING',
    regex: /fais\s+(?:comme\s+)?(?:si|semblant)/i,
    description: 'pretend (FR)',
  },
  {
    category: 'ROLE_HIJACKING',
    regex: /joue\s+le\s+r[oô]le\s+(?:de|du|d['']un|d['']une)/i,
    description: 'roleplay as (FR)',
  },
  // ── JAILBREAK — EN ────────────────────────────────────────────────────────
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
    regex: /bypass\s+(?:safety|filter|restriction|guard|check|rules?|guidelines?)/i,
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
  // ── JAILBREAK — FR ────────────────────────────────────────────────────────
  {
    category: 'JAILBREAK',
    regex: /contourne[rz]?\s+(?:la\s+)?(?:sécurité|filtre|restriction|garde|protection|règles?)/i,
    description: 'bypass safety (FR)',
  },
  {
    category: 'JAILBREAK',
    regex: /sans\s+(?:aucune\s+)?(?:restriction|limite|règle|directive)/i,
    description: 'without restrictions (FR)',
  },
  {
    category: 'JAILBREAK',
    regex: /mode\s+(?:développeur|debug|admin)\s+(?:activ|on|engag)/i,
    description: 'developer mode (FR)',
  },
  // ── CONTEXT_INJECTION — EN ────────────────────────────────────────────────
  {
    category: 'CONTEXT_INJECTION',
    regex: /#{1,6}\s*SYSTEM\s+(?:PROMPT|OVERRIDE|INSTRUCTION)/i,
    description: 'markdown system header',
  },
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
  // ── CONTEXT_INJECTION — FR ────────────────────────────────────────────────
  {
    category: 'CONTEXT_INJECTION',
    regex: /<!--\s*(?:système|consigne|instruction)/i,
    description: 'HTML comment override (FR)',
  },
  {
    category: 'CONTEXT_INJECTION',
    regex: /```\s*(?:système|consignes?|instructions?)\b/i,
    description: 'system code block (FR)',
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
