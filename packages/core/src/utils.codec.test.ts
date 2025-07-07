import { address, biguint, boolean, hex, string, u16, u32, u64, u8 } from './utils.codec'

import { WarpInputTypes } from './constants'

describe('utils.codec', () => {
  describe('string', () => {
    it('encodes a string value', () => {
      expect(string('hello')).toBe(`${WarpInputTypes.String}:hello`)
      expect(string('')).toBe(`${WarpInputTypes.String}:`)
      expect(string('123')).toBe(`${WarpInputTypes.String}:123`)
    })
  })

  describe('u8', () => {
    it('encodes a u8 value', () => {
      expect(u8(0)).toBe(`${WarpInputTypes.U8}:0`)
      expect(u8(255)).toBe(`${WarpInputTypes.U8}:255`)
    })
  })

  describe('u16', () => {
    it('encodes a u16 value', () => {
      expect(u16(0)).toBe(`${WarpInputTypes.U16}:0`)
      expect(u16(65535)).toBe(`${WarpInputTypes.U16}:65535`)
    })
  })

  describe('u32', () => {
    it('encodes a u32 value', () => {
      expect(u32(0)).toBe(`${WarpInputTypes.U32}:0`)
      expect(u32(4294967295)).toBe(`${WarpInputTypes.U32}:4294967295`)
    })
  })

  describe('u64', () => {
    it('encodes a u64 value', () => {
      expect(u64(BigInt(0))).toBe(`${WarpInputTypes.U64}:0`)
      expect(u64(BigInt('18446744073709551615'))).toBe(`${WarpInputTypes.U64}:18446744073709551615`)
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
      expect(boolean(true)).toBe(`${WarpInputTypes.Boolean}:true`)
      expect(boolean(false)).toBe(`${WarpInputTypes.Boolean}:false`)
    })
  })

  describe('address', () => {
    it('encodes an address value', () => {
      expect(address('erd1...')).toBe(`${WarpInputTypes.Address}:erd1...`)
      expect(address('')).toBe(`${WarpInputTypes.Address}:`)
    })
  })

  describe('hex', () => {
    it('encodes a hex value', () => {
      expect(hex('deadbeef')).toBe(`${WarpInputTypes.Hex}:deadbeef`)
      expect(hex('')).toBe(`${WarpInputTypes.Hex}:`)
    })
  })
})
