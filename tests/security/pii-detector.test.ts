import { describe, it, expect } from 'vitest'
import { detectPII } from '../../security/pii-detector.js'

describe('PII Detector', () => {
  describe('EMAIL', () => {
    it('detects simple email and redacts it', async () => {
      const result = await detectPII('Contact: alice@example.com', 'test/pii', 'test')
      expect(result.clean).toBe(false)
      expect(result.detectedTypes).toContain('EMAIL')
      expect(result.redactedText).not.toContain('alice@example.com')
    })
  })

  describe('IBAN', () => {
    it('blocks valid French IBAN with spaces', async () => {
      const result = await detectPII('Mon IBAN : FR76 3000 4000 0312 3456 7890 143', 'test/pii', 'test')
      expect(result.blocked).toBe(true)
      expect(result.detectedTypes).toContain('IBAN')
    })

    it('does not match IBAN with invalid checksum', async () => {
      // FR00 has invalid mod-97 checksum
      const result = await detectPII('FR00 3000 4000 0312 3456 7890 143', 'test/pii', 'test')
      expect(result.detectedTypes).not.toContain('IBAN')
    })
  })

  describe('NIR', () => {
    it('blocks valid French NIR with spaces (1 85 01 75 123 456 09)', async () => {
      // key = 97 - (1850175123456n % 97n) = 97 - 88 = 9 → two-digit key "09"
      const result = await detectPII('NIR: 1 85 01 75 123 456 09', 'test/pii', 'test')
      expect(result.blocked).toBe(true)
      expect(result.detectedTypes).toContain('NIR')
    })

    it('does not block NIR with invalid key', async () => {
      const result = await detectPII('NIR: 1 85 01 75 123 456 00', 'test/pii', 'test')
      expect(result.detectedTypes).not.toContain('NIR')
    })
  })

  describe('CREDIT_CARD', () => {
    it('blocks Luhn-valid credit card', async () => {
      // Visa test number with valid Luhn
      const result = await detectPII('Card: 4532015112830366', 'test/pii', 'test')
      expect(result.blocked).toBe(true)
      expect(result.detectedTypes).toContain('CREDIT_CARD')
    })

    it('does not match Luhn-invalid number', async () => {
      const result = await detectPII('Number: 1234567890123456', 'test/pii', 'test')
      expect(result.detectedTypes).not.toContain('CREDIT_CARD')
    })
  })

  describe('HEALTH_DATA', () => {
    it('detects French health term', async () => {
      const result = await detectPII('Le patient a un diagnostic de diabète', 'test/pii', 'test')
      expect(result.detectedTypes).toContain('HEALTH_DATA')
    })

    it('detects English health term', async () => {
      const result = await detectPII('Patient diagnosis: type 2 diabetes', 'test/pii', 'test')
      expect(result.detectedTypes).toContain('HEALTH_DATA')
    })
  })
})
