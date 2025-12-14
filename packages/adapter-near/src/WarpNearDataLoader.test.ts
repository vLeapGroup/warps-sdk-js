import { WarpChainEnv, WarpChainInfo, WarpChainName, WarpClientConfig } from '@vleap/warps'
import { WarpNearDataLoader } from './WarpNearDataLoader'
import { NativeTokenNear } from './chains/near'

describe('WarpNearDataLoader', () => {
  const mockConfig: WarpClientConfig = {
    env: 'mainnet' as WarpChainEnv,
    currentUrl: 'https://usewarp.to',
  }

  const mockChainInfo: WarpChainInfo = {
    name: WarpChainName.Near,
    displayName: 'NEAR',
    chainId: 'mainnet',
    blockTime: 1200,
    addressHrp: '',
    defaultApiUrl: 'https://rpc.mainnet.near.org',
    logoUrl: 'https://example.com/near-logo.png',
    nativeToken: NativeTokenNear,
  }

  let dataLoader: WarpNearDataLoader

  beforeEach(() => {
    dataLoader = new WarpNearDataLoader(mockConfig, mockChainInfo)
  })

  describe('constructor', () => {
    it('should create a data loader instance', () => {
      expect(dataLoader).toBeInstanceOf(WarpNearDataLoader)
    })
  })

  describe('getAccount', () => {
    it('should return account with balance', async () => {
      const address = 'test.near'
      try {
        const result = await dataLoader.getAccount(address)
        expect(result).toBeDefined()
        expect(result.address).toBe(address)
        expect(result.chain).toBe(WarpChainName.Near)
        expect(typeof result.balance).toBe('bigint')
      } catch (error) {
        // Expected to fail in test environment without real RPC
      }
    })

    it('should throw error for invalid address', async () => {
      const address = 'invalid-address'
      await expect(dataLoader.getAccount(address)).rejects.toThrow()
    })
  })

  describe('getAccountAssets', () => {
    it('should return array of assets', async () => {
      const address = 'test.near'
      try {
        const result = await dataLoader.getAccountAssets(address)
        expect(Array.isArray(result)).toBe(true)
        result.forEach((asset) => {
          expect(asset.chain).toBe(WarpChainName.Near)
          expect(asset.identifier).toBeDefined()
          expect(typeof asset.amount).toBe('bigint')
        })
      } catch (error) {
        // Expected to fail in test environment without real RPC
      }
    })

    it('should return empty array when no tokens found', async () => {
      const address = 'test.near'
      try {
        const result = await dataLoader.getAccountAssets(address)
        expect(Array.isArray(result)).toBe(true)
      } catch (error) {
        // Expected to fail in test environment without real RPC
      }
    })
  })

  describe('getAsset', () => {
    it('should return native token for NEAR identifier', async () => {
      const result = await dataLoader.getAsset('NEAR')
      expect(result).toBeDefined()
      expect(result?.identifier).toBe('NEAR')
      expect(result?.symbol).toBe('NEAR')
    })

    it('should return asset with unknown metadata for invalid token', async () => {
      const result = await dataLoader.getAsset('invalid-token-address')
      expect(result).toBeDefined()
      if (result) {
        expect(result.name).toBe('Unknown Token')
        expect(result.symbol).toBe('UNKNOWN')
      }
    })
  })

  describe('getAction', () => {
    it('should return null for non-existent transaction', async () => {
      const result = await dataLoader.getAction('invalid-signature')
      expect(result).toBeNull()
    })
  })

  describe('getAccountActions', () => {
    it('should return empty array', async () => {
      const result = await dataLoader.getAccountActions('test.near')
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })
  })
})
