import { UniswapService } from './UniswapService'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('UniswapService', () => {
  let service: UniswapService

  const mockTokenList = {
    name: 'Uniswap Labs Default',
    timestamp: '2025-08-26T21:30:26.717Z',
    version: { major: 13, minor: 45, patch: 0 },
    tokens: [
      {
        chainId: 1,
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoURI: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
        extensions: {
          bridgeInfo: {
            '56': { tokenAddress: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' },
            '137': { tokenAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
          },
        },
      },
      {
        chainId: 1,
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
        name: 'Dai Stablecoin',
        symbol: 'DAI',
        decimals: 18,
        logoURI: 'https://assets.coingecko.com/coins/images/9956/small/4943.png',
      },
    ],
  }

  let mockCache: any

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    }

    service = new UniswapService(mockCache, 1) // Use chainId 1 for Ethereum
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('getTokenList', () => {
    it('should fetch token list from Uniswap API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenList),
      })

      const result = await service.getTokenList()

      expect(result).toEqual(mockTokenList)
      expect(mockFetch).toHaveBeenCalledWith('https://tokens.uniswap.org')
    })

    it('should throw error when fetch fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      await expect(service.getTokenList()).rejects.toThrow('Failed to fetch Uniswap token list: 500')
    })

    it('should fetch fresh data on each call', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenList),
      })

      // First call
      await service.getTokenList()
      // Second call should fetch again (no caching)
      await service.getTokenList()

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('findToken', () => {
    beforeEach(async () => {
      mockCache.get.mockReturnValue(null) // Cache miss initially
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenList),
      })
    })

    it('should find token by address', async () => {
      const result = await service.findToken('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')

      expect(result).toEqual(mockTokenList.tokens[0])
      expect(mockCache.set).toHaveBeenCalledWith(
        'uniswap:token:1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        mockTokenList.tokens[0],
        3600
      )
    })

    it('should be case insensitive for address matching', async () => {
      const result = await service.findToken('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')

      expect(result).toEqual(mockTokenList.tokens[0])
    })

    it('should return null when token not found', async () => {
      const result = await service.findToken('0x0000000000000000000000000000000000000000')

      expect(result).toBeNull()
      expect(mockCache.set).toHaveBeenCalledWith('uniswap:token:1:0x0000000000000000000000000000000000000000', null, 300)
    })

    it('should return null when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await service.findToken('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')

      expect(result).toBeNull()
    })

    it('should return cached token on subsequent calls', async () => {
      mockCache.get.mockReturnValueOnce(null) // First call cache miss
      mockCache.get.mockReturnValueOnce(mockTokenList.tokens[0]) // Second call cache hit

      // First call should fetch and cache
      await service.findToken('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const result = await service.findToken('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
      expect(result).toEqual(mockTokenList.tokens[0])
      expect(mockFetch).toHaveBeenCalledTimes(1) // Still only called once
    })
  })

  describe('getTokenMetadata', () => {
    beforeEach(async () => {
      mockCache.get.mockReturnValue(null) // Cache miss initially
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenList),
      })
    })

    afterEach(() => {
      mockCache.get.mockReset()
      mockFetch.mockReset()
    })

    it('should return token metadata when found', async () => {
      const result = await service.getTokenMetadata('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')

      expect(result).toEqual({
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
      })
      expect(mockCache.set).toHaveBeenCalledWith(
        'uniswap:metadata:1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        {
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
        },
        3600
      )
    })

    it('should return null when token not found', async () => {
      const result = await service.getTokenMetadata('0x0000000000000000000000000000000000000000')

      expect(result).toBeNull()
      expect(mockCache.set).toHaveBeenCalledWith('uniswap:metadata:1:0x0000000000000000000000000000000000000000', null, 300)
    })

    it('should return cached metadata on subsequent calls', async () => {
      const cachedMetadata = {
        name: 'USD Coin',
        symbol: 'USDC',
        decimals: 6,
        logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
      }

      // Clear any previous mock setup
      mockCache.get.mockClear()
      mockFetch.mockClear()

      // Setup fetch mock to return token list
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenList),
      })

      // Setup: first call cache miss, second call cache hit
      let callCount = 0
      mockCache.get.mockImplementation((key: string) => {
        if (key === 'uniswap:metadata:1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') {
          callCount++
          if (callCount === 1) return null // First call cache miss
          if (callCount === 2) return cachedMetadata // Second call cache hit
        }
        return undefined // Other keys or additional calls
      })

      // First call should fetch and cache
      await service.getTokenMetadata('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const result = await service.getTokenMetadata('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
      expect(result).toEqual(cachedMetadata)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Still only called once
    })
  })

  describe('getBridgeInfo', () => {
    beforeEach(async () => {
      mockCache.get.mockReturnValue(null) // Cache miss initially
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenList),
      })
    })

    afterEach(() => {
      mockCache.get.mockReset()
      mockFetch.mockReset()
    })

    it('should return bridge info when available', async () => {
      const result = await service.getBridgeInfo('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')

      expect(result).toEqual({
        '56': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        '137': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      })
      expect(mockCache.set).toHaveBeenCalledWith(
        'uniswap:bridge:1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        {
          '56': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
          '137': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        },
        3600
      )
    })

    it('should return null when no bridge info available', async () => {
      const result = await service.getBridgeInfo('0x6B175474E89094C44Da98b954EedeAC495271d0F')

      expect(result).toBeNull()
      expect(mockCache.set).toHaveBeenCalledWith('uniswap:bridge:1:0x6b175474e89094c44da98b954eedeac495271d0f', null, 300)
    })

    it('should return null when token not found', async () => {
      const result = await service.getBridgeInfo('0x0000000000000000000000000000000000000000')

      expect(result).toBeNull()
      expect(mockCache.set).toHaveBeenCalledWith('uniswap:bridge:1:0x0000000000000000000000000000000000000000', null, 300)
    })

    it('should return cached bridge info on subsequent calls', async () => {
      const cachedBridgeInfo = {
        '56': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        '137': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      }

      // Clear any previous mock setup
      mockCache.get.mockClear()
      mockFetch.mockClear()

      // Setup fetch mock to return token list
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockTokenList),
      })

      // Setup: first call cache miss, second call cache hit
      let bridgeCallCount = 0
      mockCache.get.mockImplementation((key: string) => {
        if (key === 'uniswap:bridge:1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48') {
          bridgeCallCount++
          if (bridgeCallCount === 1) return null // First call cache miss
          if (bridgeCallCount === 2) return cachedBridgeInfo // Second call cache hit
        }
        return undefined // Other keys or additional calls
      })

      // First call should fetch and cache
      await service.getBridgeInfo('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const result = await service.getBridgeInfo('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
      expect(result).toEqual(cachedBridgeInfo)
      expect(mockFetch).toHaveBeenCalledTimes(1) // Still only called once
    })
  })
})
