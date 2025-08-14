import { createMockAdapter, createMockChainInfo, createMockConfig, createMockWarp } from './test-utils/sharedMocks'
import { WarpTransferAction } from './types'
import { WarpCache } from './WarpCache'
import { WarpInterpolator } from './WarpInterpolator'

const testConfig = createMockConfig({
  env: 'devnet',
  clientUrl: 'https://anyclient.com',
  currentUrl: 'https://anyclient.com',
  vars: {},
  user: { wallets: { MULTIVERSX: 'erd1abc' } },
  schema: {
    warp: 'https://schema.warp.to/warp.json',
    brand: 'https://schema.warp.to/brand.json',
  },
  registry: {
    contract: 'erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3',
  },
})

const mockAdapter = {
  ...createMockAdapter(),
  chain: 'devnet',
  builder: {
    createInscriptionTransaction: jest.fn(),
    createFromTransaction: jest.fn(),
    createFromTransactionHash: jest.fn().mockResolvedValue(null),
  },
  registry: {
    createWarpRegisterTransaction: jest.fn(),
    createWarpUnregisterTransaction: jest.fn(),
    createWarpUpgradeTransaction: jest.fn(),
    createWarpAliasSetTransaction: jest.fn(),
    createWarpVerifyTransaction: jest.fn(),
    createWarpTransferOwnershipTransaction: jest.fn(),
    createBrandRegisterTransaction: jest.fn(),
    createWarpBrandingTransaction: jest.fn(),
    getInfoByAlias: jest.fn().mockResolvedValue({ registryInfo: null, brand: null }),
    getInfoByHash: jest.fn().mockResolvedValue({ registryInfo: null, brand: null }),
    getUserWarpRegistryInfos: jest.fn().mockResolvedValue([]),
    getUserBrands: jest.fn().mockResolvedValue([]),
    getChainInfos: jest.fn().mockResolvedValue([]),
    getChainInfo: jest.fn().mockResolvedValue(createMockChainInfo('multiversx')),
    setChain: jest.fn().mockResolvedValue({}),
    removeChain: jest.fn().mockResolvedValue({}),
    fetchBrand: jest.fn().mockResolvedValue(null),
  },
  executor: {
    createTransaction: jest.fn(),
    preprocessInput: jest.fn(),
  },
  results: {
    getTransactionExecutionResults: jest.fn(),
  },
  serializer: {
    typedToString: jest.fn(),
    typedToNative: jest.fn(),
    nativeToTyped: jest.fn(),
    nativeToType: jest.fn(),
    stringToTyped: jest.fn(),
  },
}

describe('WarpInterpolator', () => {
  beforeEach(() => {
    new WarpCache('memory').clear()
  })

  describe('apply', () => {
    it('interpolates basic warp', async () => {
      const warp = createMockWarp()
      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(testConfig, warp)
      expect(result).toBeDefined()
    })

    it('interpolates warp with variables', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          USER_ADDRESS: 'erd1...',
          AMOUNT: '1000',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: '{{USER_ADDRESS}}',
            value: '{{AMOUNT}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }
      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(testConfig, warp)
      expect((result.actions[0] as WarpTransferAction).address).toBe('erd1...')
      expect((result.actions[0] as WarpTransferAction).value).toBe('1000')
    })

    it('interpolates actions with chain info', async () => {
      const warp = {
        ...createMockWarp(),
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer A',
            chain: 'A',
            address: '{{CHAIN_ADDRESS_HRP}}...',
            value: '0',
            inputs: [],
          } as WarpTransferAction,
          {
            type: 'transfer' as const,
            label: 'Transfer B',
            chain: 'B',
            address: '{{CHAIN_ADDRESS_HRP}}...',
            value: '0',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const chainA = createMockChainInfo('A')
      const chainB = createMockChainInfo('B')

      const mockRepository = {
        ...createMockAdapter(),
        registry: {
          ...createMockAdapter().registry,
          getChainInfo: jest.fn().mockImplementation((chain: string) => {
            if (chain === 'A') return Promise.resolve(chainA)
            if (chain === 'B') return Promise.resolve(chainB)
            return Promise.resolve(null)
          }),
        },
      }

      const interpolator = new WarpInterpolator(testConfig, mockRepository)
      const result = await interpolator.apply(testConfig, warp)

      expect((result.actions[0] as WarpTransferAction).address).toBe('erd...')
      expect((result.actions[1] as WarpTransferAction).address).toBe('erd...')
    })

    it('handles missing chain info gracefully', async () => {
      const warp = {
        ...createMockWarp(),
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            chain: 'unknown',
            address: '{{CHAIN_ADDRESS_HRP}}...',
            value: '0',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(testConfig, warp)
      expect(result).toBeDefined()
    })
  })
})

describe('WarpInterpolator per-action chain info', () => {
  beforeEach(() => {
    new WarpCache('memory').clear()
  })

  it('interpolates actions with different chain info', async () => {
    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'transfer' as const,
          label: 'Transfer A',
          chain: 'A',
          address: '{{CHAIN_ADDRESS_HRP}}...',
          value: '0',
          inputs: [],
        } as WarpTransferAction,
        {
          type: 'transfer' as const,
          label: 'Transfer B',
          chain: 'B',
          address: '{{CHAIN_ADDRESS_HRP}}...',
          value: '0',
          inputs: [],
        } as WarpTransferAction,
      ],
    }

    const chainA = createMockChainInfo('A')
    const chainB = createMockChainInfo('B')

    const mockRepository = {
      ...createMockAdapter(),
      registry: {
        ...createMockAdapter().registry,
        getChainInfo: jest.fn().mockImplementation((chain: string) => {
          if (chain === 'A') return Promise.resolve(chainA)
          if (chain === 'B') return Promise.resolve(chainB)
          return Promise.resolve(null)
        }),
      },
    }

    const interpolator = new WarpInterpolator(testConfig, mockRepository)
    const result = await interpolator.apply(testConfig, warp)

    expect((result.actions[0] as WarpTransferAction).address).toBe('erd...')
    expect((result.actions[1] as WarpTransferAction).address).toBe('erd...')
  })
})
