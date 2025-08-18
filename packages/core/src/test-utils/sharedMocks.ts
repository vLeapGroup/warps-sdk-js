import { WarpClientConfig, WarpTransferAction } from '../types'

export const createMockChainInfo = (chainName: string = 'multiversx') => ({
  name: chainName,
  displayName: chainName === 'multiversx' ? 'MultiversX' : chainName,
  chainId: chainName === 'multiversx' ? 'D' : chainName,
  blockTime: 6000,
  addressHrp: 'erd',
  apiUrl: `https://${chainName === 'multiversx' ? 'devnet-api.multiversx' : chainName}.com`,
  nativeToken: 'EGLD',
})

export const createMockAdapter = () => ({
  chain: 'multiversx',
  chainInfo: createMockChainInfo('multiversx'),
  prefix: 'mvx',
  explorer: {
    getTransactionUrl: () => '',
    getAddressUrl: () => '',
    getTokenUrl: () => '',
    getBlockUrl: () => '',
    getAccountUrl: () => '',
  },
  builder: () => ({
    createInscriptionTransaction() {
      return {}
    },
    createFromTransaction() {
      return Promise.resolve({ protocol: '', name: '', title: '', description: '', actions: [] })
    },
    createFromTransactionHash() {
      return Promise.resolve(null)
    },
    createFromRaw() {
      return Promise.resolve({ protocol: '', name: '', title: '', description: '', actions: [] })
    },
    setTitle() {
      return this
    },
    setDescription() {
      return this
    },
    setPreview() {
      return this
    },
    setActions() {
      return this
    },
    addAction() {
      return this
    },
    build() {
      return Promise.resolve({ protocol: '', name: '', title: '', description: '', actions: [] })
    },
  }),
  abiBuilder: () => ({
    createFromRaw: async () => ({}),
    createFromTransaction: async () => ({}),
    createFromTransactionHash: async () => null,
  }),
  brandBuilder: () => ({
    createInscriptionTransaction: () => ({}),
    createFromTransaction: async () => ({
      protocol: 'warp',
      name: 'test-brand',
      description: 'Test Brand',
      logo: 'test-logo.png',
    }),
    createFromTransactionHash: async () => null,
  }),
  executor: {
    createTransaction() {
      return Promise.resolve({})
    },
    preprocessInput(chain: any, input: string, type: string, value: string) {
      return Promise.resolve(input)
    },
    signMessage(message: string, privateKey: string) {
      return Promise.resolve('mock-signature')
    },
  },
  results: {
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
    },
  },
  serializer: {
    typedToString() {
      return ''
    },
    typedToNative() {
      return ['', ''] as [string, any]
    },
    nativeToTyped() {
      return ''
    },
    nativeToType() {
      return ''
    },
    stringToTyped() {
      return ''
    },
  },
  registry: {
    init: async () => {},
    getRegistryConfig: () => ({ unitPrice: 0n, admins: [] }),
    createWarpRegisterTransaction() {
      return Promise.resolve({})
    },
    createWarpUnregisterTransaction() {
      return Promise.resolve({})
    },
    createWarpUpgradeTransaction() {
      return Promise.resolve({})
    },
    createWarpAliasSetTransaction() {
      return Promise.resolve({})
    },
    createWarpVerifyTransaction() {
      return Promise.resolve({})
    },
    createWarpTransferOwnershipTransaction() {
      return Promise.resolve({})
    },
    createBrandRegisterTransaction() {
      return Promise.resolve({})
    },
    createWarpBrandingTransaction() {
      return Promise.resolve({})
    },
    getInfoByAlias() {
      return Promise.resolve({ registryInfo: null, brand: null })
    },
    getInfoByHash() {
      return Promise.resolve({ registryInfo: null, brand: null })
    },
    getUserWarpRegistryInfos() {
      return Promise.resolve([])
    },
    getUserBrands() {
      return Promise.resolve([])
    },
    getChainInfos() {
      return Promise.resolve([])
    },
    getChainInfo(chain: string) {
      if (chain === 'multiversx') {
        return Promise.resolve(createMockChainInfo('multiversx'))
      }
      return Promise.resolve(null)
    },
    setChain() {
      return Promise.resolve({})
    },
    removeChain() {
      return Promise.resolve({})
    },
    fetchBrand() {
      return Promise.resolve(null)
    },
  },
})

export const createMockConfig = (overrides: Partial<WarpClientConfig> = {}): WarpClientConfig => ({
  env: 'devnet',
  user: {
    wallets: { multiversx: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8' },
  },
  currentUrl: 'https://example.com',
  ...overrides,
})

export const createMockWarp = () => ({
  protocol: 'warp',
  name: 'test',
  title: 'Test Warp',
  description: 'Test Description',
  preview: 'test-preview',
  actions: [
    {
      type: 'transfer' as const,
      label: 'Test Action',
      chain: 'multiversx',
      address: 'erd1...',
      value: '0',
      inputs: [],
    } as WarpTransferAction,
  ],
})

export const createMockExecutionResults = () => ({
  success: true,
  warp: createMockWarp(),
  action: 0,
  user: null,
  txHash: null,
  next: null,
  values: [],
  results: {},
  messages: {},
})
