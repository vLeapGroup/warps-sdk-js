import { WarpSuiSerializer } from './WarpSuiSerializer'

describe('WarpSuiSerializer', () => {
  const serializer = new WarpSuiSerializer()

  it('should serialize and deserialize string', () => {
    const value = 'hello'
    const str = serializer.typedToString(value)
    expect(str).toBe('string:hello')
    expect(serializer.stringToTyped(str)).toBe(value)
  })

  it('should serialize and deserialize boolean', () => {
    const value = true
    const str = serializer.typedToString(value)
    expect(str).toBe('bool:true')
    expect(serializer.stringToTyped(str)).toBe(true)
  })

  it('should serialize and deserialize uint64', () => {
    const value = 123456789n
    const str = serializer.typedToString(value)
    expect(str).toBe('uint64:123456789')
    expect(serializer.stringToTyped(str)).toBe(123456789n)
  })

  it('should serialize and deserialize address', () => {
    const value = { address: '0x1234' }
    const str = serializer.typedToString(value)
    expect(str).toBe('address:0x1234')
    expect(serializer.stringToTyped(str)).toEqual({ address: '0x1234' })
  })
})
