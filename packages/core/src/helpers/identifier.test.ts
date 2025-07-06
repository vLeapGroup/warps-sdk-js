import { getWarpInfoFromIdentifier } from './identifier'

describe('identifier', () => {
  it('returns info for an unprefixed alias (defaults to alias type)', () => {
    const result = getWarpInfoFromIdentifier('mywarp')
    expect(result).toEqual({
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('returns info for a prefixed alias', () => {
    const result = getWarpInfoFromIdentifier('alias:mywarp')
    expect(result).toEqual({
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('returns info for a hash identifier', () => {
    const result = getWarpInfoFromIdentifier('hash:abc123def456')
    expect(result).toEqual({
      type: 'hash',
      identifier: 'abc123def456',
      identifierBase: 'abc123def456',
    })
  })

  it('returns info for an alias with query parameters', () => {
    const result = getWarpInfoFromIdentifier('alias:mywarp?param1=value1&param2=value2')
    expect(result).toEqual({
      type: 'alias',
      identifier: 'mywarp?param1=value1&param2=value2',
      identifierBase: 'mywarp',
    })
  })

  it('returns info for a hash with query parameters', () => {
    const result = getWarpInfoFromIdentifier('hash:abc123?param1=value1')
    expect(result).toEqual({
      type: 'hash',
      identifier: 'abc123?param1=value1',
      identifierBase: 'abc123',
    })
  })

  it('returns info for an unprefixed alias with query parameters', () => {
    const result = getWarpInfoFromIdentifier('mywarp?param1=value1&param2=value2')
    expect(result).toEqual({
      type: 'alias',
      identifier: 'mywarp?param1=value1&param2=value2',
      identifierBase: 'mywarp',
    })
  })

  it('handles URL encoded identifier with query parameters', () => {
    const encoded = encodeURIComponent('alias:mywarp?param1=value with spaces&param2=value2')
    const result = getWarpInfoFromIdentifier(encoded)
    expect(result).toEqual({
      type: 'alias',
      identifier: 'mywarp?param1=value with spaces&param2=value2',
      identifierBase: 'mywarp',
    })
  })

  it('handles empty identifier after prefix', () => {
    const result = getWarpInfoFromIdentifier('alias:')
    expect(result).toEqual({
      type: 'alias',
      identifier: '',
      identifierBase: '',
    })
  })

  it('handles empty hash identifier', () => {
    const result = getWarpInfoFromIdentifier('hash:')
    expect(result).toEqual({
      type: 'hash',
      identifier: '',
      identifierBase: '',
    })
  })

  it('treats 64-character strings as hashes', () => {
    const hashString = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const result = getWarpInfoFromIdentifier(hashString)
    expect(result).toEqual({
      type: 'hash',
      identifier: hashString,
      identifierBase: hashString,
    })
  })

  it('treats 64-character strings with query params as hashes', () => {
    const hashString = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef?param=value'
    const result = getWarpInfoFromIdentifier(hashString)
    expect(result).toEqual({
      type: 'hash',
      identifier: hashString,
      identifierBase: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    })
  })

  it('does not treat short strings as hashes', () => {
    const shortString = '123456789'
    const result = getWarpInfoFromIdentifier(shortString)
    expect(result).toEqual({
      type: 'alias',
      identifier: shortString,
      identifierBase: shortString,
    })
  })

  it('does not treat long strings (>64 chars) as hashes', () => {
    const longString = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345'
    const result = getWarpInfoFromIdentifier(longString)
    expect(result).toEqual({
      type: 'alias',
      identifier: longString,
      identifierBase: longString,
    })
  })

  it('does not treat 64-character strings with separators as hashes', () => {
    const stringWithSeparator = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd:ef'
    const result = getWarpInfoFromIdentifier(stringWithSeparator)
    expect(result).toEqual({
      type: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
      identifier: 'ef',
      identifierBase: 'ef',
    })
  })
})
