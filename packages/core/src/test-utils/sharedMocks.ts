import { WarpInitConfig, WarpTransferAction } from '../types'

export const createMockChainInfo = (chainName: string = 'multiversx') => ({
  name: chainName,
  displayName: chainName === 'multiversx' ? 'MultiversX' : chainName,
  chainId: chainName === 'multiversx' ? 'D' : chainName,
  blockTime: 6,
  addressHrp: 'erd',
  apiUrl: `https://${chainName === 'multiversx' ? 'devnet-api.multiversx' : chainName}.com`,
  explorerUrl: `https://${chainName === 'multiversx' ? 'devnet-explorer.multiversx' : chainName}.com`,
  nativeToken: 'EGLD',
})

export const createMockAdapter = () => ({
  chain: 'testchain',
  builder: {
    createInscriptionTransaction() {
      return {}
    },
    createFromTransaction() {
      return Promise.resolve({ protocol: '', name: '', title: '', description: '', actions: [] })
    },
    createFromTransactionHash() {
      return Promise.resolve(null)
    },
  },
  executor: {
    createTransaction() {
      return Promise.resolve({})
    },
    preprocessInput() {
      return Promise.resolve('')
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
    createWarpRegisterTransaction() {
      return {}
    },
    createWarpUnregisterTransaction() {
      return {}
    },
    createWarpUpgradeTransaction() {
      return {}
    },
    createWarpAliasSetTransaction() {
      return {}
    },
    createWarpVerifyTransaction() {
      return {}
    },
    createWarpTransferOwnershipTransaction() {
      return {}
    },
    createBrandRegisterTransaction() {
      return {}
    },
    createWarpBrandingTransaction() {
      return {}
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

export const createMockConfig = (overrides: Partial<WarpInitConfig> = {}): WarpInitConfig => ({
  env: 'devnet',
  user: {
    wallet: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
  },
  currentUrl: 'https://example.com',
  repository: createMockAdapter(),
  adapters: [],
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
