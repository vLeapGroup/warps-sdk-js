import { ethers } from 'ethers'
import { WarpEvmSerializer } from './WarpEvmSerializer'

jest.mock('ethers')

describe('WarpEvmSerializer', () => {
  let serializer: WarpEvmSerializer

  beforeEach(() => {
    // Mock ethers functions
    ;(ethers.isAddress as unknown as jest.Mock).mockImplementation((address: unknown) => {
      return typeof address === 'string' && address.startsWith('0x') && address.length === 42
    })
    ;(ethers.isHexString as unknown as jest.Mock).mockImplementation((hex: unknown) => {
      return typeof hex === 'string' && hex.startsWith('0x') && /^[0-9a-fA-F]+$/.test(hex.slice(2)) && hex.length > 2
    })

    serializer = new WarpEvmSerializer()
  })

  describe('typedToString', () => {
    it('should serialize string values', () => {
      expect(serializer.typedToString('hello')).toBe('string:hello')
    })

    it('should serialize number values', () => {
      expect(serializer.typedToString(42)).toBe('uint8:42')
      expect(serializer.typedToString(1000)).toBe('uint16:1000')
      expect(serializer.typedToString(1000000)).toBe('uint32:1000000')
      expect(serializer.typedToString(1000000000000)).toBe('uint64:1000000000000')
    })

    it('should serialize bigint values', () => {
      expect(serializer.typedToString(BigInt(123456789))).toBe('biguint:123456789')
    })

    it('should serialize boolean values', () => {
      expect(serializer.typedToString(true)).toBe('boolean:true')
      expect(serializer.typedToString(false)).toBe('boolean:false')
    })

    it('should serialize address values', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
      expect(serializer.typedToString(address)).toBe(`address:${address}`)
    })

    it('should serialize hex values', () => {
      const hex = '0x1234567890abcdef'
      expect(serializer.typedToString(hex)).toBe(`hex:${hex}`)
    })
  })

  describe('stringToTyped', () => {
    it('should deserialize string values', () => {
      expect(serializer.stringToTyped('string:hello')).toBe('hello')
    })

    it('should deserialize number values', () => {
      expect(serializer.stringToTyped('uint8:42')).toBe(BigInt(42))
      expect(serializer.stringToTyped('uint16:1000')).toBe(BigInt(1000))
      expect(serializer.stringToTyped('uint32:1000000')).toBe(BigInt(1000000))
      expect(serializer.stringToTyped('uint64:1000000000000')).toBe(BigInt(1000000000000))
      expect(serializer.stringToTyped('biguint:123456789')).toBe(BigInt(123456789))
    })

    it('should deserialize boolean values', () => {
      expect(serializer.stringToTyped('boolean:true')).toBe(true)
      expect(serializer.stringToTyped('boolean:false')).toBe(false)
    })

    it('should deserialize address values', () => {
      const address = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
      expect(serializer.stringToTyped(`address:${address}`)).toBe(address)
    })

    it('should deserialize hex values', () => {
      const hex = '0x1234567890abcdef'
      expect(serializer.stringToTyped(`hex:${hex}`)).toBe(hex)
    })

    it('should add 0x prefix to hex values without prefix', () => {
      const hexWithoutPrefix = '1234567890abcdef'
      expect(serializer.stringToTyped(`hex:${hexWithoutPrefix}`)).toBe(`0x${hexWithoutPrefix}`)
    })
  })

  describe('nativeToTyped', () => {
    it('should convert native values to typed values', () => {
      expect(serializer.nativeToTyped('string', 'hello')).toBe('hello')
      expect(serializer.nativeToTyped('uint8', '42')).toBe(BigInt(42))
      expect(serializer.nativeToTyped('boolean', true)).toBe(true)
      expect(serializer.nativeToTyped('address', '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')).toBe(
        '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
      )
    })

    it('should add 0x prefix to hex values without prefix', () => {
      const hexWithPrefix = '0x1234567890abcdef'
      const hexWithoutPrefix = '1234567890abcdef'
      expect(serializer.nativeToTyped('hex', hexWithPrefix)).toBe(hexWithPrefix)
      expect(serializer.nativeToTyped('hex', hexWithoutPrefix)).toBe(`0x${hexWithoutPrefix}`)
    })
  })

  describe('typedToNative', () => {
    it('should convert typed values to native values', () => {
      const [type1, value1] = serializer.typedToNative('hello')
      expect(type1).toBe('string')
      expect(value1).toBe('hello')

      const [type2, value2] = serializer.typedToNative(BigInt(42))
      expect(type2).toBe('biguint')
      expect(value2).toBe(BigInt(42))

      const [type3, value3] = serializer.typedToNative(true)
      expect(type3).toBe('boolean')
      expect(value3).toBe(true)
    })
  })
})
