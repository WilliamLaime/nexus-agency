import { createHash } from 'node:crypto'
import { auditLog } from './audit-logger.js'

export type PIIType =
  | 'EMAIL'
  | 'PHONE_FR'
  | 'IBAN'
  | 'CREDIT_CARD'
  | 'SIRET'
  | 'NIR'
  | 'PASSWORD'
  | 'API_KEY'
  | 'TOKEN'
  | 'IP_ADDRESS'
  | 'FULL_NAME'
  | 'BIRTH_DATE'
  | 'CONTRACT_NUMBER'
  | 'HEALTH_DATA'

export type PIIPolicy = 'BLOCK' | 'REDACT' | 'HASH' | 'PASS'

export interface PIIDetectionResult {
  clean: boolean
  redactedText: string
  detectedTypes: PIIType[]
  blocked: boolean
}

interface PIIPattern {
  type: PIIType
  regex: RegExp
  defaultPolicy: PIIPolicy
  bankingPolicy: PIIPolicy
  validate?: (match: string) => boolean
}

function luhnCheck(num: string): boolean {
  const digits = num.replace(/\D/g, '')
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    const char = digits[i]
    if (char === undefined) continue
    let n = parseInt(char, 10)
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

function siretCheck(num: string): boolean {
  const digits = num.replace(/\s/g, '')
  if (digits.length !== 14) return false
  return luhnCheck(digits)
}

function ibanCheck(input: string): boolean {
  const cleaned = input.replace(/[\s\-]/g, '').toUpperCase()
  if (cleaned.length < 15 || cleaned.length > 34) return false
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4)
  let numeric = ''
  for (const ch of rearranged) {
    if (ch >= '0' && ch <= '9') numeric += ch
    else if (ch >= 'A' && ch <= 'Z') numeric += String(ch.charCodeAt(0) - 55)
    else return false
  }
  let remainder = 0
  for (const ch of numeric) {
    remainder = (remainder * 10 + parseInt(ch, 10)) % 97
  }
  return remainder === 1
}

function nirCheck(input: string): boolean {
  const cleaned = input.replace(/[\s.\-]/g, '')
  if (cleaned.length !== 15) return false
  const number = cleaned.slice(0, 13)
  const key = parseInt(cleaned.slice(13), 10)
  // Corse: 2A → 19, 2B → 18
  let normalized = number
  if (number.slice(5, 7) === '2A') normalized = number.slice(0, 5) + '19' + number.slice(7)
  else if (number.slice(5, 7) === '2B') normalized = number.slice(0, 5) + '18' + number.slice(7)
  if (!/^\d{13}$/.test(normalized)) return false
  const expected = 97 - Number(BigInt(normalized) % 97n)
  return expected === key
}

const HEALTH_TERMS = [
  // FR
  'diagnostic',
  'pathologie',
  'ordonnance',
  'médicament',
  'traitement',
  'chirurgie',
  'hospitalisation',
  'antécédent médical',
  'icd-',
  'cim-10',
  'dossier médical',
  // EN
  'diagnosis',
  'prescription',
  'medication',
  'surgery',
  'hospitalization',
  'medical history',
  'icd-10',
  'patient record',
]

const PII_PATTERNS: PIIPattern[] = [
  {
    type: 'EMAIL',
    regex: /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
    defaultPolicy: 'REDACT',
    bankingPolicy: 'REDACT',
  },
  {
    type: 'PHONE_FR',
    regex: /\b(?:(?:\+33|0033|0)[1-9](?:[\s.\-]?\d{2}){4})\b/g,
    defaultPolicy: 'REDACT',
    bankingPolicy: 'REDACT',
  },
  {
    type: 'IBAN',
    regex: /\b[A-Z]{2}\d{2}(?:[\s\-]?[A-Z0-9]{4}){2,7}(?:[\s\-]?[A-Z0-9]{1,4})?\b/g,
    defaultPolicy: 'BLOCK',
    bankingPolicy: 'BLOCK',
    validate: ibanCheck,
  },
  {
    type: 'CREDIT_CARD',
    regex: /\b(?:\d[\s\-]?){13,19}\b/g,
    defaultPolicy: 'BLOCK',
    bankingPolicy: 'BLOCK',
    validate: (m) => {
      const digits = m.replace(/[\s\-]/g, '')
      return digits.length >= 13 && digits.length <= 19 && luhnCheck(digits)
    },
  },
  {
    type: 'SIRET',
    regex: /\b\d{3}[\s.\-]?\d{3}[\s.\-]?\d{3}[\s.\-]?\d{5}\b/g,
    defaultPolicy: 'REDACT',
    bankingPolicy: 'REDACT',
    validate: siretCheck,
  },
  {
    type: 'NIR',
    regex: /\b[12](?:[\s.\-]?\d){12,14}\b/g,
    defaultPolicy: 'BLOCK',
    bankingPolicy: 'BLOCK',
    validate: nirCheck,
  },
  {
    type: 'PASSWORD',
    regex: /(?:password|mot[\s_\-]?de[\s_\-]?passe|passwd|mdp|secret)\s*[:=]\s*\S{4,}/gi,
    defaultPolicy: 'BLOCK',
    bankingPolicy: 'BLOCK',
  },
  {
    type: 'API_KEY',
    regex: /\b(?:sk-|pk-|AIza|AKIA|xox[baprs]-)[A-Za-z0-9_\-]{16,}\b/g,
    defaultPolicy: 'BLOCK',
    bankingPolicy: 'BLOCK',
  },
  {
    type: 'TOKEN',
    regex: /\beyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\b|\bBearer\s+[A-Za-z0-9_\-\.]{20,}\b/g,
    defaultPolicy: 'BLOCK',
    bankingPolicy: 'BLOCK',
  },
  {
    type: 'IP_ADDRESS',
    regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b|(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    defaultPolicy: 'HASH',
    bankingPolicy: 'BLOCK',
  },
  {
    // FULL_NAME limitation: only detects names preceded by civility prefix (M., Mme, Dr, Pr).
    // Bare names like "Jean Dupont" CANNOT be reliably detected by regex.
    // For high-stakes deployments, complement with a NER model (spaCy fr_core_news_lg or CamemBERT-NER).
    type: 'FULL_NAME',
    regex: /\b(?:M\.|Mme\.?|Dr\.?|Pr\.?)\s+[A-ZÀ-Ÿ][a-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][a-zà-ÿ]+){1,2}\b/g,
    defaultPolicy: 'REDACT',
    bankingPolicy: 'REDACT',
  },
  {
    // BIRTH_DATE limitation: isolated dates like "12/03/1992" are too ambiguous (version numbers, IDs).
    // Detection requires an explicit context keyword (né le, dob, birth date...).
    type: 'BIRTH_DATE',
    regex: /(?:né(?:e)?\s+le|date\s+de\s+naissance|dob|birth\s*date)\s*[:]\s*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/gi,
    defaultPolicy: 'REDACT',
    bankingPolicy: 'REDACT',
  },
  {
    type: 'CONTRACT_NUMBER',
    regex: /(?:contrat|compte|n[°o]|num[eé]ro|ref(?:erence)?|dossier)\s*[:°#]?\s*[A-Z]{0,4}\d{6,16}\b/gi,
    defaultPolicy: 'BLOCK',
    bankingPolicy: 'BLOCK',
  },
  {
    type: 'HEALTH_DATA',
    regex: new RegExp(`\\b(?:${HEALTH_TERMS.join('|')})\\b[^.]{0,200}`, 'gi'),
    defaultPolicy: 'BLOCK',
    bankingPolicy: 'BLOCK',
  },
]

const policyOverrides = new Map<PIIType, PIIPolicy>()

export function configurePolicy(type: PIIType, policy: PIIPolicy): void {
  policyOverrides.set(type, policy)
}

function getPolicy(pattern: PIIPattern): PIIPolicy {
  const override = policyOverrides.get(pattern.type)
  if (override !== undefined) return override
  const bankingMode = process.env['NEXUS_BANKING_MODE'] === 'true'
  return bankingMode ? pattern.bankingPolicy : pattern.defaultPolicy
}

function hashValue(value: string): string {
  return `[HASH:${createHash('sha256').update(value).digest('hex').slice(0, 16)}]`
}

export async function detectPII(text: string, namespace: string, agentName = 'unknown'): Promise<PIIDetectionResult> {
  let result = text
  const detectedTypes: PIIType[] = []
  let blocked = false

  for (const pattern of PII_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags)
    const matches = [...result.matchAll(regex)]
    if (matches.length === 0) continue

    const validMatches = matches.filter((m) => {
      const full = m[0]
      if (!full) return false
      return pattern.validate ? pattern.validate(full) : true
    })

    if (validMatches.length === 0) continue

    const policy = getPolicy(pattern)
    detectedTypes.push(pattern.type)

    if (policy === 'BLOCK') {
      blocked = true
      await auditLog({
        agentName,
        action: 'PII_BLOCK',
        namespace,
        piiDetected: true,
        outcome: 'BLOCKED',
        metadata: { piiType: pattern.type, count: validMatches.length },
      })
      return { clean: false, redactedText: result, detectedTypes, blocked: true }
    }

    if (policy === 'REDACT') {
      result = result.replace(new RegExp(pattern.regex.source, pattern.regex.flags), `[REDACTED:${pattern.type}]`)
    } else if (policy === 'HASH') {
      result = result.replace(new RegExp(pattern.regex.source, pattern.regex.flags), (match) => hashValue(match))
    }
  }

  if (detectedTypes.length > 0) {
    await auditLog({
      agentName,
      action: 'PII_DETECTED',
      namespace,
      piiDetected: true,
      outcome: blocked ? 'BLOCKED' : 'REDACTED',
      metadata: { types: detectedTypes.join(','), count: detectedTypes.length },
    })
  }

  return {
    clean: detectedTypes.length === 0,
    redactedText: result,
    detectedTypes,
    blocked,
  }
}
