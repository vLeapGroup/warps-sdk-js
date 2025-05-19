import { Brand, RegistryInfo, Warp, WarpConfig } from './types'
import { WarpBuilder } from './WarpBuilder'
import { WarpLink } from './WarpLink'
import { WarpRegistry } from './WarpRegistry'

// Mock dependencies
jest.mock('./WarpBuilder')
jest.mock('./WarpRegistry')

const Config: WarpConfig = {
  env: 'devnet',
  clientUrl: 'https://anyclient.com',
}

const mockWarp: Warp = {
  protocol: 'test-protocol',
  name: 'test-warp',
  title: 'Test Warp',
  description: 'Test Description',
  preview: 'test-preview',
  actions: [
    {
      type: 'contract',
      label: 'Test Action',
      address: 'test-address',
      func: 'test-function',
      args: ['arg1', 'arg2'],
      gasLimit: 1000000,
    },
  ],
  meta: {
    hash: '123',
    creator: 'test-creator',
    createdAt: '2024-01-01',
  },
}

const mockRegistryInfo: RegistryInfo = {
  hash: '123',
  alias: 'mywarp',
  trust: 'unverified',
  creator: 'test-creator',
  createdAt: 1234567890,
  brand: null,
  upgrade: null,
}

const mockBrand: Brand = {
  protocol: 'test-protocol',
  name: 'Test Brand',
  description: 'Test Description',
  logo: 'test-logo.png',
  urls: {
    web: 'https://test.com',
  },
  meta: {
    hash: 'brand-hash',
    creator: 'brand-creator',
    createdAt: '2024-01-01',
  },
}

describe('build', () => {
  it('builds a link with hash', () => {
    const link = new WarpLink(Config).build('hash', '123')
    expect(link).toBe('https://anyclient.com?warp=hash%3A123')
  })

  it('builds a link with alias', () => {
    const link = new WarpLink(Config).build('alias', 'mywarp')
    expect(link).toBe('https://anyclient.com?warp=mywarp')
  })

  it('builds a link with alias for super client', () => {
    Config.clientUrl = 'https://devnet.usewarp.to'
    const link = new WarpLink(Config).build('alias', 'mywarp')
    expect(link).toBe('https://devnet.usewarp.to/mywarp')
  })
})

describe('detect', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(WarpBuilder as jest.Mock).mockImplementation(() => ({
      createFromTransactionHash: jest.fn().mockResolvedValue(mockWarp),
    }))
    ;(WarpRegistry as jest.Mock).mockImplementation(() => ({
      getInfoByHash: jest.fn().mockResolvedValue({ registryInfo: mockRegistryInfo, brand: mockBrand }),
      getInfoByAlias: jest.fn().mockResolvedValue({ registryInfo: mockRegistryInfo, brand: mockBrand }),
    }))
  })

  it('detects a hash-based warp link', async () => {
    const link = new WarpLink(Config)
    const result = await link.detect('https://anyclient.com?warp=hash:123')

    expect(result).toEqual({
      match: true,
      url: 'https://anyclient.com?warp=hash:123',
      warp: mockWarp,
      registryInfo: mockRegistryInfo,
      brand: mockBrand,
    })
  })

  it('detects an alias-based warp link', async () => {
    const link = new WarpLink(Config)
    const result = await link.detect('https://anyclient.com?warp=mywarp')

    expect(result).toEqual({
      match: true,
      url: 'https://anyclient.com?warp=mywarp',
      warp: mockWarp,
      registryInfo: mockRegistryInfo,
      brand: mockBrand,
    })
  })

  it('detects a super client warp link with alias', async () => {
    Config.clientUrl = 'https://devnet.usewarp.to'
    const link = new WarpLink(Config)
    const result = await link.detect('https://devnet.usewarp.to/mywarp')

    expect(result).toEqual({
      match: true,
      url: 'https://devnet.usewarp.to/mywarp',
      warp: mockWarp,
      registryInfo: mockRegistryInfo,
      brand: mockBrand,
    })
  })

  it('detects a super client warp link with hash', async () => {
    Config.clientUrl = 'https://devnet.usewarp.to'
    const link = new WarpLink(Config)
    const result = await link.detect('https://devnet.usewarp.to/' + encodeURIComponent('hash:123'))

    expect(result).toEqual({
      match: true,
      url: 'https://devnet.usewarp.to/' + encodeURIComponent('hash:123'),
      warp: mockWarp,
      registryInfo: mockRegistryInfo,
      brand: mockBrand,
    })
  })

  it('detects a super client warp link with hash when search param is given', async () => {
    Config.clientUrl = 'https://devnet.usewarp.to'
    const link = new WarpLink(Config)
    const result = await link.detect('https://devnet.usewarp.to/details?warp=' + encodeURIComponent('hash:123'))

    expect(result).toEqual({
      match: true,
      url: 'https://devnet.usewarp.to/details?warp=' + encodeURIComponent('hash:123'),
      warp: mockWarp,
      registryInfo: mockRegistryInfo,
      brand: mockBrand,
    })
  })

  it('detects a warp by alias', async () => {
    const link = new WarpLink(Config)
    const result = await link.detect('mywarp')

    expect(result).toEqual({
      match: true,
      url: 'mywarp',
      warp: mockWarp,
      registryInfo: mockRegistryInfo,
      brand: mockBrand,
    })
  })

  it('detects a warp by alias with query params', async () => {
    const link = new WarpLink(Config)
    const result = await link.detect('mywarp?param1=value1&param2=value2')

    expect(result).toEqual({
      match: true,
      url: 'mywarp?param1=value1&param2=value2',
      warp: mockWarp,
      registryInfo: mockRegistryInfo,
      brand: mockBrand,
    })
  })

  it('returns no match for invalid URLs', async () => {
    const link = new WarpLink(Config)
    const result = await link.detect('https://example.com')

    expect(result).toEqual({
      match: false,
      url: 'https://example.com',
      warp: null,
      registryInfo: null,
      brand: null,
    })
  })
})
