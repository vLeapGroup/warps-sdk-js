import { WarpClientConfig, WarpTransferAction } from '../types'

export const createMockChainInfo = (chainName: string = 'multiversx') => ({
  name: chainName,
  displayName: chainName === 'multiversx' ? 'MultiversX' : chainName,
  chainId: chainName === 'multiversx' ? 'D' : chainName,
  blockTime: 6000,
  addressHrp: 'erd',
  defaultApiUrl: `https://${chainName === 'multiversx' ? 'devnet-api.multiversx' : chainName}.com`,
  logoUrl: 'https://example.com/chain-logo.png',
  nativeToken: {
    chain: chainName,
    identifier: 'EGLD',
    name: 'MultiversX',
    symbol: 'EGLD',
    decimals: 18,
    logoUrl: 'https://example.com/egld-logo.png',
  },
})

export const createMockAdapter = () => ({
  chain: 'multiversx',
  chainInfo: createMockChainInfo('multiversx'),
  prefix: 'multiversx',
  explorer: {
    getTransactionUrl: () => '',
    getAddressUrl: () => '',
    getTokenUrl: () => '',
    getBlockUrl: () => '',
    getAccountUrl: () => '',
    getAssetUrl: () => '',
    getContractUrl: () => '',
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
    createFromUrl() {
      return Promise.resolve({ protocol: '', name: '', title: '', description: '', actions: [] })
    },
    setName() {
      return this
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
      return Promise.resolve([{}])
    },
    preprocessInput(chain: any, input: string, type: string, value: string) {
      return Promise.resolve(input)
    },
    signMessage(message: string, privateKey: string) {
      return Promise.resolve('mock-signature')
    },
    executeQuery(executable: any) {
      return Promise.resolve({
        success: true,
        warp: { protocol: '', name: '', title: '', description: '', actions: [] },
        action: 0,
        user: null,
        txHash: null,
        next: null,
        values: { string: [], native: [] },
        results: {},
        messages: {},
        tx: null,
      })
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
        values: { string: [], native: [] },
        results: {},
        messages: {},
        tx: null,
      })
    },
  },
  dataLoader: {
    getAccount(address: string) {
      return Promise.resolve({ chain: 'multiversx', address, balance: BigInt(0) })
    },
    getAccountAssets() {
      return Promise.resolve([])
    },
    getAsset(identifier: string) {
      // Return a mock asset with 18 decimals by default
      return Promise.resolve({
        chain: 'multiversx',
        identifier,
        name: `Mock ${identifier}`,
        symbol: 'MOCK',
        amount: 0n,
        decimals: 18,
        logoUrl: 'https://example.com/token.png',
      })
    },
    getAccountInfo() {
      return Promise.resolve({ address: 'erd1test', balance: 0n, nonce: 0 })
    },
    getAccountActions(address: string, options?: any) {
      return Promise.resolve([])
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
  wallet: {
    signTransaction(tx: any) {
      return Promise.resolve(tx)
    },
    signTransactions(txs: any[]) {
      return Promise.resolve(txs)
    },
    signMessage(message: string) {
      return Promise.resolve('mock-signature')
    },
    sendTransactions(txs: any[]) {
      return Promise.resolve(['mock-tx-hash'])
    },
    sendTransaction(tx: any) {
      return Promise.resolve('mock-tx-hash')
    },
    create(mnemonic: string) {
      return { address: 'erd1test', privateKey: 'mock-private-key' }
    },
    generate() {
      return { address: 'erd1test', privateKey: 'mock-private-key' }
    },
    getAddress() {
      return 'erd1test'
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
  values: { string: [], native: [] },
  results: {},
  messages: {},
})
