import { WarpSolanaSerializer } from './WarpSolanaSerializer'
import { PublicKey } from '@solana/web3.js'

describe('WarpSolanaSerializer', () => {
  let serializer: WarpSolanaSerializer

  beforeEach(() => {
    serializer = new WarpSolanaSerializer()
  })

  describe('typedToString', () => {
    it('should convert string to string type', () => {
      const result = serializer.typedToString('hello')
      expect(result).toBe('string:hello')
    })

    it('should convert number to uint type', () => {
      const result = serializer.typedToString(42)
      expect(result).toBe('uint8:42')
    })

    it('should convert bigint to biguint type', () => {
      const result = serializer.typedToString(1000000000000n)
      expect(result).toBe('biguint:1000000000000')
    })

    it('should convert boolean to boolean type', () => {
      const result = serializer.typedToString(true)
      expect(result).toBe('boolean:true')
    })

    it('should convert PublicKey to address type', () => {
      const pubkey = new PublicKey('11111111111111111111111111111111')
      const result = serializer.typedToString(pubkey)
      expect(result).toContain('address:')
    })
  })

  describe('stringToTyped', () => {
    it('should convert string type back to string', () => {
      const result = serializer.stringToTyped('string:hello')
      expect(result).toBe('hello')
    })

    it('should convert uint type back to bigint', () => {
      const result = serializer.stringToTyped('uint64:42')
      expect(result).toBe(42n)
    })

    it('should convert biguint type back to bigint', () => {
      const result = serializer.stringToTyped('biguint:1000000000000')
      expect(result).toBe(1000000000000n)
    })

    it('should convert boolean type back to boolean', () => {
      const result = serializer.stringToTyped('boolean:true')
      expect(result).toBe(true)
    })
  })
})
