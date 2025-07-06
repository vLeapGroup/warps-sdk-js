import { WarpContractAction } from '../../core/src/types'
import { WarpChainEnv } from '../../core/src/types/general'
import { WarpExecutionResults } from '../../core/src/types/results'
import { Warp, WarpInitConfig } from '../../core/src/types/warp'
import { WarpUtils } from '../../core/src/WarpUtils'
import { WarpRegistry } from './WarpRegistry'

const testConfig: WarpInitConfig = {
  env: 'devnet' as WarpChainEnv,
  clientUrl: 'https://anyclient.com',
  currentUrl: 'https://anyclient.com',
  vars: {},
  user: undefined,
}

describe('getNextInfo', () => {
  it('returns info for an alias', () => {
    const warp: Warp = { next: 'mywarp' } as any
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, {})
    expect(result?.[0].identifier).toBe('mywarp')
    expect(result?.[0].url).toBe('https://anyclient.com?warp=mywarp')
  })

  it('returns info for a prefixed alias', () => {
    const warp: Warp = { next: 'alias:mywarp' } as any
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, {})
    expect(result?.[0].identifier).toBe('alias:mywarp')
    expect(result?.[0].url).toBe('https://anyclient.com?warp=mywarp')
  })

  it('returns info for a super client', () => {
    const config = { ...testConfig, clientUrl: 'https://usewarp.to', currentUrl: 'https://usewarp.to' }
    const warp: Warp = { next: 'mywarp?param1=value1&param2=value2' } as any
    const result = WarpUtils.getNextInfo(config, warp, 1, {})
    expect(result?.[0].identifier).toBe('mywarp?param1=value1&param2=value2')
    expect(result?.[0].url).toBe('https://usewarp.to/mywarp?param1=value1&param2=value2')
  })

  it('returns an url for a prefixed hash', () => {
    const warp: Warp = { next: 'hash:123' } as any
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, {})
    expect(result?.[0].identifier).toBe('hash:123')
    expect(result?.[0].url).toBe('https://anyclient.com?warp=hash%3A123')
  })

  it('returns an external url as is', () => {
    const warp: Warp = { next: 'https://example.com' } as any
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, {})
    expect(result).toEqual([{ identifier: null, url: 'https://example.com' }])
  })

  it('returns null when warp has no next step', () => {
    const warp: Warp = { next: undefined } as any
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, {})
    expect(result).toBeNull()
  })

  it('keeps url params as part of the identifier', () => {
    const warp: Warp = { next: 'mywarp?param1=value1&param2=value2' } as any
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, {})
    expect(result?.[0].identifier).toBe('mywarp?param1=value1&param2=value2')
    expect(result?.[0].url).toBe('https://anyclient.com?warp=mywarp&param1=value1&param2=value2')
  })

  it('returns empty array when array-based next link has empty results array', () => {
    const warp: Warp = {
      next: 'mywarp?address={{DELEGATIONS[].address}}',
      results: {
        DELEGATIONS: [],
      },
    } as any
    const results = warp.results as WarpExecutionResults
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, results)
    expect(result).toEqual([])
  })

  it('handles array-based next links with object fields', () => {
    const warp: Warp = {
      next: 'mywarp?address={{DELEGATIONS[].address}}',
      results: {
        DELEGATIONS: [{ address: 'ABC' }, { address: 'DEF' }],
      },
    } as any
    const results = warp.results as WarpExecutionResults
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, results)
    expect(result).toEqual([
      { identifier: 'mywarp?address=ABC', url: 'https://anyclient.com?warp=mywarp&address=ABC' },
      { identifier: 'mywarp?address=DEF', url: 'https://anyclient.com?warp=mywarp&address=DEF' },
    ])
  })

  it('handles array-based next links with simple values', () => {
    const warp: Warp = {
      next: 'mywarp?value={{VALUES[]}}',
      results: {
        VALUES: ['A', 'B', 'C'],
      },
    } as any
    const results = warp.results as WarpExecutionResults
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, results)
    expect(result).toEqual([
      { identifier: 'mywarp?value=A', url: 'https://anyclient.com?warp=mywarp&value=A' },
      { identifier: 'mywarp?value=B', url: 'https://anyclient.com?warp=mywarp&value=B' },
      { identifier: 'mywarp?value=C', url: 'https://anyclient.com?warp=mywarp&value=C' },
    ])
  })

  it('handles array-based next links with non-array results', () => {
    const warp: Warp = {
      next: 'mywarp?value={{SINGLE_VALUE[]}}',
      results: {
        SINGLE_VALUE: 'A',
      },
    } as any
    const results = warp.results as WarpExecutionResults
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, results)
    expect(result).toEqual([{ identifier: 'mywarp?value=A', url: 'https://anyclient.com?warp=mywarp&value=A' }])
  })

  it('handles array-based next links with null values', () => {
    const warp: Warp = {
      next: 'mywarp?value={{VALUES[].field}}',
      results: {
        VALUES: [{ field: 'A' }, { field: null }, { field: 'C' }],
      },
    } as any
    const results = warp.results as WarpExecutionResults
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, results)
    expect(result).toEqual([
      { identifier: 'mywarp?value=A', url: 'https://anyclient.com?warp=mywarp&value=A' },
      { identifier: 'mywarp?value=C', url: 'https://anyclient.com?warp=mywarp&value=C' },
    ])
  })

  it('handles multiple array placeholders in same next link', () => {
    const warp: Warp = {
      next: 'stake-distribution?user={{STAKERS[].user}}&amount={{STAKERS[].amount}}',
      results: {
        BASE_DATA: [
          { contract: 'A', value: 100 },
          { contract: 'B', value: 200 },
        ],
        STAKERS: [
          { user: 'alice', amount: 150 },
          { user: 'bob', amount: 250 },
        ],
      },
    } as any
    const results = warp.results as WarpExecutionResults
    const result = WarpUtils.getNextInfo(testConfig, warp, 1, results)
    expect(result).toEqual([
      {
        identifier: 'stake-distribution?user=alice&amount=150',
        url: 'https://anyclient.com?warp=stake-distribution&user=alice&amount=150',
      },
      {
        identifier: 'stake-distribution?user=bob&amount=250',
        url: 'https://anyclient.com?warp=stake-distribution&user=bob&amount=250',
      },
    ])
  })
})

describe('getInfoFromPrefixedIdentifier', () => {
  it('returns info for an unprefixed alias (defaults to alias type)', () => {
    const result = WarpUtils.getInfoFromPrefixedIdentifier('mywarp')
    expect(result).toEqual({
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('returns info for a prefixed alias', () => {
    const result = WarpUtils.getInfoFromPrefixedIdentifier('alias:mywarp')
    expect(result).toEqual({
      type: 'alias',
      identifier: 'mywarp',
      identifierBase: 'mywarp',
    })
  })

  it('returns info for a hash identifier', () => {
    const result = WarpUtils.getInfoFromPrefixedIdentifier('hash:abc123def456')
    expect(result).toEqual({
      type: 'hash',
      identifier: 'abc123def456',
      identifierBase: 'abc123def456',
    })
  })

  it('returns info for an alias with query parameters', () => {
    const result = WarpUtils.getInfoFromPrefixedIdentifier('alias:mywarp?param1=value1&param2=value2')
    expect(result).toEqual({
      type: 'alias',
      identifier: 'mywarp?param1=value1&param2=value2',
      identifierBase: 'mywarp',
    })
  })

  it('returns info for a hash with query parameters', () => {
    const result = WarpUtils.getInfoFromPrefixedIdentifier('hash:abc123?param1=value1')
    expect(result).toEqual({
      type: 'hash',
      identifier: 'abc123?param1=value1',
      identifierBase: 'abc123',
    })
  })

  it('returns info for an unprefixed alias with query parameters', () => {
    const result = WarpUtils.getInfoFromPrefixedIdentifier('mywarp?param1=value1&param2=value2')
    expect(result).toEqual({
      type: 'alias',
      identifier: 'mywarp?param1=value1&param2=value2',
      identifierBase: 'mywarp',
    })
  })

  it('handles URL encoded identifier with query parameters', () => {
    const encoded = encodeURIComponent('alias:mywarp?param1=value with spaces&param2=value2')
    const result = WarpUtils.getInfoFromPrefixedIdentifier(encoded)
    expect(result).toEqual({
      type: 'alias',
      identifier: 'mywarp?param1=value with spaces&param2=value2',
      identifierBase: 'mywarp',
    })
  })

  it('handles empty identifier after prefix', () => {
    const result = WarpUtils.getInfoFromPrefixedIdentifier('alias:')
    expect(result).toEqual({
      type: 'alias',
      identifier: '',
      identifierBase: '',
    })
  })

  it('handles empty hash identifier', () => {
    const result = WarpUtils.getInfoFromPrefixedIdentifier('hash:')
    expect(result).toEqual({
      type: 'hash',
      identifier: '',
      identifierBase: '',
    })
  })

  it('treats 64-character strings as hashes', () => {
    const hashString = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const result = WarpUtils.getInfoFromPrefixedIdentifier(hashString)
    expect(result).toEqual({
      type: 'hash',
      identifier: hashString,
      identifierBase: hashString,
    })
  })

  it('treats 64-character strings with query params as hashes', () => {
    const hashString = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef?param=value'
    const result = WarpUtils.getInfoFromPrefixedIdentifier(hashString)
    expect(result).toEqual({
      type: 'hash',
      identifier: hashString,
      identifierBase: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    })
  })

  it('does not treat short strings as hashes', () => {
    const shortString = '123456789'
    const result = WarpUtils.getInfoFromPrefixedIdentifier(shortString)
    expect(result).toEqual({
      type: 'alias',
      identifier: shortString,
      identifierBase: shortString,
    })
  })

  it('does not treat long strings (>64 chars) as hashes', () => {
    const longString = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345'
    const result = WarpUtils.getInfoFromPrefixedIdentifier(longString)
    expect(result).toEqual({
      type: 'alias',
      identifier: longString,
      identifierBase: longString,
    })
  })

  it('does not treat 64-character strings with separators as hashes', () => {
    const stringWithSeparator = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd:ef'
    const result = WarpUtils.getInfoFromPrefixedIdentifier(stringWithSeparator)
    expect(result).toEqual({
      type: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
      identifier: 'ef',
      identifierBase: 'ef',
    })
  })
})

describe('getChainInfoForAction', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses chain from input when chain position is specified', async () => {
    const mockGetChainInfo = jest.fn().mockResolvedValue({
      name: 'mainnet',
      displayName: 'Mainnet',
      chainId: '1',
      blockTime: 6,
      addressHrp: 'erd',
      apiUrl: 'https://api.multiversx.com',
      explorerUrl: 'https://explorer.multiversx.com',
      nativeToken: 'EGLD',
    })

    jest.spyOn(WarpRegistry.prototype, 'getChainInfo').mockImplementation(mockGetChainInfo)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: 'testFunc',
      args: [],
      gasLimit: 1000000,
      inputs: [
        { name: 'targetChain', type: 'string', position: 'chain', source: 'field' },
        { name: 'amount', type: 'biguint', position: 'value', source: 'field' },
      ],
    }

    const chain = await WarpUtils.getChainInfoForAction(testConfig, action, ['string:mainnet', 'biguint:1000000000000000000'])

    expect(chain.name).toBe('mainnet')
    expect(mockGetChainInfo).toHaveBeenCalledWith('mainnet')
  })

  it('uses default chain when no chain position is specified', async () => {
    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: 'testFunc',
      args: [],
      gasLimit: 1000000,
      inputs: [{ name: 'amount', type: 'biguint', position: 'value', source: 'field' }],
    }

    const chain = await WarpUtils.getChainInfoForAction(testConfig, action, ['biguint:1000000000000000000'])

    expect(chain.name).toBe('multiversx') // Default chain name from config
  })

  it('handles chain position at index 0 correctly (critical bug test)', async () => {
    const mockGetChainInfo = jest.fn().mockResolvedValue({
      name: 'testnet',
      displayName: 'Testnet',
      chainId: 'T',
      blockTime: 6,
      addressHrp: 'erd',
      apiUrl: 'https://testnet-api.multiversx.com',
      explorerUrl: 'https://testnet-explorer.multiversx.com',
      nativeToken: 'EGLD',
    })

    jest.spyOn(WarpRegistry.prototype, 'getChainInfo').mockImplementation(mockGetChainInfo)

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: 'testFunc',
      args: [],
      gasLimit: 1000000,
      inputs: [
        { name: 'targetChain', type: 'string', position: 'chain', source: 'field' }, // At index 0
        { name: 'amount', type: 'biguint', position: 'value', source: 'field' },
      ],
    }

    const chain = await WarpUtils.getChainInfoForAction(testConfig, action, ['string:testnet', 'biguint:500'])

    expect(chain.name).toBe('testnet')
    expect(mockGetChainInfo).toHaveBeenCalledWith('testnet')
  })

  it('throws error when chain input is not found at specified position', async () => {
    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: 'testFunc',
      args: [],
      gasLimit: 1000000,
      inputs: [{ name: 'targetChain', type: 'string', position: 'chain', source: 'field' }],
    }

    await expect(WarpUtils.getChainInfoForAction(testConfig, action, [])).rejects.toThrow('Chain input not found')
  })

  it('uses default chain when no inputs are provided', async () => {
    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: 'testFunc',
      args: [],
      gasLimit: 1000000,
      inputs: [{ name: 'targetChain', type: 'string', position: 'chain', source: 'field' }],
    }

    const chain = await WarpUtils.getChainInfoForAction(testConfig, action)

    expect(chain.name).toBe('multiversx') // Default chain name from config
  })
})
