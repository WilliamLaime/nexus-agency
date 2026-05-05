import { z } from 'zod'
import type { ZodSchema, SafeParseReturnType, ZodTypeAny } from 'zod'
import { auditLog } from './audit-logger.js'

export const TrustLevelEnum = z.enum(['TRUSTED', 'VERIFIED', 'UNTRUSTED'])

export const AgentInputSchema = z.object({
  prompt: z.string().min(1).max(32_000),
  namespace: z.string().min(1).max(256),
  agentName: z.string().min(1).max(64),
  trustLevel: TrustLevelEnum,
})

export type AgentInput = z.infer<typeof AgentInputSchema>

export function validateInput<T>(schema: ZodSchema<T>, data: unknown, agentName = 'unknown', namespace = 'global'): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    void auditLog({
      agentName,
      action: 'INPUT_VALIDATION_FAILED',
      namespace,
      outcome: 'BLOCKED',
      metadata: {
        errorCount: result.error.errors.length,
        firstError: result.error.errors[0]?.message ?? 'unknown',
      },
    })
    throw result.error
  }
  return result.data
}

export function safeValidateInput<T, S extends ZodTypeAny = ZodSchema<T>>(
  schema: S,
  data: unknown,
  agentName = 'unknown',
  namespace = 'global'
): SafeParseReturnType<T, T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    void auditLog({
      agentName,
      action: 'INPUT_VALIDATION_FAILED',
      namespace,
      outcome: 'BLOCKED',
      metadata: {
        errorCount: result.error.errors.length,
        firstError: result.error.errors[0]?.message ?? 'unknown',
      },
    })
  }
  return result
}

export function sanitizePrompt(prompt: string): string {
  return prompt
    .replace(/\x00/g, '')
    .replace(/[​-‍﻿]/g, '')
    .trim()
}
