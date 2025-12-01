import { WarpSolanaExplorer } from './WarpSolanaExplorer'

describe('WarpSolanaExplorer', () => {
  let explorer: WarpSolanaExplorer
  let config: any
  let chain: any

  beforeEach(() => {
    chain = {
      name: 'solana',
      displayName: 'Solana',
    }
    config = {
      env: 'mainnet',
    }
    explorer = new WarpSolanaExplorer(chain, config)
  })

  describe('getAccountUrl', () => {
    it('should return account URL', () => {
      const address = '11111111111111111111111111111111'
      const url = explorer.getAccountUrl(address)
      expect(url).toContain(address)
      expect(url).toContain('account')
    })
  })

  describe('getTransactionUrl', () => {
    it('should return transaction URL', () => {
      const hash = '5KJvsngHeMoo424rH3Y1bVhjKM2f7jNsN1Tsp9i6F9XHj8qJ7vK'
      const url = explorer.getTransactionUrl(hash)
      expect(url).toContain(hash)
      expect(url).toContain('tx')
    })
  })

  describe('getBlockUrl', () => {
    it('should return block URL', () => {
      const blockNumber = 12345
      const url = explorer.getBlockUrl(blockNumber)
      expect(url).toContain(blockNumber.toString())
      expect(url).toContain('block')
    })
  })
})
