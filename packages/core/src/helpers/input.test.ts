import { splitInput } from './input'

describe('splitInput', () => {
  it('should split simple type:value pairs', () => {
    expect(splitInput('biguint:123')).toEqual(['biguint', '123'])
    expect(splitInput('address:erd1abc')).toEqual(['address', 'erd1abc'])
    expect(splitInput('string:hello world')).toEqual(['string', 'hello world'])
  })

  it('should handle asset inputs with amounts and pipes', () => {
    expect(splitInput('asset:TOKEN-123|100')).toEqual(['asset', 'TOKEN-123|100'])
    expect(splitInput('asset:package::module::type|50.5')).toEqual(['asset', 'package::module::type|50.5'])
  })

  it('should handle edge cases', () => {
    expect(splitInput('type:')).toEqual(['type', ''])
    expect(splitInput('typeonly')).toEqual(['typeonly', ''])
    expect(splitInput(':valueonly')).toEqual(['', 'valueonly'])
  })

  it('should handle multiple colons in value', () => {
    expect(splitInput('type:value:with:colons:here')).toEqual(['type', 'value:with:colons:here'])
    expect(splitInput('asset:package::module::type::nested')).toEqual(['asset', 'package::module::type::nested'])
  })
})
