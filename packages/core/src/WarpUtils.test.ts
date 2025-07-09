import { getNextInfo } from './helpers'
import { createMockWarp } from './test-utils/sharedMocks'
import { WarpClientConfig, WarpContractAction } from './types'
import { WarpUtils } from './WarpUtils'

const testConfig: WarpClientConfig = {
  env: 'devnet',
  user: { wallet: 'erd1...' },
  clientUrl: 'https://devnet.usewarp.to',
  currentUrl: 'https://devnet.usewarp.to',
  repository: {
    chain: 'mockchain',
    builder: {
      createInscriptionTransaction: jest.fn(),
      createFromTransaction: jest.fn(),
      createFromTransactionHash: jest.fn().mockResolvedValue(null),
    },
    executor: {
      async createTransaction() {
        return {}
      },
      async preprocessInput() {
        return ''
      },
    },
    results: {
      async getTransactionExecutionResults() {
        return {
          success: true,
          warp: { protocol: '', name: '', title: '', description: '', actions: [] },
          action: 0,
          user: null,
          txHash: null,
          next: null,
          values: [],
          results: {},
          messages: {},
        }
      },
    },
    serializer: {
      typedToString: jest.fn(),
      typedToNative: jest.fn(),
      nativeToTyped: jest.fn(),
      nativeToType: jest.fn(),
      stringToTyped: jest.fn(),
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
      getChainInfo: jest.fn().mockResolvedValue(null),
      setChain: jest.fn().mockResolvedValue({}),
      removeChain: jest.fn().mockResolvedValue({}),
      fetchBrand: jest.fn().mockResolvedValue(null),
    },
  },
  adapters: [],
}

describe('getNextInfo', () => {
  it('returns info for a basic warp', () => {
    const warp = {
      ...createMockWarp(),
      next: 'mywarp',
    }
    const result = getNextInfo(testConfig, warp, 0, {})
    expect(result?.[0].url).toBe('https://devnet.usewarp.to/mywarp')
  })

  it('returns info for a warp with next', () => {
    const warp = {
      ...createMockWarp(),
      next: 'next-warp',
    }
    const result = getNextInfo(testConfig, warp, 0, {})
    expect(result?.[0].url).toBe('https://devnet.usewarp.to/next-warp')
  })

  it('returns info for a warp with hash', () => {
    const warp = {
      ...createMockWarp(),
      next: 'hash:123',
    }
    const result = getNextInfo(testConfig, warp, 0, {})
    expect(result?.[0].url).toBe('https://devnet.usewarp.to/hash%3A123')
  })

  it('returns info for a warp with query params', () => {
    const warp = {
      ...createMockWarp(),
      next: 'mywarp?param1=value1&param2=value2',
    }
    const result = getNextInfo(testConfig, warp, 0, {})
    expect(result?.[0].url).toBe('https://devnet.usewarp.to/mywarp?param1=value1&param2=value2')
  })

  it('returns info for multiple results', () => {
    const warp = {
      ...createMockWarp(),
      next: 'mywarp?address={{address[]}}',
    }
    const result = getNextInfo(testConfig, warp, 0, { address: ['ABC', 'DEF'] })
    expect(result).toEqual([
      { identifier: 'mywarp?address=ABC', url: 'https://devnet.usewarp.to/mywarp?address=ABC' },
      { identifier: 'mywarp?address=DEF', url: 'https://devnet.usewarp.to/mywarp?address=DEF' },
    ])
  })

  it('returns info for a super client', () => {
    const config = { ...testConfig, clientUrl: 'https://usewarp.to', currentUrl: 'https://usewarp.to' }
    const warp = {
      ...createMockWarp(),
      next: 'mywarp?param1=value1&param2=value2',
    }
    const result = getNextInfo(config, warp, 0, {})
    expect(result?.[0].url).toBe('https://usewarp.to/mywarp?param1=value1&param2=value2')
  })
})

describe('getChainInfoForAction', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('uses chain from input when chain position is specified', async () => {
    const mockGetChainInfo = jest.fn().mockResolvedValue({
      name: 'mainnet',
      displayName: 'Mainnet',
      chainId: '1',
      blockTime: 6,
      addressHrp: 'erd',
      apiUrl: 'https://api.multiversx.com',
      explorerUrl: 'https://explorer.multiversx.com',
      nativeToken: 'EGLD',
    })

    testConfig.repository.registry.getChainInfo = mockGetChainInfo

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: 'testFunc',
      args: [],
      gasLimit: 1000000,
      inputs: [
        { name: 'targetChain', type: 'string', position: 'chain', source: 'field' },
        { name: 'amount', type: 'biguint', position: 'value', source: 'field' },
      ],
    }

    const chain = await WarpUtils.getChainInfoForAction(testConfig, action, ['string:mainnet', 'biguint:1000000000000000000'])

    expect(chain.name).toBe('mainnet')
    expect(mockGetChainInfo).toHaveBeenCalledWith('mainnet')
  })

  it('uses default chain when no chain position is specified', async () => {
    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: 'testFunc',
      args: [],
      gasLimit: 1000000,
      inputs: [{ name: 'amount', type: 'biguint', position: 'value', source: 'field' }],
    }

    const chain = await WarpUtils.getChainInfoForAction(testConfig, action, ['biguint:1000000000000000000'])

    expect(chain.name).toBe('multiversx') // Default chain name from config
  })

  it('handles chain position at index 0 correctly (critical bug test)', async () => {
    const mockGetChainInfo = jest.fn().mockResolvedValue({
      name: 'testnet',
      displayName: 'Testnet',
      chainId: 'T',
      blockTime: 6,
      addressHrp: 'erd',
      apiUrl: 'https://testnet-api.multiversx.com',
      explorerUrl: 'https://testnet-explorer.multiversx.com',
      nativeToken: 'EGLD',
    })

    testConfig.repository.registry.getChainInfo = mockGetChainInfo

    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: 'testFunc',
      args: [],
      gasLimit: 1000000,
      inputs: [
        { name: 'targetChain', type: 'string', position: 'chain', source: 'field' }, // At index 0
        { name: 'amount', type: 'biguint', position: 'value', source: 'field' },
      ],
    }

    const chain = await WarpUtils.getChainInfoForAction(testConfig, action, ['string:testnet', 'biguint:500'])

    expect(chain.name).toBe('testnet')
    expect(mockGetChainInfo).toHaveBeenCalledWith('testnet')
  })

  it('throws error when chain input is not found at specified position', async () => {
    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: 'testFunc',
      args: [],
      gasLimit: 1000000,
      inputs: [{ name: 'targetChain', type: 'string', position: 'chain', source: 'field' }],
    }

    await expect(WarpUtils.getChainInfoForAction(testConfig, action, [])).rejects.toThrow('Chain input not found')
  })

  it('uses default chain when no inputs are provided', async () => {
    const action: WarpContractAction = {
      type: 'contract',
      label: 'test',
      description: 'test',
      address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
      func: 'testFunc',
      args: [],
      gasLimit: 1000000,
      inputs: [{ name: 'targetChain', type: 'string', position: 'chain', source: 'field' }],
    }

    const chain = await WarpUtils.getChainInfoForAction(testConfig, action)

    expect(chain.name).toBe('multiversx') // Default chain name from config
  })
})
