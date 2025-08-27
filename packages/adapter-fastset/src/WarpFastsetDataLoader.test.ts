import { WarpChainEnv, WarpChainInfo, WarpClientConfig } from '@vleap/warps'
import { WarpFastsetDataLoader } from './WarpFastsetDataLoader'

describe('WarpFastsetDataLoader', () => {
  const mockConfig: WarpClientConfig = {
    env: 'devnet' as WarpChainEnv,
    currentUrl: 'https://usewarp.to',
  }

  const mockChainInfo: WarpChainInfo = {
    name: 'fastset',
    displayName: 'FastSet',
    chainId: 'fastset',
    blockTime: 1000,
    addressHrp: 'set',
    defaultApiUrl: 'https://rpc.fastset.xyz',
    nativeToken: {
      chain: 'fastset',
      identifier: 'SET',
      name: 'SET',
      decimals: 6,
      logoUrl: 'https://example.com/set-logo.png',
    },
  }

  let dataLoader: WarpFastsetDataLoader

  beforeEach(() => {
    dataLoader = new WarpFastsetDataLoader(mockConfig, mockChainInfo)
  })

  describe('constructor', () => {
    it('should create a data loader instance', () => {
      expect(dataLoader).toBeInstanceOf(WarpFastsetDataLoader)
    })
  })

  describe('getAccount', () => {
    it('should have getAccount method', () => {
      expect(typeof dataLoader.getAccount).toBe('function')
    })

    it('should return WarpChainAccount type', async () => {
      const result = await dataLoader.getAccount('set17wm3vmdqk48cfw65w9xff5s2uzk8rvngp8mhgthjr8dyk77ltu7qv5a489')

      expect(result).toHaveProperty('chain')
      expect(result).toHaveProperty('address')
      expect(result).toHaveProperty('balance')
      expect(typeof result.balance).toBe('bigint')
      expect(result.chain).toBe('fastset')
    })
  })

  describe('getAccountAssets', () => {
    it('should have getAccountAssets method', () => {
      expect(typeof dataLoader.getAccountAssets).toBe('function')
    })

    it('should return WarpChainAsset[] type', async () => {
      const result = await dataLoader.getAccountAssets('set17wm3vmdqk48cfw65w9xff5s2uzk8rvngp8mhgthjr8dyk77ltu7qv5a489')

      expect(Array.isArray(result)).toBe(true)
      if (result.length > 0) {
        const asset = result[0]
        expect(asset).toHaveProperty('chain')
        expect(asset).toHaveProperty('identifier')
        expect(asset).toHaveProperty('name')
        expect(asset).toHaveProperty('amount')
        expect(asset).toHaveProperty('decimals')
        expect(typeof asset.amount).toBe('bigint')
        expect(asset.chain).toBe('fastset')
      }
    })
  })

  describe('getAccountActions', () => {
    it('should have getAccountActions method', () => {
      expect(typeof dataLoader.getAccountActions).toBe('function')
    })

    it('should return WarpChainAction[] type', async () => {
      const result = await dataLoader.getAccountActions('set17wm3vmdqk48cfw65w9xff5s2uzk8rvngp8mhgthjr8dyk77ltu7qv5a489')

      expect(Array.isArray(result)).toBe(true)
      if (result.length > 0) {
        const action = result[0]
        expect(action).toHaveProperty('chain')
        expect(action).toHaveProperty('id')
        expect(action).toHaveProperty('sender')
        expect(action.chain).toBe('fastset')
      }
    })
  })

  describe('getAccountInfo', () => {
    it('should have getAccountInfo method', () => {
      expect(typeof dataLoader.getAccountInfo).toBe('function')
    })

    it('should return FastsetAccountData or null', async () => {
      const result = await dataLoader.getAccountInfo('set17wm3vmdqk48cfw65w9xff5s2uzk8rvngp8mhgthjr8dyk77ltu7qv5a489')

      if (result) {
        expect(result).toHaveProperty('address')
        expect(result).toHaveProperty('balance')
        expect(result).toHaveProperty('balanceDecimal')
        expect(result).toHaveProperty('nextNonce')
        expect(result).toHaveProperty('sequenceNumber')
        expect(typeof result.balanceDecimal).toBe('number')
        expect(typeof result.nextNonce).toBe('number')
      }
    })
  })

  describe('getTransactionInfo', () => {
    it('should have getTransactionInfo method', () => {
      expect(typeof dataLoader.getTransactionInfo).toBe('function')
    })

    it('should return FastsetTransactionData or null', async () => {
      const result = await dataLoader.getTransactionInfo('0x1234567890abcdef')

      if (result) {
        expect(result).toHaveProperty('hash')
        expect(result).toHaveProperty('hashHex')
        expect(result).toHaveProperty('status')
        expect(result).toHaveProperty('details')
      }
    })
  })

  describe('checkTransferStatus', () => {
    it('should have checkTransferStatus method', () => {
      expect(typeof dataLoader.checkTransferStatus).toBe('function')
    })

    it('should return boolean', async () => {
      const result = await dataLoader.checkTransferStatus(
        'set17wm3vmdqk48cfw65w9xff5s2uzk8rvngp8mhgthjr8dyk77ltu7qv5a489',
        'set177rt9kr5z64tv4hecea8lqql5qwtfqfd6nxzrtcdqk33d0ccrq9snqekm6',
        '1000000'
      )

      expect(typeof result).toBe('boolean')
    })
  })

  describe('getAccountBalance', () => {
    it('should have getAccountBalance method', () => {
      expect(typeof dataLoader.getAccountBalance).toBe('function')
    })

    it('should return balance info or null', async () => {
      const result = await dataLoader.getAccountBalance('set17wm3vmdqk48cfw65w9xff5s2uzk8rvngp8mhgthjr8dyk77ltu7qv5a489')

      if (result) {
        expect(result).toHaveProperty('balance')
        expect(result).toHaveProperty('balanceDecimal')
        expect(typeof result.balanceDecimal).toBe('number')
      }
    })
  })
})
