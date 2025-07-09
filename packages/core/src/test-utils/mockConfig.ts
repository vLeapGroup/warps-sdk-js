import { WarpInitConfig } from '../types'

export const createMockAdapter = () => ({
  chain: 'testchain',
  builder: class {
    createInscriptionTransaction() {
      return {}
    }
    createFromTransaction() {
      return Promise.resolve({ protocol: '', name: '', title: '', description: '', actions: [] })
    }
    createFromTransactionHash() {
      return Promise.resolve(null)
    }
  },
  executor: class {
    createTransaction() {
      return Promise.resolve({})
    }
    preprocessInput() {
      return Promise.resolve('')
    }
  },
  results: class {
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
    }
  },
  serializer: class {
    typedToString() {
      return ''
    }
    typedToNative() {
      return ['', ''] as [string, any]
    }
    nativeToTyped() {
      return ''
    }
    nativeToType() {
      return ''
    }
    stringToTyped() {
      return ''
    }
    stringToNative(value: string) {
      return ['', '']
    }
  },
  registry: class {
    createWarpRegisterTransaction() {
      return {}
    }
    createWarpUnregisterTransaction() {
      return {}
    }
    createWarpUpgradeTransaction() {
      return {}
    }
    createWarpAliasSetTransaction() {
      return {}
    }
    createWarpVerifyTransaction() {
      return {}
    }
    createWarpTransferOwnershipTransaction() {
      return {}
    }
    createBrandRegisterTransaction() {
      return {}
    }
    createWarpBrandingTransaction() {
      return {}
    }
    getInfoByAlias() {
      return Promise.resolve({ registryInfo: null, brand: null })
    }
    getInfoByHash() {
      return Promise.resolve({ registryInfo: null, brand: null })
    }
    getUserWarpRegistryInfos() {
      return Promise.resolve([])
    }
    getUserBrands() {
      return Promise.resolve([])
    }
    getChainInfos() {
      return Promise.resolve([])
    }
    getChainInfo() {
      return Promise.resolve(null)
    }
    setChain() {
      return Promise.resolve({})
    }
    removeChain() {
      return Promise.resolve({})
    }
    fetchBrand() {
      return Promise.resolve(null)
    }
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
