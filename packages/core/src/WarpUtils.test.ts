import { getNextInfo } from '@vleap/warps'
import { WarpMultiversxRegistry } from '@vleap/warps-adapter-multiversx'
import { WarpContractAction } from './types'
import { WarpChainEnv } from './types/general'
import { WarpExecutionResults } from './types/results'
import { Warp, WarpInitConfig } from './types/warp'
import { WarpUtils } from './WarpUtils'

const testConfig: WarpInitConfig = {
  env: 'devnet' as WarpChainEnv,
  clientUrl: 'https://anyclient.com',
  currentUrl: 'https://anyclient.com',
  vars: {},
  user: undefined,
  repository: {
    chain: 'multiversx',
    builder: class {
      createInscriptionTransaction() {
        return {}
      }
      createFromTransaction() {
        return Promise.resolve({ protocol: '', name: '', title: '', description: '', actions: [] })
      }
      createFromTransactionHash() {
        return Promise.resolve(null)
      }
    },
    executor: class {
      createTransaction() {
        return Promise.resolve({})
      }
      preprocessInput() {
        return Promise.resolve('')
      }
    },
    results: class {
      getTransactionExecutionResults() {
        return Promise.resolve({
          success: true,
          warp: { protocol: '', name: '', title: '', description: '', actions: [] },
          action: 0,
          user: null,
          txHash: null,
          next: null,
          values: [],
          results: {},
          messages: {},
        })
      }
    },
    serializer: class {
      typedToString() {
        return ''
      }
      typedToNative() {
        return ['', ''] as [string, any]
      }
      nativeToTyped() {
        return ''
      }
      nativeToType() {
        return ''
      }
      stringToTyped() {
        return ''
      }
      stringToNative(value: string) {
        const [type, val] = value.split(':')
        return [type, val]
      }
    },
    registry: WarpMultiversxRegistry,
  },
  adapters: [],
}

describe('getNextInfo', () => {
  it('returns info for an alias', () => {
    const warp: Warp = { next: 'mywarp' } as any
    const result = getNextInfo(testConfig, warp, 1, {})
    expect(result?.[0].identifier).toBe('mywarp')
    expect(result?.[0].url).toBe('https://anyclient.com?warp=mywarp')
  })

  it('returns info for a prefixed alias', () => {
    const warp: Warp = { next: 'alias:mywarp' } as any
    const result = getNextInfo(testConfig, warp, 1, {})
    expect(result?.[0].identifier).toBe('alias:mywarp')
    expect(result?.[0].url).toBe('https://anyclient.com?warp=mywarp')
  })

  it('returns info for a super client', () => {
    const config = { ...testConfig, clientUrl: 'https://usewarp.to', currentUrl: 'https://usewarp.to' }
    const warp: Warp = { next: 'mywarp?param1=value1&param2=value2' } as any
    const result = getNextInfo(config, warp, 1, {})
    expect(result?.[0].identifier).toBe('mywarp?param1=value1&param2=value2')
    expect(result?.[0].url).toBe('https://usewarp.to/mywarp?param1=value1&param2=value2')
  })

  it('returns an url for a prefixed hash', () => {
    const warp: Warp = { next: 'hash:123' } as any
    const result = getNextInfo(testConfig, warp, 1, {})
    expect(result?.[0].identifier).toBe('hash:123')
    expect(result?.[0].url).toBe('https://anyclient.com?warp=hash%3A123')
  })

  it('returns an external url as is', () => {
    const warp: Warp = { next: 'https://example.com' } as any
    const result = getNextInfo(testConfig, warp, 1, {})
    expect(result).toEqual([{ identifier: null, url: 'https://example.com' }])
  })

  it('returns null when warp has no next step', () => {
    const warp: Warp = { next: undefined } as any
    const result = getNextInfo(testConfig, warp, 1, {})
    expect(result).toBeNull()
  })

  it('keeps url params as part of the identifier', () => {
    const warp: Warp = { next: 'mywarp?param1=value1&param2=value2' } as any
    const result = getNextInfo(testConfig, warp, 1, {})
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
    const result = getNextInfo(testConfig, warp, 1, results)
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
    const result = getNextInfo(testConfig, warp, 1, results)
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
    const result = getNextInfo(testConfig, warp, 1, results)
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
    const result = getNextInfo(testConfig, warp, 1, results)
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
    const result = getNextInfo(testConfig, warp, 1, results)
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
    const result = getNextInfo(testConfig, warp, 1, results)
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

    jest.spyOn(WarpMultiversxRegistry.prototype, 'getChainInfo').mockImplementation(mockGetChainInfo)

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

    jest.spyOn(WarpMultiversxRegistry.prototype, 'getChainInfo').mockImplementation(mockGetChainInfo)

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
