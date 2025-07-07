import { WarpConfig } from './config'
import { getMainChainInfo } from './helpers/general'
import { Warp, WarpInitConfig } from './types/warp'
import { CacheTtl, WarpCache, WarpCacheKey } from './WarpCache'
import { WarpInterpolator } from './WarpInterpolator'

// Mock WarpUtils since it's now in the warps package
jest.mock('../../warps/src/WarpUtils', () => ({
  WarpUtils: {
    getChainInfoForAction: jest.fn(),
  }
}))

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
}

describe('WarpInterpolator', () => {
  it('interpolates vars and globals together', async () => {
    const config = { ...testConfig, vars: { AGE: 10 }, currentUrl: 'https://anyclient.com?age2=20' }

    const warp: Warp = {
      description: 'Wallet: {{USER_WALLET}}, API: {{CHAIN_API}}, Explorer: {{CHAIN_EXPLORER}}, Age: {{AGE}}, Age2: {{AGE2}}',
      vars: { AGE: 'env:AGE', AGE2: 'query:age2' },
      actions: [],
    } as any

    const actual = await WarpInterpolator.apply(config, warp)

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

    const actual = await WarpInterpolator.apply(config, warp)

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

    const actual = await WarpInterpolator.apply(config, warp)

    expect(actual.description).toBe('No placeholders here')
  })
})

describe('WarpInterpolator per-action chain info', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('interpolates actions with different chain info', async () => {
    const config = {
      ...testConfig,
      user: { wallet: 'erd1abc' },
      vars: { AGE: 10 },
      currentUrl: 'https://anyclient.com?age=10',
    }

    const chainA = {
      chainId: 'A',
      name: 'Chain A',
      displayName: 'Chain A',
      addressHrp: 'erd',
      nativeToken: 'EGLD',
      blockTime: 1000,
      apiUrl: 'https://api.chainA.com',
      explorerUrl: 'https://explorer.chainA.com',
    }

    const chainB = {
      chainId: 'B',
      name: 'Chain B',
      displayName: 'Chain B',
      addressHrp: 'erd',
      nativeToken: 'EGLD',
      blockTime: 2000,
      apiUrl: 'https://api.chainB.com',
      explorerUrl: 'https://explorer.chainB.com',
    }

    // Mock the getChainInfoForAction to return appropriate chain info
    const { WarpUtils } = require('../../warps/src/WarpUtils')
    const mockGetChainInfo = WarpUtils.getChainInfoForAction as jest.MockedFunction<any>
    mockGetChainInfo.mockImplementation(async (config: any, action: any) => {
      if (action.chain === 'A') return chainA
      if (action.chain === 'B') return chainB
      return getMainChainInfo(config)
    })

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

    const result = await WarpInterpolator.apply(config, warp)

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

    // Mock the getChainInfoForAction to return default chain info
    const { WarpUtils } = require('../../warps/src/WarpUtils')
    const mockGetChainInfo = WarpUtils.getChainInfoForAction as jest.MockedFunction<any>
    mockGetChainInfo.mockResolvedValue(defaultChain)

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

    const result = await WarpInterpolator.apply(config, warp)

    expect(result.actions[0].description).toBe(`API: ${defaultChain.apiUrl}, Explorer: ${defaultChain.explorerUrl}`)
  })
})
