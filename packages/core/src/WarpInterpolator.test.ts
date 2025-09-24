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

    it('interpolates env vars with descriptions', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          API_KEY: 'env:XMONEY_API_KEY|Get your API key from the xMoney Merchant Dashboard',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{API_KEY}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const configWithSecrets = {
        ...testConfig,
        vars: {
          XMONEY_API_KEY: 'secret-api-key-123',
        },
      }

      const interpolator = new WarpInterpolator(configWithSecrets, createMockAdapter())
      const result = await interpolator.apply(configWithSecrets, warp)
      expect((result.actions[0] as WarpTransferAction).value).toBe('secret-api-key-123')
    })

    it('interpolates env vars with descriptions using secrets parameter', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          API_KEY: 'env:XMONEY_API_KEY|Get your API key from the xMoney Merchant Dashboard',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{API_KEY}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const secrets = {
        XMONEY_API_KEY: 'secret-api-key-from-secrets-456',
      }

      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(testConfig, warp, { envs: secrets })
      expect((result.actions[0] as WarpTransferAction).value).toBe('secret-api-key-from-secrets-456')
    })

    it('interpolates env vars without descriptions', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          API_KEY: 'env:XMONEY_API_KEY',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{API_KEY}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const configWithSecrets = {
        ...testConfig,
        vars: {
          XMONEY_API_KEY: 'simple-api-key-789',
        },
      }

      const interpolator = new WarpInterpolator(configWithSecrets, createMockAdapter())
      const result = await interpolator.apply(configWithSecrets, warp)
      expect((result.actions[0] as WarpTransferAction).value).toBe('simple-api-key-789')
    })

    it('handles env vars with multiple pipe characters in description', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          API_KEY: 'env:XMONEY_API_KEY|Get your API key from xMoney|Additional info|More details',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{API_KEY}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const configWithSecrets = {
        ...testConfig,
        vars: {
          XMONEY_API_KEY: 'multi-pipe-api-key',
        },
      }

      const interpolator = new WarpInterpolator(configWithSecrets, createMockAdapter())
      const result = await interpolator.apply(configWithSecrets, warp)
      expect((result.actions[0] as WarpTransferAction).value).toBe('multi-pipe-api-key')
    })

    it('handles env vars with empty description', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          API_KEY: 'env:XMONEY_API_KEY|',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{API_KEY}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const configWithSecrets = {
        ...testConfig,
        vars: {
          XMONEY_API_KEY: 'empty-desc-api-key',
        },
      }

      const interpolator = new WarpInterpolator(configWithSecrets, createMockAdapter())
      const result = await interpolator.apply(configWithSecrets, warp)
      expect((result.actions[0] as WarpTransferAction).value).toBe('empty-desc-api-key')
    })
  })

  describe('query params from meta', () => {
    it('interpolates query vars from meta.queries', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          TOKEN_ADDRESS: 'query:token',
          AMOUNT: 'query:amount',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{TOKEN_ADDRESS}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const meta = {
        queries: {
          token: '0x1234567890abcdef',
          amount: '1000000',
        },
      }

      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(testConfig, warp, meta)
      expect((result.actions[0] as WarpTransferAction).value).toBe('0x1234567890abcdef')
    })

    it('prioritizes meta.queries over URL query params', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          TOKEN_ADDRESS: 'query:token',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{TOKEN_ADDRESS}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const configWithUrl = {
        ...testConfig,
        currentUrl: 'https://example.com?token=url-token-value',
      }

      const meta = {
        queries: {
          token: 'meta-token-value',
        },
      }

      const interpolator = new WarpInterpolator(configWithUrl, createMockAdapter())
      const result = await interpolator.apply(configWithUrl, warp, meta)
      expect((result.actions[0] as WarpTransferAction).value).toBe('meta-token-value')
    })

    it('falls back to URL query params when meta.queries is not provided', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          TOKEN_ADDRESS: 'query:token',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{TOKEN_ADDRESS}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const configWithUrl = {
        ...testConfig,
        currentUrl: 'https://example.com?token=url-token-value',
      }

      const interpolator = new WarpInterpolator(configWithUrl, createMockAdapter())
      const result = await interpolator.apply(configWithUrl, warp)
      expect((result.actions[0] as WarpTransferAction).value).toBe('url-token-value')
    })

    it('handles missing query params gracefully', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          TOKEN_ADDRESS: 'query:nonexistent',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{TOKEN_ADDRESS}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const meta = {
        queries: {
          token: 'existing-token',
        },
      }

      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(testConfig, warp, meta)
      expect((result.actions[0] as WarpTransferAction).value).toBe('{{TOKEN_ADDRESS}}')
    })

    it('interpolates query vars with descriptions from meta.queries', async () => {
      const warp = {
        ...createMockWarp(),
        vars: {
          TOKEN_ADDRESS: 'query:token|The contract address of the token to deposit.',
        },
        actions: [
          {
            type: 'transfer' as const,
            label: 'Transfer',
            address: 'erd1abc',
            value: '{{TOKEN_ADDRESS}}',
            inputs: [],
          } as WarpTransferAction,
        ],
      }

      const meta = {
        queries: {
          token: '0x1234567890abcdef',
        },
      }

      const interpolator = new WarpInterpolator(testConfig, createMockAdapter())
      const result = await interpolator.apply(testConfig, warp, meta)
      expect((result.actions[0] as WarpTransferAction).value).toBe('0x1234567890abcdef')
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
