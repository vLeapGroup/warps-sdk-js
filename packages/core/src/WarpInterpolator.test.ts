import { CacheTtl, getMainChainInfo, Warp, WarpCache, WarpCacheKey, WarpConfig, WarpInitConfig } from '@vleap/warps'
import { WarpInterpolator } from './WarpInterpolator'

const mockAdapter = {
  chain: 'devnet',
  builder: class {
    createInscriptionTransaction = jest.fn()
    createFromTransaction = jest.fn()
    createFromTransactionHash = jest.fn().mockResolvedValue(null)
  },
  serializer: class {
    typedToString = jest.fn()
    typedToNative = jest.fn()
    nativeToTyped = jest.fn()
    nativeToType = jest.fn()
    stringToTyped = jest.fn()
  },
  registry: class {
    createWarpRegisterTransaction = jest.fn()
    createWarpUnregisterTransaction = jest.fn()
    createWarpUpgradeTransaction = jest.fn()
    createWarpAliasSetTransaction = jest.fn()
    createWarpVerifyTransaction = jest.fn()
    createWarpTransferOwnershipTransaction = jest.fn()
    createBrandRegisterTransaction = jest.fn()
    createWarpBrandingTransaction = jest.fn()
    getInfoByAlias = jest.fn().mockResolvedValue({ registryInfo: null, brand: null })
    getInfoByHash = jest.fn().mockResolvedValue({ registryInfo: null, brand: null })
    getUserWarpRegistryInfos = jest.fn()
    getUserBrands = jest.fn()
    getChainInfos = jest.fn()
    getChainInfo = jest.fn()
    setChain = jest.fn()
    removeChain = jest.fn()
    fetchBrand = jest.fn()
  },
  executor: class {
    async createTransaction() {
      return {}
    }
  },
  results: class {
    getTransactionExecutionResults = jest.fn()
  },
}

const testConfig: WarpInitConfig = {
  env: 'devnet',
  clientUrl: 'https://anyclient.com',
  currentUrl: 'https://anyclient.com',
  vars: {},
  user: { wallet: 'erd1abc' },
  schema: {
    warp: WarpConfig.LatestWarpSchemaUrl,
    brand: WarpConfig.LatestBrandSchemaUrl,
  },
  registry: {
    contract: WarpConfig.Registry.Contract('devnet'),
  },
  repository: mockAdapter,
  adapters: [],
}

describe('WarpInterpolator', () => {
  it('interpolates vars and globals together', async () => {
    const config = { ...testConfig, vars: { AGE: 10 }, currentUrl: 'https://anyclient.com?age2=20' }

    const warp: Warp = {
      description: 'Wallet: {{USER_WALLET}}, API: {{CHAIN_API}}, Explorer: {{CHAIN_EXPLORER}}, Age: {{AGE}}, Age2: {{AGE2}}',
      vars: { AGE: 'env:AGE', AGE2: 'query:age2' },
      actions: [],
    } as any

    const interpolator = new WarpInterpolator(config)
    const actual = await interpolator.apply(config, warp)

    expect(actual.description).toBe(
      'Wallet: erd1abc, API: https://devnet-api.multiversx.com, Explorer: https://devnet-explorer.multiversx.com, Age: 10, Age2: 20'
    )
  })

  it('leaves placeholders if values are missing', async () => {
    const config = { ...testConfig, user: undefined }

    const warp: Warp = {
      description: 'Wallet: {{USER_WALLET}}, API: {{CHAIN_API}}, Explorer: {{CHAIN_EXPLORER}}, Age: {{AGE}}',
      vars: { AGE: 'env:AGE' },
      actions: [],
    } as any

    const interpolator = new WarpInterpolator(config)
    const actual = await interpolator.apply(config, warp)

    expect(actual.description).toBe(
      'Wallet: {{USER_WALLET}}, API: https://devnet-api.multiversx.com, Explorer: https://devnet-explorer.multiversx.com, Age: {{AGE}}'
    )
  })

  it('returns unchanged warp if no placeholders present', async () => {
    const config = { ...testConfig, user: { wallet: 'erd1abc' } }

    const warp: Warp = {
      description: 'No placeholders here',
      actions: [],
    } as any

    const interpolator = new WarpInterpolator(config)
    const actual = await interpolator.apply(config, warp)

    expect(actual.description).toBe('No placeholders here')
  })
})

describe('WarpInterpolator per-action chain info', () => {
  beforeEach(() => {
    new WarpCache('memory').clear()
    ;(mockAdapter.registry.prototype as any).getChainInfo = jest.fn()
  })

  it('interpolates actions with different chain info', async () => {
    const config: WarpInitConfig = {
      ...testConfig,
      user: { wallet: 'erd1abc' },
      vars: { AGE: 10 },
      currentUrl: 'https://anyclient.com?age=10',
      cache: { type: 'memory' },
    }

    const cache = new WarpCache('memory')
    config.cache = { type: 'memory' }

    const chainA = {
      name: 'A',
      displayName: 'Chain A',
      chainId: 'A',
      blockTime: 1000,
      addressHrp: 'erd',
      apiUrl: 'https://api.chainA.com',
      explorerUrl: 'https://explorer.chainA.com',
      nativeToken: 'EGLD',
    }
    const chainB = {
      name: 'B',
      displayName: 'Chain B',
      chainId: 'B',
      blockTime: 2000,
      addressHrp: 'erd',
      apiUrl: 'https://api.chainB.com',
      explorerUrl: 'https://explorer.chainB.com',
      nativeToken: 'EGLD',
    }

    cache.set(WarpCacheKey.ChainInfo(config.env, 'A'), chainA, CacheTtl.OneWeek)
    cache.set(WarpCacheKey.ChainInfo(config.env, 'B'), chainB, CacheTtl.OneWeek)
    // Set the registry mock on the class, not the prototype, before instantiating WarpInterpolator
    mockAdapter.registry = class {
      getChainInfo(chain: string, _cache?: any) {
        if (chain === 'A') return Promise.resolve(chainA)
        if (chain === 'B') return Promise.resolve(chainB)
        return Promise.resolve(null)
      }
    } as any
    config.repository = { ...mockAdapter, registry: mockAdapter.registry }

    const warp: Warp = {
      description: 'Test',
      vars: { AGE: 'env:AGE' },
      actions: [
        {
          type: 'transfer',
          chain: 'A',
          label: 'ActionA',
          description: 'API: {{CHAIN_API}}, Explorer: {{CHAIN_EXPLORER}}',
        },
        {
          type: 'transfer',
          chain: 'B',
          label: 'ActionB',
          description: 'API: {{CHAIN_API}}, Explorer: {{CHAIN_EXPLORER}}',
        },
      ],
    } as any

    const interpolator = new WarpInterpolator(config)
    const result = await interpolator.apply(config, warp)

    expect(result.actions[0].description).toBe('API: https://api.chainA.com, Explorer: https://explorer.chainA.com')
    expect(result.actions[1].description).toBe('API: https://api.chainB.com, Explorer: https://explorer.chainB.com')
  })

  it('uses default chain info if no chain is set on action', async () => {
    const config = {
      ...testConfig,
      user: { wallet: 'erd1abc' },
      vars: { AGE: 10 },
      currentUrl: 'https://anyclient.com?age=10',
    }
    const defaultChain = getMainChainInfo(config)

    const warp: Warp = {
      description: 'Test',
      vars: { AGE: 'env:AGE' },
      actions: [
        {
          type: 'transfer',
          label: 'DefaultChainAction',
          description: 'API: {{CHAIN_API}}, Explorer: {{CHAIN_EXPLORER}}',
        },
      ],
    } as any

    const interpolator = new WarpInterpolator(config)
    const result = await interpolator.apply(config, warp)

    expect(result.actions[0].description).toBe(`API: ${defaultChain.apiUrl}, Explorer: ${defaultChain.explorerUrl}`)
  })
})
