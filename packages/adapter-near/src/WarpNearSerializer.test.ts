import { WarpNearSerializer } from './WarpNearSerializer'

describe('WarpNearSerializer', () => {
  let serializer: WarpNearSerializer

  beforeEach(() => {
    serializer = new WarpNearSerializer()
  })

  describe('typedToString', () => {
    it('should convert string to string type', () => {
      expect(serializer.typedToString('hello world')).toBe('string:hello world')
    })

    it('should convert number to uint type', () => {
      expect(serializer.typedToString(42)).toBe('uint8:42')
      expect(serializer.typedToString(1000)).toBe('uint16:1000')
    })

    it('should convert bigint to biguint type', () => {
      expect(serializer.typedToString(1000000000000000000n)).toBe('biguint:1000000000000000000')
    })

    it('should convert boolean to boolean type', () => {
      expect(serializer.typedToString(true)).toBe('boolean:true')
      expect(serializer.typedToString(false)).toBe('boolean:false')
    })

    it('should convert NEAR address to address type', () => {
      expect(serializer.typedToString('test.near')).toBe('address:test.near')
    })

    it('should convert asset object to asset type', () => {
      const asset = { identifier: 'NEAR', amount: 1000000000000000000000000n, decimals: 24 }
      expect(serializer.typedToString(asset)).toContain('asset:NEAR')
    })
  })

  describe('stringToTyped', () => {
    it('should convert string type back to string', () => {
      expect(serializer.stringToTyped('string:hello')).toBe('hello')
    })

    it('should convert uint type back to bigint', () => {
      expect(serializer.stringToTyped('uint64:42')).toBe(42n)
    })

    it('should convert boolean type back to boolean', () => {
      expect(serializer.stringToTyped('boolean:true')).toBe(true)
      expect(serializer.stringToTyped('boolean:false')).toBe(false)
    })

    it('should convert address type back to string', () => {
      expect(serializer.stringToTyped('address:test.near')).toBe('test.near')
    })
  })

  describe('nativeToTyped', () => {
    it('should convert native string to string', () => {
      expect(serializer.nativeToTyped('string', 'hello')).toBe('hello')
    })

    it('should convert native bigint to bigint', () => {
      expect(serializer.nativeToTyped('uint64', '42')).toBe(42n)
    })

    it('should convert native boolean to boolean', () => {
      expect(serializer.nativeToTyped('boolean', true)).toBe(true)
    })
  })
})
