import { WarpInputTypes } from './constants'
import { address, asset, biguint, bool, hex, option, string, struct, tuple, uint16, uint32, uint64, uint8 } from './utils.codec'

describe('utils.codec', () => {
  describe('string', () => {
    it('encodes a string value', () => {
      expect(string('hello')).toBe(`${WarpInputTypes.String}:hello`)
      expect(string('')).toBe(`${WarpInputTypes.String}:`)
      expect(string('123')).toBe(`${WarpInputTypes.String}:123`)
    })
  })

  describe('uint8', () => {
    it('encodes a uint8 value', () => {
      expect(uint8(0)).toBe(`${WarpInputTypes.Uint8}:0`)
      expect(uint8(255)).toBe(`${WarpInputTypes.Uint8}:255`)
    })
  })

  describe('uint16', () => {
    it('encodes a uint16 value', () => {
      expect(uint16(0)).toBe(`${WarpInputTypes.Uint16}:0`)
      expect(uint16(65535)).toBe(`${WarpInputTypes.Uint16}:65535`)
    })
  })

  describe('uint32', () => {
    it('encodes a uint32 value', () => {
      expect(uint32(0)).toBe(`${WarpInputTypes.Uint32}:0`)
      expect(uint32(4294967295)).toBe(`${WarpInputTypes.Uint32}:4294967295`)
    })
  })

  describe('uint64', () => {
    it('encodes a uint64 value', () => {
      expect(uint64(BigInt(0))).toBe(`${WarpInputTypes.Uint64}:0`)
      expect(uint64(BigInt('18446744073709551615'))).toBe(`${WarpInputTypes.Uint64}:18446744073709551615`)
    })
  })

  describe('biguint', () => {
    it('encodes a biguint value from bigint', () => {
      expect(biguint(BigInt(0))).toBe(`${WarpInputTypes.Biguint}:0`)
      expect(biguint(BigInt('12345678901234567890'))).toBe(`${WarpInputTypes.Biguint}:12345678901234567890`)
    })
    it('encodes a biguint value from string', () => {
      expect(biguint('42')).toBe(`${WarpInputTypes.Biguint}:42`)
    })
    it('encodes a biguint value from number', () => {
      expect(biguint(123)).toBe(`${WarpInputTypes.Biguint}:123`)
    })
  })

  describe('boolean', () => {
    it('encodes a boolean value', () => {
      expect(bool(true)).toBe(`${WarpInputTypes.Bool}:true`)
      expect(bool(false)).toBe(`${WarpInputTypes.Bool}:false`)
    })
  })

  describe('address', () => {
    it('encodes an address value', () => {
      expect(address('erd1...')).toBe(`${WarpInputTypes.Address}:erd1...`)
      expect(address('')).toBe(`${WarpInputTypes.Address}:`)
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
      expect(asset(assetValue)).toBe(`${WarpInputTypes.Asset}:WEGLD-123456|1000000000000000000`)
    })

    it('encodes an asset value with decimals', () => {
      const assetValue = {
        chain: 'multiversx',
        identifier: 'USDC-123456',
        name: 'USD Coin',
        amount: BigInt('1000000'),
        decimals: 6,
      }
      expect(asset(assetValue)).toBe(`${WarpInputTypes.Asset}:USDC-123456|1000000|6`)
    })
  })

  describe('hex', () => {
    it('encodes a hex value', () => {
      expect(hex('deadbeef')).toBe(`${WarpInputTypes.Hex}:deadbeef`)
      expect(hex('')).toBe(`${WarpInputTypes.Hex}:`)
    })
  })

  describe('option', () => {
    it('encodes an option with a value', () => {
      expect(option('hello', 'string')).toBe(`${WarpInputTypes.Option}:hello`)
      expect(option(123, 'u32')).toBe(`${WarpInputTypes.Option}:123`)
      expect(option(BigInt(456), 'u64')).toBe(`${WarpInputTypes.Option}:456`)
    })

    it('encodes an option without a value (null)', () => {
      expect(option(null, 'string')).toBe(`${WarpInputTypes.Option}:`)
      expect(option(null, 'u32')).toBe(`${WarpInputTypes.Option}:`)
      expect(option(null, 'u64')).toBe(`${WarpInputTypes.Option}:`)
    })
  })

  describe('tuple', () => {
    it('encodes a tuple with raw values', () => {
      expect(tuple(['hello', 123])).toBe(`${WarpInputTypes.Tuple}:hello,123`)
      expect(tuple(['world', BigInt(456)])).toBe(`${WarpInputTypes.Tuple}:world,456`)
      expect(tuple([BigInt(1), BigInt(2), BigInt(3)])).toBe(`${WarpInputTypes.Tuple}:1,2,3`)
      expect(tuple([true, false])).toBe(`${WarpInputTypes.Tuple}:true,false`)
      expect(tuple(['hello', 123, true, BigInt(456)])).toBe(`${WarpInputTypes.Tuple}:hello,123,true,456`)
    })

    it('encodes a tuple with helper function results', () => {
      const projectId = 123n
      const amount = 456n
      expect(tuple(uint64(projectId), biguint(amount))).toBe(`${WarpInputTypes.Tuple}(uint64|biguint):123,456`)
      expect(tuple(string('hello'), uint32(123))).toBe(`${WarpInputTypes.Tuple}(string|uint32):hello,123`)
      expect(tuple(uint8(1), uint16(2), uint32(3), uint64(4n))).toBe(`${WarpInputTypes.Tuple}(uint8|uint16|uint32|uint64):1,2,3,4`)
      expect(tuple(bool(true), address('erd1...'))).toBe(`${WarpInputTypes.Tuple}(bool|address):true,erd1...`)
      expect(tuple(hex('deadbeef'), uint64(123n))).toBe(`${WarpInputTypes.Tuple}(hex|uint64):deadbeef,123`)
    })

    it('encodes a tuple with asset helper function', () => {
      const assetValue = {
        chain: 'multiversx',
        identifier: 'WEGLD-123456',
        name: 'Wrapped EGLD',
        amount: BigInt('1000000000000000000'),
      }
      expect(tuple(asset(assetValue), uint64(123n))).toBe(`${WarpInputTypes.Tuple}(asset|uint64):WEGLD-123456|1000000000000000000,123`)
    })

    it('encodes a tuple with option helper function', () => {
      expect(tuple(option('hello', 'string'), uint64(123n))).toBe(`${WarpInputTypes.Tuple}(option|uint64):hello,123`)
      expect(tuple(option(null, 'string'), uint64(123n))).toBe(`${WarpInputTypes.Tuple}(option|uint64):,123`)
    })

    it('handles mixed helper functions and raw values', () => {
      expect(tuple(uint64(123n), 'raw_string')).toBe(`${WarpInputTypes.Tuple}:uint64:123,raw_string`)
      expect(tuple('raw_string', uint64(123n))).toBe(`${WarpInputTypes.Tuple}:raw_string,uint64:123`)
    })

    it('handles edge cases', () => {
      expect(tuple()).toBe(`${WarpInputTypes.Tuple}:`)
      expect(tuple([])).toBe(`${WarpInputTypes.Tuple}:`)
      expect(tuple(['hello', null, 123])).toBe(`${WarpInputTypes.Tuple}:hello,,123`)
      expect(tuple([null, null])).toBe(`${WarpInputTypes.Tuple}:,`)
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
