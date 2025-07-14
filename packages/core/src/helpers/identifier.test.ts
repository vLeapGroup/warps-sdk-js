import { extractIdentifierInfoFromUrl, getWarpInfoFromIdentifier } from './identifier'

describe('identifier', () => {
  it('returns info for an unprefixed alias (defaults to alias type, chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('mywarp')
    expect(result).toEqual({
      chainPrefix: 'mvx',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('returns info for a prefixed alias (defaults to chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('alias:mywarp')
    expect(result).toEqual({
      chainPrefix: 'mvx',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('returns info for a hash identifier (defaults to chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('hash:abc123def456')
    expect(result).toEqual({
      chainPrefix: 'mvx',
      type: 'hash',
      identifier: 'abc123def456',
      identifierBase: 'abc123def456',
    })
  })

  it('returns info for an alias with query parameters (defaults to chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('alias:mywarp?param1=value1&param2=value2')
    expect(result).toEqual({
      chainPrefix: 'mvx',
      type: 'alias',
      identifier: 'mywarp?param1=value1&param2=value2',
      identifierBase: 'mywarp',
    })
  })

  it('returns info for a hash with query parameters (defaults to chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('hash:abc123?param1=value1')
    expect(result).toEqual({
      chainPrefix: 'mvx',
      type: 'hash',
      identifier: 'abc123?param1=value1',
      identifierBase: 'abc123',
    })
  })

  it('returns info for an unprefixed alias with query parameters (defaults to chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('mywarp?param1=value1&param2=value2')
    expect(result).toEqual({
      chainPrefix: 'mvx',
      type: 'alias',
      identifier: 'mywarp?param1=value1&param2=value2',
      identifierBase: 'mywarp',
    })
  })

  it('handles URL encoded identifier with query parameters (defaults to chain mvx)', () => {
    const encoded = encodeURIComponent('alias:mywarp?param1=value with spaces&param2=value2')
    const result = getWarpInfoFromIdentifier(encoded)
    expect(result).toEqual({
      chainPrefix: 'mvx',
      type: 'alias',
      identifier: 'mywarp?param1=value with spaces&param2=value2',
      identifierBase: 'mywarp',
    })
  })

  it('handles empty identifier after prefix (defaults to chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('alias:')
    expect(result).toEqual({
      chainPrefix: 'mvx',
      type: 'alias',
      identifier: '',
      identifierBase: '',
    })
  })

  it('handles empty hash identifier (defaults to chain mvx)', () => {
    const result = getWarpInfoFromIdentifier('hash:')
    expect(result).toEqual({
      chainPrefix: 'mvx',
      type: 'hash',
      identifier: '',
      identifierBase: '',
    })
  })

  it('treats 64-character strings as hashes (defaults to chain mvx)', () => {
    const hashString = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const result = getWarpInfoFromIdentifier(hashString)
    expect(result).toEqual({
      chainPrefix: 'mvx',
      type: 'hash',
      identifier: hashString,
      identifierBase: hashString,
    })
  })

  it('treats 64-character strings with query params as hashes (defaults to chain mvx)', () => {
    const hashString = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef?param=value'
    const result = getWarpInfoFromIdentifier(hashString)
    expect(result).toEqual({
      chainPrefix: 'mvx',
      type: 'hash',
      identifier: hashString,
      identifierBase: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    })
  })

  it('does not treat short strings as hashes (defaults to chain mvx)', () => {
    const shortString = '123456789'
    const result = getWarpInfoFromIdentifier(shortString)
    expect(result).toEqual({
      chainPrefix: 'mvx',
      type: 'alias',
      identifier: shortString,
      identifierBase: shortString,
    })
  })

  it('does not treat long strings (>64 chars) as hashes (defaults to chain mvx)', () => {
    const longString = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345'
    const result = getWarpInfoFromIdentifier(longString)
    expect(result).toEqual({
      chainPrefix: 'mvx',
      type: 'alias',
      identifier: longString,
      identifierBase: longString,
    })
  })

  it('returns null for 64-character strings with separators (invalid edge case)', () => {
    const stringWithSeparator = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd:ef'
    const result = getWarpInfoFromIdentifier(stringWithSeparator)
    expect(result).toBeNull()
  })

  // New tests for chain prefix
  it('parses chain prefix sui:hash:abc123', () => {
    const result = getWarpInfoFromIdentifier('sui:hash:abc123')
    expect(result).toEqual({
      chainPrefix: 'sui',
      type: 'hash',
      identifier: 'abc123',
      identifierBase: 'abc123',
    })
  })

  it('parses chain prefix sui:alias:mywarp', () => {
    const result = getWarpInfoFromIdentifier('sui:alias:mywarp')
    expect(result).toEqual({
      chainPrefix: 'sui',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('parses chain prefix sui:alias:mywarp?param=1', () => {
    const result = getWarpInfoFromIdentifier('sui:alias:mywarp?param=1')
    expect(result).toEqual({
      chainPrefix: 'sui',
      type: 'alias',
      identifier: 'mywarp?param=1',
      identifierBase: 'mywarp',
    })
  })

  it('parses chain prefix sui:mywarp', () => {
    const result = getWarpInfoFromIdentifier('sui:mywarp')
    expect(result).toEqual({
      chainPrefix: 'sui',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('parses chain prefix sui:hash:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', () => {
    const hash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const result = getWarpInfoFromIdentifier(`sui:hash:${hash}`)
    expect(result).toEqual({
      chainPrefix: 'sui',
      type: 'hash',
      identifier: hash,
      identifierBase: hash,
    })
  })

  // Add tests for extractIdentifierInfoFromUrl
  it('extractIdentifierInfoFromUrl returns null if no identifier', () => {
    const url = 'https://example.com/'
    expect(extractIdentifierInfoFromUrl(url)).toBeNull()
  })

  it('extractIdentifierInfoFromUrl parses chain prefix', () => {
    const url = 'https://example.com/?warp=sui:hash:abc123'
    expect(extractIdentifierInfoFromUrl(url)).toEqual({
      chainPrefix: 'sui',
      type: 'hash',
      identifier: 'abc123',
      identifierBase: 'abc123',
    })
  })

  it('extractIdentifierInfoFromUrl defaults to mvx', () => {
    const url = 'https://example.com/?warp=alias:mywarp'
    expect(extractIdentifierInfoFromUrl(url)).toEqual({
      chainPrefix: 'mvx',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('extractIdentifierInfoFromUrl parses encoded chain prefix', () => {
    const url = 'https://example.com/?warp=' + encodeURIComponent('sui:alias:mywarp')
    expect(extractIdentifierInfoFromUrl(url)).toEqual({
      chainPrefix: 'sui',
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })
})
