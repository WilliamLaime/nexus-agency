import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, assertNamespaceAccess } from '../../security/namespace-isolator.js'

describe('Namespace Isolator', () => {
  describe('encrypt / decrypt round-trip', () => {
    it('decrypts to original plaintext', async () => {
      const plaintext = 'Hello, Nexus!'
      const payload = await encrypt(plaintext, 'acme-corp/strategy')
      const decrypted = await decrypt(payload, 'acme-corp/strategy')
      expect(decrypted).toBe(plaintext)
    })

    it('round-trips with explicit keyVersion 2', async () => {
      const plaintext = 'Rotated key data'
      const payload = await encrypt(plaintext, 'acme-corp/data', 2)
      expect(payload.keyVersion).toBe(2)
      const decrypted = await decrypt(payload, 'acme-corp/data')
      expect(decrypted).toBe(plaintext)
    })
  })

  describe('tamper detection', () => {
    it('throws when authTag is modified', async () => {
      const payload = await encrypt('sensitive', 'acme-corp/strategy')
      const tampered = { ...payload, authTag: 'deadbeef'.repeat(4) }
      await expect(decrypt(tampered, 'acme-corp/strategy')).rejects.toThrow()
    })

    it('throws when ciphertext is modified', async () => {
      const payload = await encrypt('sensitive', 'acme-corp/strategy')
      const flipped = payload.ciphertext.slice(0, -2) + '00'
      const tampered = { ...payload, ciphertext: flipped }
      await expect(decrypt(tampered, 'acme-corp/strategy')).rejects.toThrow()
    })
  })

  describe('assertNamespaceAccess', () => {
    it('allows same client accessing different domain', () => {
      expect(() =>
        assertNamespaceAccess('agent', 'acme-corp/data', 'acme-corp/strategy')
      ).not.toThrow()
    })

    it('blocks different clients (acme-corp vs acme)', () => {
      expect(() =>
        assertNamespaceAccess('agent', 'acme/strategy', 'acme-corp/strategy')
      ).toThrow(/isolation violation/)
    })

    it('blocks client with dash vs client with slash ambiguity', () => {
      // acme-corp-2/strategy should NOT access acme-corp/strategy
      expect(() =>
        assertNamespaceAccess('agent', 'acme-corp/strategy', 'acme-corp-2/strategy')
      ).toThrow(/isolation violation/)
    })
  })
})
