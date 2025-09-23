import { address, asset, biguint, bool, hex, option, string, struct, tuple, uint16, uint32, uint64, uint8 } from './utils.codec'

describe('utils.codec', () => {
  describe('string', () => {
    it('encodes a string value', () => {
      expect(string('hello')).toBe('string:hello')
      expect(string('')).toBe('string:')
      expect(string('123')).toBe('string:123')
    })
  })

  describe('uint8', () => {
    it('encodes a uint8 value', () => {
      expect(uint8(0)).toBe('uint8:0')
      expect(uint8(255)).toBe('uint8:255')
    })
  })

  describe('uint16', () => {
    it('encodes a uint16 value', () => {
      expect(uint16(0)).toBe('uint16:0')
      expect(uint16(65535)).toBe('uint16:65535')
    })
  })

  describe('uint32', () => {
    it('encodes a uint32 value', () => {
      expect(uint32(0)).toBe('uint32:0')
      expect(uint32(4294967295)).toBe('uint32:4294967295')
    })
  })

  describe('uint64', () => {
    it('encodes a uint64 value', () => {
      expect(uint64(BigInt(0))).toBe('uint64:0')
      expect(uint64(BigInt('18446744073709551615'))).toBe('uint64:18446744073709551615')
    })
  })

  describe('biguint', () => {
    it('encodes a biguint value from bigint', () => {
      expect(biguint(BigInt(0))).toBe('biguint:0')
      expect(biguint(BigInt('12345678901234567890'))).toBe('biguint:12345678901234567890')
    })
    it('encodes a biguint value from string', () => {
      expect(biguint('42')).toBe('biguint:42')
    })
    it('encodes a biguint value from number', () => {
      expect(biguint(123)).toBe('biguint:123')
    })
  })

  describe('boolean', () => {
    it('encodes a boolean value', () => {
      expect(bool(true)).toBe('bool:true')
      expect(bool(false)).toBe('bool:false')
    })
  })

  describe('address', () => {
    it('encodes an address value', () => {
      expect(address('erd1...')).toBe('address:erd1...')
      expect(address('')).toBe('address:')
    })
  })

  describe('asset', () => {
    it('encodes an asset value', () => {
      const assetValue = {
        chain: 'multiversx',
        identifier: 'WEGLD-123456',
        name: 'Wrapped EGLD',
        amount: BigInt('1000000000000000000'),
      }
      expect(asset(assetValue)).toBe('asset:WEGLD-123456|1000000000000000000')
    })

    it('encodes an asset value with decimals', () => {
      const assetValue = {
        chain: 'multiversx',
        identifier: 'USDC-123456',
        name: 'USD Coin',
        amount: BigInt('1000000'),
        decimals: 6,
      }
      expect(asset(assetValue)).toBe('asset:USDC-123456|1000000|6')
    })
  })

  describe('hex', () => {
    it('encodes a hex value', () => {
      expect(hex('deadbeef')).toBe('hex:deadbeef')
      expect(hex('')).toBe('hex:')
    })
  })

  describe('option', () => {
    it('encodes an option with a value', () => {
      expect(option(string, 'hello')).toBe('option:string:hello')
      expect(option(uint32, 123)).toBe('option:uint32:123')
      expect(option(uint64, BigInt(456))).toBe('option:uint64:456')
    })

    it('encodes an option without a value (null)', () => {
      expect(option(string, null)).toBe('option:')
      expect(option(uint32, null)).toBe('option:')
      expect(option(uint64, null)).toBe('option:')
    })
  })

  describe('tuple', () => {
    it('encodes a tuple with raw values', () => {
      expect(tuple(['hello', 123])).toBe('tuple:hello,123')
      expect(tuple(['world', BigInt(456)])).toBe('tuple:world,456')
      expect(tuple([BigInt(1), BigInt(2), BigInt(3)])).toBe('tuple:1,2,3')
      expect(tuple([true, false])).toBe('tuple:true,false')
      expect(tuple(['hello', 123, true, BigInt(456)])).toBe('tuple:hello,123,true,456')
    })

    it('encodes a tuple with helper function results', () => {
      const projectId = 123n
      const amount = 456n
      expect(tuple(uint64(projectId), biguint(amount))).toBe('tuple(uint64|biguint):123,456')
      expect(tuple(string('hello'), uint32(123))).toBe('tuple(string|uint32):hello,123')
      expect(tuple(uint8(1), uint16(2), uint32(3), uint64(4n))).toBe('tuple(uint8|uint16|uint32|uint64):1,2,3,4')
      expect(tuple(bool(true), address('erd1...'))).toBe('tuple(bool|address):true,erd1...')
      expect(tuple(hex('deadbeef'), uint64(123n))).toBe('tuple(hex|uint64):deadbeef,123')
    })

    it('encodes a tuple with asset helper function', () => {
      const assetValue = {
        chain: 'multiversx',
        identifier: 'WEGLD-123456',
        name: 'Wrapped EGLD',
        amount: BigInt('1000000000000000000'),
      }
      expect(tuple(asset(assetValue), uint64(123n))).toBe('tuple(asset|uint64):WEGLD-123456|1000000000000000000,123')
    })

    it('encodes a tuple with option helper function', () => {
      expect(tuple(option(string, 'hello'), uint64(123n))).toBe('tuple(option|uint64):string,123')
      expect(tuple(option(string, null), uint64(123n))).toBe('tuple(option|uint64):,123')
    })

    it('handles mixed helper functions and raw values', () => {
      expect(tuple(uint64(123n), 'raw_string')).toBe('tuple:uint64:123,raw_string')
      expect(tuple('raw_string', uint64(123n))).toBe('tuple:raw_string,uint64:123')
    })

    it('handles edge cases', () => {
      expect(tuple()).toBe('tuple:')
      expect(tuple([])).toBe('tuple:')
      expect(tuple(['hello', null, 123])).toBe('tuple:hello,,123')
      expect(tuple([null, null])).toBe('tuple:,')
    })
  })

  describe('struct', () => {
    it('encodes a struct with helper function', () => {
      expect(struct({ _name: 'User', name: 'hello', age: 123 })).toBe('struct(User):(name:string)hello,(age:uint32)123')
    })

    it('handles empty struct', () => {
      expect(struct({ _name: 'Empty' })).toBe('struct(Empty):')
    })

    it('throws error when struct object lacks _name property', () => {
      expect(() => struct({ name: 'hello', age: 123 })).toThrow('Struct objects must have a _name property to specify the struct name')
    })

    it('handles struct with different types', () => {
      expect(struct({ _name: 'Config', id: 1, name: 'test', active: true })).toBe(
        'struct(Config):(id:uint32)1,(name:string)test,(active:bool)true'
      )
    })
  })
})
