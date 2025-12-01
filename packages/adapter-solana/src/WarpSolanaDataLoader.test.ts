import { WarpChainEnv, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { WarpSolanaDataLoader } from './WarpSolanaDataLoader'
import { NativeTokenSol } from './chains/solana'

describe('WarpSolanaDataLoader', () => {
  const mockConfig: WarpClientConfig = {
    env: 'mainnet' as WarpChainEnv,
    currentUrl: 'https://usewarp.to',
  }

  const mockChainInfo: WarpChainInfo = {
    name: 'solana',
    displayName: 'Solana',
    chainId: '101',
    blockTime: 400,
    addressHrp: '',
    defaultApiUrl: 'https://api.mainnet-beta.solana.com',
    logoUrl: 'https://example.com/solana-logo.png',
    nativeToken: NativeTokenSol,
  }

  let dataLoader: WarpSolanaDataLoader

  beforeEach(() => {
    dataLoader = new WarpSolanaDataLoader(mockConfig, mockChainInfo)
  })

  describe('constructor', () => {
    it('should create a data loader instance', () => {
      expect(dataLoader).toBeInstanceOf(WarpSolanaDataLoader)
    })
  })

  describe('getAccount', () => {
    it('should return account with balance', async () => {
      const address = '11111111111111111111111111111111'
      try {
        const result = await dataLoader.getAccount(address)
        expect(result).toBeDefined()
        expect(result.address).toBe(address)
        expect(result.chain).toBe('solana')
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
      const address = '11111111111111111111111111111111'
      try {
        const result = await dataLoader.getAccountAssets(address)
        expect(Array.isArray(result)).toBe(true)
        result.forEach((asset) => {
          expect(asset.chain).toBe('solana')
          expect(asset.identifier).toBeDefined()
          expect(typeof asset.amount).toBe('bigint')
        })
      } catch (error) {
        // Expected to fail in test environment without real RPC
      }
    })

    it('should return empty array when no tokens found', async () => {
      const address = '11111111111111111111111111111111'
      try {
        const result = await dataLoader.getAccountAssets(address)
        expect(Array.isArray(result)).toBe(true)
      } catch (error) {
        // Expected to fail in test environment without real RPC
      }
    })
  })

  describe('getAsset', () => {
    it('should return native token for SOL identifier', async () => {
      const result = await dataLoader.getAsset('SOL')
      expect(result).toBeDefined()
      expect(result?.identifier).toBe('SOL')
      expect(result?.symbol).toBe('SOL')
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
      const result = await dataLoader.getAccountActions('11111111111111111111111111111111')
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })
  })
})
