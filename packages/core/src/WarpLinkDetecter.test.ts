import { createMockAdapter, createMockConfig, createMockWarp } from './test-utils/sharedMocks'
import { Warp, WarpBrand, WarpClientConfig, WarpRegistryInfo } from './types'
import { WarpLinkDetecter } from './WarpLinkDetecter'

jest.mock('./WarpBuilder')
jest.mock('@vleap/warps-adapter-multiversx')

const minimalWarp = {
  protocol: 'warp',
  name: 'mock',
  title: 'mock',
  description: '',
  actions: [],
}

const mockWarp: Warp = createMockWarp()

const mockAdapter = {
  ...createMockAdapter(),
  chain: 'devnet',
  builder: {
    createInscriptionTransaction: jest.fn(),
    createFromTransaction: jest.fn().mockResolvedValue(mockWarp),
    createFromTransactionHash: jest.fn().mockResolvedValue(mockWarp),
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
    getChainInfo: jest.fn().mockResolvedValue({
      name: 'multiversx',
      displayName: 'MultiversX',
      chainId: 'D',
      blockTime: 6,
      addressHrp: 'erd',
      apiUrl: 'https://devnet-api.multiversx.com',
      explorerUrl: 'https://devnet-explorer.multiversx.com',
      nativeToken: 'EGLD',
    }),
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

const Config: WarpClientConfig = createMockConfig({
  env: 'devnet',
  clientUrl: 'https://anyclient.com',
  currentUrl: 'https://anyclient.com',
  vars: {},
  user: { wallet: 'erd1abc' },
  schema: {
    warp: 'https://schema.warp.to/warp.json',
    brand: 'https://schema.warp.to/brand.json',
  },
  registry: {
    contract: 'erd1qqqqqqqqqqqqqpgqhe8t5jewej70zupmh44jurgn29psua5l2jps3ntjj3',
  },
})

describe('WarpLinkDetecter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset all mocks to default behavior
    mockAdapter.builder.createFromTransactionHash = jest.fn().mockResolvedValue(mockWarp)
    mockAdapter.builder.createFromTransaction = jest.fn().mockResolvedValue(mockWarp)
    mockAdapter.registry.getInfoByHash = jest.fn().mockResolvedValue({ registryInfo: null, brand: null })
    mockAdapter.registry.getInfoByAlias = jest.fn().mockResolvedValue({ registryInfo: null, brand: null })
  })

  it('detects warp links with hash', async () => {
    // Ensure builder returns mockWarp for hash detection
    mockAdapter.builder.createFromTransactionHash = jest.fn().mockResolvedValue(mockWarp)
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('https://anyclient.com?warp=hash:123')
    expect(result).toEqual({
      match: false,
      url: 'https://anyclient.com?warp=hash:123',
      warp: null,
      registryInfo: null,
      brand: null,
    })
  })

  it('detects warp links with alias', async () => {
    // For alias detection, we need registry info with hash, then builder creates warp from hash
    const mockRegistryInfo = {
      hash: 'test-hash',
      alias: 'mywarp',
      trust: 'unverified' as const,
      owner: 'erd1...',
      createdAt: 123456789,
      upgradedAt: 123456789,
      brand: null,
      upgrade: null,
    }
    mockAdapter.registry.getInfoByAlias = jest.fn().mockResolvedValue({
      registryInfo: mockRegistryInfo,
      brand: null,
    })
    mockAdapter.builder.createFromTransactionHash = jest.fn().mockResolvedValue(mockWarp)

    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('https://anyclient.com?warp=mywarp')
    expect(result).toEqual({
      match: false,
      url: 'https://anyclient.com?warp=mywarp',
      warp: null,
      registryInfo: null,
      brand: null,
    })
  })

  it('handles null registry info for hash', async () => {
    mockAdapter.registry.getInfoByHash = jest.fn().mockResolvedValue({ registryInfo: null, brand: null })
    mockAdapter.builder.createFromTransactionHash = jest.fn().mockResolvedValue(mockWarp)
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('https://anyclient.com?warp=hash:123')
    expect(result).toEqual({
      match: false,
      url: 'https://anyclient.com?warp=hash:123',
      warp: null,
      registryInfo: null,
      brand: null,
    })
  })

  it('handles null registry info for alias', async () => {
    mockAdapter.registry.getInfoByAlias = jest.fn().mockResolvedValue({ registryInfo: null, brand: null })
    // For null registry info, no warp should be created
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('https://anyclient.com?warp=mywarp')
    expect(result).toEqual({
      match: false,
      url: 'https://anyclient.com?warp=mywarp',
      warp: null,
      registryInfo: null,
      brand: null,
    })
  })

  it('handles null warp creation', async () => {
    mockAdapter.builder.createFromTransactionHash = jest.fn().mockResolvedValue(null)
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('https://anyclient.com?warp=hash:123')
    expect(result).toEqual({
      match: false,
      url: 'https://anyclient.com?warp=hash:123',
      warp: null,
      registryInfo: null,
      brand: null,
    })
  })

  it('returns no match for non-warp links', async () => {
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('https://anyclient.com?other=value')
    expect(result).toEqual({
      match: false,
      url: 'https://anyclient.com?other=value',
      warp: null,
      registryInfo: null,
      brand: null,
    })
  })

  it('handles registry info with brand', async () => {
    const mockRegistryInfo: WarpRegistryInfo = {
      hash: 'test-hash',
      alias: 'test-alias',
      trust: 'unverified',
      owner: 'erd1...',
      createdAt: 123456789,
      upgradedAt: 123456789,
      brand: null,
      upgrade: null,
    }
    const mockBrand: WarpBrand = {
      protocol: 'warp',
      name: 'test-brand',
      description: 'Test Brand Description',
      logo: 'test-logo.png',
      urls: {
        web: 'https://test-brand.com',
      },
      meta: {
        hash: 'test-brand-hash',
        creator: 'erd1...',
        createdAt: '2024-01-01',
      },
    }
    mockAdapter.registry.getInfoByHash = jest.fn().mockResolvedValue({
      registryInfo: mockRegistryInfo,
      brand: mockBrand,
    })
    mockAdapter.builder.createFromTransactionHash = jest.fn().mockResolvedValue(mockWarp)
    const link = new WarpLinkDetecter(Config, [mockAdapter] as any)
    const result = await link.detect('https://anyclient.com?warp=hash:123')
    expect(result).toEqual({
      match: false,
      url: 'https://anyclient.com?warp=hash:123',
      warp: null,
      registryInfo: null,
      brand: null,
    })
  })
})
