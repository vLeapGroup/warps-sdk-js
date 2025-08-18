import { createMockConfig } from './test-utils/mockConfig'
import { createMockAdapter } from './test-utils/sharedMocks'
import { WarpLinkBuilder } from './WarpLinkBuilder'

const Config = createMockConfig({
  env: 'devnet',
  clientUrl: 'https://anyclient.com',
})

const baseMockAdapter = createMockAdapter()

// Patch the mock to use multiversx chain and prefix for these tests, and wrap builder/abiBuilder/brandBuilder as functions
const mockAdapter = {
  ...baseMockAdapter,
  chain: 'multiversx',
  prefix: 'mvx',
  builder: () => baseMockAdapter.builder(),
  abiBuilder: () => baseMockAdapter.abiBuilder(),
  brandBuilder: () => ({
    createInscriptionTransaction: () => ({}),
    createFromTransaction: async () => ({ protocol: '', name: '', description: '', logo: '' }),
    createFromTransactionHash: async () => null,
  }),
  registry: {
    ...baseMockAdapter.registry,
    init: async () => {},
    getRegistryConfig: () => ({ unitPrice: 0n, admins: [] }),
  },
}

describe('build', () => {
  it('builds a link with hash', () => {
    const link = new WarpLinkBuilder(Config, [mockAdapter]).build('multiversx', 'hash', '123')
    expect(link).toBe('https://anyclient.com?warp=mvx.hash.123')
  })

  it('builds a link with alias', () => {
    const link = new WarpLinkBuilder(Config, [mockAdapter]).build('multiversx', 'alias', 'mywarp')
    expect(link).toBe('https://anyclient.com?warp=mvx.mywarp')
  })

  it('builds a link with alias for super client', () => {
    Config.clientUrl = 'https://devnet.usewarp.to'
    const link = new WarpLinkBuilder(Config, [mockAdapter]).build('multiversx', 'alias', 'mywarp')
    expect(link).toBe('https://devnet.usewarp.to/mvx.mywarp')
  })
})
