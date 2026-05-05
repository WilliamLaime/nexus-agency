import { auditLog } from './audit-logger.js'

export interface SecretFinding {
  type: string
  line: number
  column: number
}

export interface ScanResult {
  clean: boolean
  findings: SecretFinding[]
  sanitizedOutput: string
}

interface SecretPattern {
  type: string
  regex: RegExp
}

const SECRET_PATTERNS: SecretPattern[] = [
  {
    type: 'AWS_ACCESS_KEY',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    type: 'GITHUB_TOKEN',
    regex: /\b(?:ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{36,}\b/g,
  },
  {
    type: 'GITHUB_PAT',
    regex: /\bgithub_pat_[A-Za-z0-9_]{82}\b/g,
  },
  {
    type: 'OPENAI_KEY',
    regex: /\bsk-[A-Za-z0-9]{32,}\b/g,
  },
  {
    type: 'ANTHROPIC_KEY',
    regex: /\bsk-ant-[A-Za-z0-9\-_]{32,}\b/g,
  },
  {
    type: 'GOOGLE_API_KEY',
    regex: /\bAIza[0-9A-Za-z\-_]{35}\b/g,
  },
  {
    type: 'PRIVATE_KEY_HEADER',
    regex: /-----BEGIN\s+(?:RSA|EC|DSA|OPENSSH|PRIVATE)\s+PRIVATE\s+KEY-----/g,
  },
  {
    type: 'DB_CONNECTION_STRING',
    regex: /(?:mongodb|postgresql|postgres|mysql|redis|mssql):\/\/[^:@\s]+:[^@\s]+@[^\s"']+/gi,
  },
  {
    type: 'JWT_TOKEN',
    regex: /\beyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{20,}\b/g,
  },
  {
    type: 'SECRET_ASSIGNMENT',
    regex: /(?:API_KEY|SECRET|TOKEN|PASSWORD|PASSWD|PWD|PRIVATE_KEY|ACCESS_KEY|AUTH_TOKEN)\s*[=:]\s*['"][A-Za-z0-9_\-\.+/]{16,}['"]/gi,
  },
  {
    type: 'BEARER_TOKEN',
    regex: /Authorization:\s*Bearer\s+[A-Za-z0-9_\-\.]{20,}/gi,
  },
  {
    type: 'STRIPE_KEY',
    regex: /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{24,}\b/g,
  },
]

function shannonEntropy(str: string): number {
  const freq = new Map<string, number>()
  for (const ch of str) {
    freq.set(ch, (freq.get(ch) ?? 0) + 1)
  }
  let entropy = 0
  for (const count of freq.values()) {
    const p = count / str.length
    entropy -= p * Math.log2(p)
  }
  return entropy
}

const HIGH_ENTROPY_PATTERN = /(?:=|:)\s*['"]?([A-Za-z0-9+/=_\-]{20,80})['"]?/g

function findHighEntropySecrets(text: string): Array<{ match: string; index: number }> {
  const results: Array<{ match: string; index: number }> = []
  const regex = new RegExp(HIGH_ENTROPY_PATTERN.source, HIGH_ENTROPY_PATTERN.flags)
  let m: RegExpExecArray | null
  while ((m = regex.exec(text)) !== null) {
    const captured = m[1]
    if (!captured) continue
    if (shannonEntropy(captured) > 3.5 && captured.length >= 20 && captured.length <= 80) {
      results.push({ match: captured, index: m.index })
    }
  }
  return results
}

function getLineAndColumn(text: string, index: number): { line: number; column: number } {
  const before = text.slice(0, index)
  const lines = before.split('\n')
  const line = lines.length
  const lastLine = lines[lines.length - 1] ?? ''
  const column = lastLine.length + 1
  return { line, column }
}

export async function scanOutput(output: string, agentName: string, namespace: string): Promise<ScanResult> {
  const findings: SecretFinding[] = []
  let sanitized = output

  for (const pattern of SECRET_PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags)
    let m: RegExpExecArray | null
    let hasMatch = false

    while ((m = regex.exec(output)) !== null) {
      if (!m[0]) continue
      hasMatch = true
      const { line, column } = getLineAndColumn(output, m.index)
      findings.push({ type: pattern.type, line, column })
    }

    if (hasMatch) {
      sanitized = sanitized.replace(new RegExp(pattern.regex.source, pattern.regex.flags), '[SECRET_REDACTED]')
    }
  }

  const highEntropyMatches = findHighEntropySecrets(output)
  for (const { match, index } of highEntropyMatches) {
    const alreadyCovered = findings.some((f) => {
      const lineCol = getLineAndColumn(output, index)
      return f.line === lineCol.line
    })
    if (alreadyCovered) continue

    const { line, column } = getLineAndColumn(output, index)
    findings.push({ type: 'HIGH_ENTROPY_STRING', line, column })
    sanitized = sanitized.replace(match, '[SECRET_REDACTED]')
  }

  if (findings.length > 0) {
    await auditLog({
      agentName,
      action: 'SECRET_DETECTED_IN_OUTPUT',
      namespace,
      outcome: 'REDACTED',
      metadata: {
        findingCount: findings.length,
        types: [...new Set(findings.map((f) => f.type))].join(','),
      },
    })
  }

  return {
    clean: findings.length === 0,
    findings,
    sanitizedOutput: sanitized,
  }
}
