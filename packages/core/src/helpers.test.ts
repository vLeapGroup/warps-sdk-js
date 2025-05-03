import { shiftBigintBy } from './helpers'

describe('Helpers', () => {
  describe('shiftBigintBy', () => {
    it('shifts positive decimal places', () => {
      const result = shiftBigintBy('123.45', 2)
      expect(result.toString()).toBe('12345')
    })

    it('shifts negative decimal places', () => {
      const result = shiftBigintBy('12345', -2)
      expect(result.toString()).toBe('123')
    })

    it('handles zero decimal places', () => {
      const result = shiftBigintBy('123.45', 0)
      expect(result.toString()).toBe('123')
    })

    it('handles bigint input', () => {
      const result = shiftBigintBy(BigInt('12345'), 2)
      expect(result.toString()).toBe('1234500')
    })

    it('handles large numbers with positive shift', () => {
      const result = shiftBigintBy('12345678901234567890.12345', 5)
      expect(result.toString()).toBe('1234567890123456789012345')
    })

    it('handles large numbers with negative shift', () => {
      const result = shiftBigintBy('12345678901234567890', -5)
      expect(result.toString()).toBe('123456789012345')
    })

    it('returns zero when shifting more places than number length', () => {
      const result = shiftBigintBy('123', -5)
      expect(result.toString()).toBe('0')
    })

    it('handles numbers without decimal point', () => {
      const result = shiftBigintBy('123', 2)
      expect(result.toString()).toBe('12300')
    })

    it('handles numbers with only decimal part', () => {
      const result = shiftBigintBy('0.123', 3)
      expect(result.toString()).toBe('123')
    })

    it('handles very small numbers', () => {
      const result = shiftBigintBy('0.000001', 6)
      expect(result.toString()).toBe('1')
    })

    it('handles numbers with decimal point at the end', () => {
      expect(shiftBigintBy('123.', 2).toString()).toBe('12300')
      expect(shiftBigintBy('123.', 0).toString()).toBe('123')
    })
  })
})
