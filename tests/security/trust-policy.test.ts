import { describe, it, expect } from 'vitest'
import { assertTrustLevel } from '../../security/trust-policy.js'

describe('Trust Policy', () => {
  describe('assertTrustLevel', () => {
    it('throws when VERIFIED tries to access TRUSTED agent', () => {
      expect(() => assertTrustLevel('VERIFIED', 'TRUSTED', 'security-auditor')).toThrow(
        /Trust level insufficient/
      )
    })

    it('throws when UNTRUSTED tries to access VERIFIED agent', () => {
      expect(() => assertTrustLevel('UNTRUSTED', 'VERIFIED', 'some-agent')).toThrow(
        /Trust level insufficient/
      )
    })

    it('allows TRUSTED accessing VERIFIED requirement', () => {
      expect(() => assertTrustLevel('TRUSTED', 'VERIFIED', 'some-agent')).not.toThrow()
    })

    it('allows TRUSTED accessing TRUSTED requirement', () => {
      expect(() => assertTrustLevel('TRUSTED', 'TRUSTED', 'some-agent')).not.toThrow()
    })

    it('allows VERIFIED accessing VERIFIED requirement', () => {
      expect(() => assertTrustLevel('VERIFIED', 'VERIFIED', 'some-agent')).not.toThrow()
    })

    it('allows UNTRUSTED accessing UNTRUSTED requirement', () => {
      expect(() => assertTrustLevel('UNTRUSTED', 'UNTRUSTED', 'some-agent')).not.toThrow()
    })
  })
})
