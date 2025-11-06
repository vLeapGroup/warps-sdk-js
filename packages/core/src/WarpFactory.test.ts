import { WarpConstants } from './constants'
import { getNextInfo } from './helpers'
import { createMockAdapter, createMockConfig, createMockWarp } from './test-utils/sharedMocks'
import { WarpAction, WarpChainInfo, WarpClientConfig, WarpContractAction } from './types'
import { WarpFactory } from './WarpFactory'

const testConfig: WarpClientConfig = {
  env: 'devnet',
  user: { wallets: { multiversx: 'erd1...' } },
  clientUrl: 'https://devnet.usewarp.to',
  currentUrl: 'https://devnet.usewarp.to',
}

describe('getNextInfo', () => {
  it('returns info for a basic warp', () => {
    const warp = {
      ...createMockWarp(),
      next: 'mywarp',
    }
    const adapter = createMockAdapter()
    const result = getNextInfo(testConfig, [adapter], warp, 0, {})
    expect(result?.[0].url).toBe('https://devnet.usewarp.to/multiversx%3Amywarp')
  })

  it('returns info for a warp with next', () => {
    const warp = {
      ...createMockWarp(),
      next: 'next-warp',
    }
    const adapter = createMockAdapter()
    const result = getNextInfo(testConfig, [adapter], warp, 0, {})
    expect(result?.[0].url).toBe('https://devnet.usewarp.to/multiversx%3Anext-warp')
  })

  it('returns info for a warp with hash', () => {
    const warp = {
      ...createMockWarp(),
      next: 'hash:123',
    }
    const adapter = createMockAdapter()
    const result = getNextInfo(testConfig, [adapter], warp, 0, {})
    expect(result?.[0].url).toBe('https://devnet.usewarp.to/multiversx%3Ahash%3A123')
  })

  it('returns info for a warp with query params', () => {
    const warp = {
      ...createMockWarp(),
      next: 'mywarp?param1=value1&param2=value2',
    }
    const adapter = createMockAdapter()
    const result = getNextInfo(testConfig, [adapter], warp, 0, {})
    expect(result?.[0].url).toBe('https://devnet.usewarp.to/multiversx%3Amywarp?param1=value1&param2=value2')
  })

  it('returns info for multiple results', () => {
    const warp = {
      ...createMockWarp(),
      next: 'mywarp?address={{address[]}}',
    }
    const adapter = createMockAdapter()
    const result = getNextInfo(testConfig, [adapter], warp, 0, { address: ['ABC', 'DEF'] })
    expect(result).toEqual([
      { identifier: 'mywarp?address=ABC', url: 'https://devnet.usewarp.to/multiversx%3Amywarp?address=ABC' },
      { identifier: 'mywarp?address=DEF', url: 'https://devnet.usewarp.to/multiversx%3Amywarp?address=DEF' },
    ])
  })

  it('returns info for a super client', () => {
    const config = { ...testConfig, clientUrl: 'https://usewarp.to', currentUrl: 'https://usewarp.to' }
    const warp = {
      ...createMockWarp(),
      next: 'mywarp?param1=value1&param2=value2',
    }
    const adapter = createMockAdapter()
    const result = getNextInfo(config, [adapter], warp, 0, {})
    expect(result?.[0].url).toBe('https://usewarp.to/multiversx%3Amywarp?param1=value1&param2=value2')
  })
})

describe('WarpFactory', () => {
  const config = createMockConfig({
    user: { wallets: { multiversx: 'erd1testwallet' } },
    currentUrl: 'https://example.com?foo=bar',
  })
  const chain: WarpChainInfo = {
    name: 'multiversx',
    displayName: 'MultiversX',
    chainId: 'D',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://api',
    nativeToken: {
      chain: 'multiversx',
      identifier: 'EGLD',
      name: 'MultiversX',
      symbol: 'EGLD',
      decimals: 18,
      logoUrl: 'https://example.com/egld-logo.png',
    },
  }

  beforeEach(() => {
    // No mocking needed for these tests
  })
  afterEach(() => {
    // No cleanup needed
  })

  it('createExecutable returns expected structure', async () => {
    const factory = new WarpFactory(config, [createMockAdapter()])
    const warp: any = {
      meta: { hash: 'abc' },
      actions: [
        {
          type: 'transfer',
          label: 'Test',
          address: 'erd1dest',
          value: '42',
          inputs: [
            { name: 'receiver', type: 'address', position: 'arg:1', source: 'field' },
            { name: 'amount', type: 'biguint', position: 'value', source: 'field' },
          ],
        },
      ],
    }
    const result = await factory.createExecutable(warp, 1, ['address:erd1dest', 'biguint:123'])
    expect(result.destination).toBe('erd1dest')
    expect(result.value).toBe(BigInt(123))
    expect(result.args.length).toBeGreaterThan(0)
  })

  it('interpolates input variables in contract action address', async () => {
    const factory = new WarpFactory(config, [createMockAdapter()])
    const warp: any = {
      meta: { hash: 'abc' },
      actions: [
        {
          type: 'contract',
          label: 'Test Contract',
          address: '{{CONTRACT_ADDRESS}}',
          func: 'transfer',
          args: [],
          gasLimit: 1000000,
          inputs: [
            { name: 'Contract Address', as: 'CONTRACT_ADDRESS', type: 'address', source: 'field' },
          ],
        } as WarpContractAction,
      ],
    }
    const result = await factory.createExecutable(warp, 1, ['address:erd1contract123'])
    expect(result.destination).toBe('erd1contract123')
  })

  it('interpolates input variables in transfer action address', async () => {
    const factory = new WarpFactory(config, [createMockAdapter()])
    const warp: any = {
      meta: { hash: 'abc' },
      actions: [
        {
          type: 'transfer',
          label: 'Test Transfer',
          address: '{{RECIPIENT}}',
          value: '0',
          inputs: [
            { name: 'Recipient', as: 'RECIPIENT', type: 'address', source: 'field' },
          ],
        },
      ],
    }
    const result = await factory.createExecutable(warp, 1, ['address:erd1recipient456'])
    expect(result.destination).toBe('erd1recipient456')
  })

  it('ignores input variables without as field', async () => {
    const factory = new WarpFactory(config, [createMockAdapter()])
    const warp: any = {
      meta: { hash: 'abc' },
      actions: [
        {
          type: 'transfer',
          label: 'Test Transfer',
          address: 'erd1fallback',
          value: '0',
          inputs: [
            { name: 'Recipient', type: 'address', source: 'field' },
          ],
        },
      ],
    }
    const result = await factory.createExecutable(warp, 1, ['address:erd1recipient456'])
    expect(result.destination).toBe('erd1fallback')
  })

  it('ignores input variables with lowercase as field', async () => {
    const factory = new WarpFactory(config, [createMockAdapter()])
    const warp: any = {
      meta: { hash: 'abc' },
      actions: [
        {
          type: 'transfer',
          label: 'Test Transfer',
          address: 'erd1fallback',
          value: '0',
          inputs: [
            { name: 'Recipient', as: 'recipient', type: 'address', source: 'field' },
          ],
        },
      ],
    }
    const result = await factory.createExecutable(warp, 1, ['address:erd1recipient456'])
    expect(result.destination).toBe('erd1fallback')
  })

  it('getResolvedInputs resolves query and user wallet', async () => {
    const factory = new WarpFactory(config, [createMockAdapter()])
    const action: WarpAction = {
      type: 'transfer',
      label: 'Test',
      address: 'erd1dest',
      value: '0',
      inputs: [
        { name: 'foo', type: 'string', source: 'query' } as any,
        { name: 'wallet', type: 'address', source: WarpConstants.Source.UserWallet } as any,
      ],
    }
    const result = await factory.getResolvedInputs('multiversx', action, ['string:ignored', 'address:ignored'])
    expect(result[0].value).toBe('string:bar')
    expect(result[1].value).toBe('address:erd1testwallet')
  })

  it('getModifiedInputs applies scale modifier', () => {
    const factory = new WarpFactory(config, [createMockAdapter()])
    const inputs = [{ input: { name: 'amount', type: 'biguint', modifier: 'scale:2' }, value: 'biguint:5' }]
    const result = factory.getModifiedInputs(inputs as any)
    expect(result[0].value).toBe('biguint:500')
  })

  it('preprocessInput returns input as-is for non-asset', async () => {
    const factory = new WarpFactory(config, [createMockAdapter()])
    const result = await factory.preprocessInput('multiversx', 'biguint:123')
    expect(result).toBe('biguint:123')
  })

  describe('preprocessInput for assets', () => {
    it('should return input as-is when existing decimals are provided', async () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const input = 'asset:TOKEN-123|100|18'
      const result = await factory.preprocessInput('multiversx', input)
      expect(result).toBe(input)
    })

    it('should fetch asset decimals and scale amount when no existing decimals', async () => {
      const mockAdapter = createMockAdapter()
      mockAdapter.dataLoader.getAsset = jest.fn().mockResolvedValue({
        chain: 'multiversx',
        identifier: 'TOKEN-123',
        name: 'Test Token',
        symbol: 'TEST',
        amount: 0n,
        decimals: 6, // USDC-like token with 6 decimals
        logoUrl: 'https://example.com/token.png',
      })
      const factory = new WarpFactory(config, [mockAdapter])

      const result = await factory.preprocessInput('multiversx', 'asset:TOKEN-123|100')
      expect(result).toBe('asset:TOKEN-123|100000000|6')
    })

    it('should handle zero amount correctly', async () => {
      const mockAdapter = createMockAdapter()
      mockAdapter.dataLoader.getAsset = jest.fn().mockResolvedValue({
        chain: 'multiversx',
        identifier: 'TOKEN-123',
        name: 'Test Token',
        symbol: 'TEST',
        amount: 0n,
        decimals: 18,
        logoUrl: 'https://example.com/token.png',
      })
      const factory = new WarpFactory(config, [mockAdapter])

      const result = await factory.preprocessInput('multiversx', 'asset:TOKEN-123|0')
      expect(result).toBe('asset:TOKEN-123|0|18')
    })

    it('should handle decimal amounts correctly', async () => {
      const mockAdapter = createMockAdapter()
      mockAdapter.dataLoader.getAsset = jest.fn().mockResolvedValue({
        chain: 'multiversx',
        identifier: 'TOKEN-123',
        name: 'Test Token',
        symbol: 'TEST',
        amount: 0n,
        decimals: 2,
        logoUrl: 'https://example.com/token.png',
      })
      const factory = new WarpFactory(config, [mockAdapter])

      const result = await factory.preprocessInput('multiversx', 'asset:TOKEN-123|1.50')
      expect(result).toBe('asset:TOKEN-123|150|2')
    })
  })

  describe('getStringTypedInputs', () => {
    it('types inputs based on action input definitions', () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const action: WarpAction = {
        type: 'transfer',
        label: 'Test',
        address: 'erd1dest',
        value: '0',
        inputs: [
          { name: 'receiver', type: 'address', position: 'arg:1', source: 'field' },
          { name: 'amount', type: 'biguint', position: 'value', source: 'field' },
          { name: 'message', type: 'string', position: 'arg:2', source: 'field' },
        ],
      }

      const inputs = ['erd1receiver', '1000000000000000000', 'Hello World']
      const result = factory.getStringTypedInputs(action, inputs)

      expect(result).toEqual(['address:erd1receiver', 'biguint:1000000000000000000', 'string:Hello World'])
    })

    it('returns inputs as-is when already typed', () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const action: WarpAction = {
        type: 'transfer',
        label: 'Test',
        address: 'erd1dest',
        value: '0',
        inputs: [{ name: 'receiver', type: 'address', position: 'arg:1', source: 'field' }],
      }

      const inputs = ['address:erd1receiver']
      const result = factory.getStringTypedInputs(action, inputs)

      expect(result).toEqual(['address:erd1receiver'])
    })

    it('handles inputs without corresponding action input definitions', () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const action: WarpAction = {
        type: 'transfer',
        label: 'Test',
        address: 'erd1dest',
        value: '0',
        inputs: [{ name: 'receiver', type: 'address', position: 'arg:1', source: 'field' }],
      }

      const inputs = ['erd1receiver', 'extra-input']
      const result = factory.getStringTypedInputs(action, inputs)

      expect(result).toEqual(['address:erd1receiver', 'extra-input'])
    })

    it('handles actions with no input definitions', () => {
      const factory = new WarpFactory(config, [createMockAdapter()])
      const action: WarpAction = {
        type: 'transfer',
        label: 'Test',
        address: 'erd1dest',
        value: '0',
      }

      const inputs = ['some-input', 'another-input']
      const result = factory.getStringTypedInputs(action, inputs)

      expect(result).toEqual(['some-input', 'another-input'])
    })
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
      blockTime: 6000,
      addressHrp: 'erd',
      defaultApiUrl: 'https://api.multiversx.com',
      explorerUrl: 'https://explorer.multiversx.com',
      nativeToken: {
        identifier: 'EGLD',
        name: 'MultiversX',
        decimals: 18,
        logoUrl: 'https://example.com/egld-logo.png',
      },
    })
    const adapter = createMockAdapter()
    adapter.chain = 'mainnet'
    adapter.chainInfo = {
      name: 'mainnet',
      displayName: 'Mainnet',
      chainId: '1',
      blockTime: 6000,
      addressHrp: 'erd',
      defaultApiUrl: 'https://api.multiversx.com',
      nativeToken: {
        identifier: 'EGLD',
        name: 'MultiversX',
        decimals: 18,
        logoUrl: 'https://example.com/egld-logo.png',
      },
    }
    adapter.registry.getChainInfo = mockGetChainInfo
    const factory = new WarpFactory(testConfig, [adapter])
    const warp = {
      ...createMockWarp(),
      actions: [
        {
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
        } as WarpContractAction,
      ],
    }
    const chainInfo = await factory.getChainInfoForWarp(warp, ['string:mainnet', 'biguint:1000000000000000000'])
    expect(chainInfo.name).toBe('mainnet')
  })

  it('uses default chain when no chain position is specified', async () => {
    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'contract',
          label: 'test',
          description: 'test',
          address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
          func: 'testFunc',
          args: [],
          gasLimit: 1000000,
          inputs: [{ name: 'amount', type: 'biguint', position: 'value', source: 'field' }],
        } as WarpContractAction,
      ],
    }

    const factory = new WarpFactory(testConfig, [createMockAdapter()])
    const chainInfo = await factory.getChainInfoForWarp(warp, ['biguint:1000000000000000000'])

    expect(chainInfo.displayName).toBe('MultiversX') // Default chain name from config
  })

  it('handles chain position at index 0 correctly (critical bug test)', async () => {
    const mockGetChainInfo = jest.fn().mockResolvedValue({
      displayName: 'Testnet',
      chainId: 'T',
      blockTime: 6,
      addressHrp: 'erd',
      defaultApiUrl: 'https://testnet-api.multiversx.com',
      nativeToken: {
        identifier: 'EGLD',
        name: 'MultiversX',
        decimals: 18,
        logoUrl: 'https://example.com/egld-logo.png',
      },
    })
    const adapter = createMockAdapter()
    adapter.chain = 'testnet'
    adapter.chainInfo = {
      name: 'testnet',
      displayName: 'Testnet',
      chainId: 'T',
      blockTime: 6,
      addressHrp: 'erd',
      defaultApiUrl: 'https://testnet-api.multiversx.com',
      nativeToken: {
        identifier: 'EGLD',
        name: 'MultiversX',
        decimals: 18,
        logoUrl: 'https://example.com/egld-logo.png',
      },
    }
    adapter.registry.getChainInfo = mockGetChainInfo
    const factory = new WarpFactory(testConfig, [adapter])
    const warp = {
      ...createMockWarp(),
      actions: [
        {
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
        } as WarpContractAction,
      ],
    }
    const chainInfo = await factory.getChainInfoForWarp(warp, ['string:testnet', 'biguint:500'])
    expect(chainInfo.displayName).toBe('Testnet')
  })

  it('throws error when chain input is not found at specified position', async () => {
    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'contract',
          label: 'test',
          description: 'test',
          address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
          func: 'testFunc',
          args: [],
          gasLimit: 1000000,
          inputs: [{ name: 'targetChain', type: 'string', position: 'chain', source: 'field' }],
        } as WarpContractAction,
      ],
    }

    const factory = new WarpFactory(testConfig, [createMockAdapter()])
    await expect(factory.getChainInfoForWarp(warp, [])).rejects.toThrow('Chain input not found')
  })

  it('uses default chain when no inputs are provided', async () => {
    const warp = {
      ...createMockWarp(),
      actions: [
        {
          type: 'contract',
          label: 'test',
          description: 'test',
          address: 'erd1kc7v0lhqu0sclywkgeg4um8ea5nvch9psf2lf8t96j3w622qss8sav2zl8',
          func: 'testFunc',
          args: [],
          gasLimit: 1000000,
          inputs: [{ name: 'targetChain', type: 'string', position: 'chain', source: 'field' }],
        } as WarpContractAction,
      ],
    }

    const factory = new WarpFactory(testConfig, [createMockAdapter()])
    const chainInfo = await factory.getChainInfoForWarp(warp)

    expect(chainInfo.displayName).toBe('MultiversX') // Default chain name from config
  })
})
